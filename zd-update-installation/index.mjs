console.log("Loading function");

import response from "./cfn-response.mjs";
import { init } from "./zdApi.mjs";
import { getApiKeyValue } from "./apiGateway.mjs";

export const handler = async (event, context) => {
    // console.log('Received event:', JSON.stringify(event, null, 2));

    let apiKeyValue = "";
    let apiSubdomain = "";
    let apiEnv = "";
    let installed = "";

    const request = event.RequestType;

    if (request === "Create" || request === "Update" || request === "Rotate") {
        const keyId = process.env.STATUS_SYNC_API_KEY;
        apiKeyValue = await getApiKeyValue(keyId);
        const url = process.env.STATUS_SYNC_API_URL;
        apiSubdomain = url.slice(8, url.indexOf(".amazonaws.com"));
        apiEnv = url.substring(8).split("/")[1];
        installed = "installed";
    }

    const axiosClient = init("api/v2/apps/installations");
    if (axiosClient) {
        await updateInstallation(axiosClient, {
            key: "z2cStatusApiKey",
            value: apiKeyValue,
        });
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

    if (request !== "Rotate") {
        await response.send(event, context, response.SUCCESS, {}).catch((error) => {
            console.error("Error sending cfn response: ", error);
        });
    }
};


const updateInstallation = async (webClient, setting) => {
    return webClient.put(`/${process.env.ZD_INSTALLATION_ID}`, {
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

