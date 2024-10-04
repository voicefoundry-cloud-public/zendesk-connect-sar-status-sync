console.log("Loading function");

import response from "./cfn-response.mjs";
import { init, updateInstallation } from "./zdApi.mjs";
import { getApiKeyValue } from "./apiGateway.mjs";

export const handler = async (event, context) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    let apiKeyValue = "";
    let apiEndpoint = "";
    let installed = "";

    const request = event.RequestType;

    if (request === "Create" || request === "Update") {
        const keyId = process.env.STATUS_SYNC_API_KEY;
        apiKeyValue = await getApiKeyValue(keyId);
        apiEndpoint = process.env.STATUS_SYNC_API_URL;
        installed = "installed";
    }

    const axiosClient = init();
    if (axiosClient) {
        await updateInstallation(axiosClient, {
            key: "gwAPIKeyDev",
            value: apiKeyValue,
        });
        await updateInstallation(axiosClient, {
            key: "gwAPIUrlDev",
            value: apiEndpoint,
        });
        await updateInstallation(axiosClient, {
            key: "zendesk2ConnectStatus",
            value: installed,
        });
    }

    await response.send(event, context, response.SUCCESS, {}).catch((error) => {
        console.error("Error sending cfn response: ", error);
    });
};
