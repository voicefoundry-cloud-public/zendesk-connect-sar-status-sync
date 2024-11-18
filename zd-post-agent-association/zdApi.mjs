import axios from 'axios';
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const smClient = new SecretsManagerClient({});

export const init = async (path) => {
    const credentials = {
        url: process.env.ZD_URL,
        email: process.env.ZD_EMAIL,
        token_id: process.env.ZD_TOKEN_ID
    };

    if (!(credentials.url && credentials.email && credentials.token_id)) {
        console.error('missing credentials in env variables (ZD_URL, ZD_EMAIL, ZD_TOKEN_ID)');
        return null;
    }

    try {
        const command = new GetSecretValueCommand({ SecretId: credentials.token_id });
        const secret = await smClient.send(command);

        if ('SecretString' in secret) {
            const raw = `${credentials.email}/token:${secret.SecretString}`;
            const encoded = (Buffer.from(raw)).toString('base64');
            return axios.create({
                baseURL: `${credentials.url}/${path}`,
                timeout: 10000,
                headers: { 'Authorization': 'Basic ' + encoded, 'Accept': 'application/json' }
            });
        } else {
            throw new Error("Zendesk token secret does not have a string value");
        }
    }
    catch (err) {
        console.error('Error initiating web client: ', err.message);
        return null;
    }
};
