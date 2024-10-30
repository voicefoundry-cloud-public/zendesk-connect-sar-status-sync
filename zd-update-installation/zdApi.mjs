import axios  from 'axios';

export const init = (path) => {
    const credentials = {
        url: process.env.ZD_URL,
        email: process.env.ZD_EMAIL,
        token: process.env.ZD_TOKEN
    };

    if (!(credentials.url && credentials.email && credentials.token)) {
        console.error('missing credentials in env variables (ZD_URL, ZD_EMAIL, ZD_TOKEN)');
        return null;
    }

    try {
        const raw = `${credentials.email}/token:${credentials.token}`;
        const encoded = (Buffer.from(raw)).toString('base64');
        return axios.create({
            baseURL: `${credentials.url}/${path}`,
            timeout: 10000,
            headers: { 'Authorization': 'Basic ' + encoded, 'Accept': 'application/json' }
        });
    }
    catch (err) {
        console.error('Error initiating web client: ', err.message);
        return null;
    }
};

export const getFromZD = async (webClient, path, name) => {
    return webClient.get(path).catch((err) => {
        const message = `
        Error getting ${name} from Zendesk
    `;
        console.error(message, err);
        if (err.response) {
            return {status: err.response.status};
        }
        return null;
    });
};
