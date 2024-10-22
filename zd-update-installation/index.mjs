console.log("Loading function");

import response from "./cfn-response.mjs";
import { getFromZD, init } from "./zdApi.mjs";
import { getApiKeyValue } from "./apiGateway.mjs";
import { getWebhookId, saveWebhookId } from "./dynamoDB.mjs";
import { createWebhook, updateWebhook, patchWebhook, removeWebhook } from "./webhook.mjs";
import { listInstances } from "./connect.mjs";

const cfnError = (error) => {
    console.error("Error sending cfn response: ", error);
};

export const handler = async (event, context) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    const request = event.RequestType;
    const isManual = !event.LogicalResourceId || event.LogicalResourceId !== "LambdaCustomResource";

    const error = await handleWithErrors(request, isManual);

    if (!isManual) {
        if (!error) {
            await response.send(event, context, response.SUCCESS, "Success.", {}).catch(cfnError);
        } else {
            await response.send(event, context, request !== "Delete" ? response.FAILED : response.SUCCESS, error, {}).catch(cfnError);
        }
    } else if (error) {
        console.error(error);
    }
};

const handleWithErrors = async (request) => {
    //TODO: add Connect instance id validation in the future using 
    // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/connect/command/ListInstancesCommand/
    // and cross-checking returned access url with connectInstanceUrl in Zendesk instance settings

    let apiKeyValue = "";
    let apiSubdomain = "";
    let apiEnv = "";
    let installed = "";
    let webhookId;
    let response;

    if (request !== "Delete") {
        const keyId = process.env.STATUS_SYNC_API_KEY;
        apiKeyValue = await getApiKeyValue(keyId);
        const url = process.env.STATUS_SYNC_API_URL;
        apiSubdomain = url.slice(8, url.indexOf(".amazonaws.com"));
        apiEnv = url.substring(8).split("/")[1];
        installed = "installed";
    }
    if (request !== "Create") {
        webhookId = await getWebhookId();
    }

    const axiosClient = init("api/v2/");
    if (!axiosClient) return "Error initializing Axios client.";

    response = await getFromZD(axiosClient, `apps/installations/${process.env.ZD_INSTALLATION_ID}`, "installation");
    if (!response) return "Error accessing Zendesk instance.";

    if (response.status === 401 || response.status === 403) {
        return "Invalid Zendesk credentials (admin email or access token).";
    }
    if (response.status === 404) {
        return "Invalid Zendesk URL or Connect app installation ID.";
    }
    if (response.status !== 200) {
        return "Unexpected deployment error.";
    }

    const { app_id, settings } = response.data;
    response = await getFromZD(axiosClient, `apps/${app_id}`, "app");
    if (!response) {
        return "Error accessing Zendesk instance.";
    }
    if (response.status === 404) {
        return "Invalid Connect app ID.";
    }
    if (response.status !== 200) {
        return "Unexpected deployment error.";
    }

    const versionParts = response.data.version.split(" ")[0].split(".");
    const versionNum = Number(versionParts[0]) * 100 + Number(versionParts[1]);
    if (versionNum < 301) {
        return "This add-on requires Connect app version 3.1 or higher.";
    }

    response = await listInstances();
    if (!response) return "Could not obtain Connect instance list.";
    const connectInstances = response.InstanceSummaryList || [];
    const foundInstance = connectInstances.find((instance) => instance.Id === process.env.CONNECT_INSTANCE_ID);
    if (!foundInstance) return "Invalid Connect instance ID."
    if (foundInstance.InstanceAccessUrl !== settings.connectInstanceUrl) {
        return "Specified Connect instance ID is not associated with the specified Zendesk URL."
    }
    
    let errorMessage = "App installation settings could not be updated.";
    response = await updateInstallation(axiosClient, {
        key: "z2cStatusApiKey",
        value: apiKeyValue,
    });
    if (!response || response.status !== 200) return errorMessage;

    if (request !== "Rotate") {
        response = await updateInstallation(axiosClient, {
            key: "z2cStatusSubdomain",
            value: apiSubdomain,
        });
        if (!response || response.status !== 200) return errorMessage;

        response = await updateInstallation(axiosClient, {
            key: "z2cStatusEnv",
            value: apiEnv,
        });
        if (!response || response.status !== 200) return errorMessage;
    }

    // create/update/remove webhook
    if (request === "Create" || request === "Update") {
        const webhookData = {
            authentication: {
                type: "api_key",
                data: {
                    "name": "X-Api-Key",
                    "value": apiKeyValue,
                },
                add_position: "header",
            },
            endpoint: `${process.env.STATUS_SYNC_API_URL}status`,
            http_method: "POST",
            name: "Zendesk-Connect agent status sync",
            request_format: "json",
            status: "active",
            subscriptions: [
                "zen:event-type:agent.state_changed"
            ]
        };
        if (request === "Create") {
            response = await createWebhook(axiosClient, webhookData);
            if (response && response.data) {
                webhookId = response.data.webhook.id;
                await saveWebhookId(webhookId);
            } else {
                return "Could not create the webhook.";
            }
        } else { // Update
            response = await updateWebhook(axiosClient, webhookId, webhookData);
            if (!response || response.status !== 204) return "Could not update the webhook";
        }
    } else if (request === "Delete") {
        if (webhookId) {
            await removeWebhook(axiosClient, webhookId);
        }
    } else if (request === "Rotate") {
        const webhookData = {
            authentication: {
                type: "api_key",
                data: {
                    "name": "X-Api-Key",
                    "value": apiKeyValue,
                },
                add_position: "header",
            },
        };
        response = await patchWebhook(axiosClient, webhookId, webhookData);
        if (!response || response.status !== 204) return "Could not update the webhook";
    }

    response = await updateInstallation(axiosClient, {
        key: "zendesk2ConnectStatus",
        value: installed,
    });
    if (!response || response.status !== 200) return errorMessage;
};

const updateInstallation = async (webClient, setting) => {
    return webClient.put(`apps/installations/${process.env.ZD_INSTALLATION_ID}`, {
        settings: { [setting.key]: setting.value },
    }).catch((err) => {
        const message = `
        error updating installation setting 
        ${setting}
    `;
        console.error(message, err);
        if (err.response) {
            return { status: err.response.status };
        }
        return null;
    });
};
