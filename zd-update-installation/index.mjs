console.log("Loading function");

import response from "./cfn-response.mjs";
import { init } from "./zdApi.mjs";
import { getApiKeyValue } from "./apiGateway.mjs";
import { getWebhookId, saveWebhookId } from "./dynamoDB.mjs";
import { createWebhook, updateWebhook, patchWebhook, removeWebhook } from "./webhook.mjs";

const cfnError = (error) => {
    console.error("Error sending cfn response: ", error);
};

//TODO: error handling
export const handler = async (event, context) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    const request = event.RequestType;
    const isManual = !event.LogicalResourceId || event.LogicalResourceId !== "LambdaCustomResource";

    let apiKeyValue = "";
    let apiSubdomain = "";
    let apiEnv = "";
    let installed = "";
    let webhookId;


    if (request !== "Delete") {
        const keyId = process.env.STATUS_SYNC_API_KEY;
        apiKeyValue = await getApiKeyValue(keyId);
        const url = process.env.STATUS_SYNC_API_URL;
        apiSubdomain = url.slice(8, url.indexOf(".amazonaws.com"));
        apiEnv = url.substring(8).split("/")[1];
        installed = "installed";
    }
    if (request === "Delete" || request === "Update") {
        webhookId = await getWebhookId();
    }

    const axiosClient = init("api/v2/");
    if (!axiosClient) {
        if (!isManual && request !== "Delete") {
            await response.send(event, context, response.FAILED, {}).catch(cfnError);
        }

    } else {
        await updateInstallation(axiosClient, {
            key: "z2cStatusApiKey",
            value: apiKeyValue,
        });
        if (request !== "Rotate") {
            await updateInstallation(axiosClient, {
                key: "z2cStatusSubdomain",
                value: apiSubdomain,
            });
            await updateInstallation(axiosClient, {
                key: "z2cStatusEnv",
                value: apiEnv,
            });
            await updateInstallation(axiosClient, {
                key: "zendesk2ConnectStatus",
                value: installed,
            });
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
                const response = await createWebhook(axiosClient, webhookData);
                if (response && response.data) {
                    webhookId = response.data.webhook.id;
                    await saveWebhookId(webhookId);
                }
            } else { // Update
                await updateWebhook(axiosClient, webhookId, webhookData);
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
            await patchWebhook(axiosClient, webhookId, webhookData);
        }

        if (!isManual) {
            await response.send(event, context, response.SUCCESS, {}).catch(cfnError);
        }
    }
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
        return null;
    });
};
