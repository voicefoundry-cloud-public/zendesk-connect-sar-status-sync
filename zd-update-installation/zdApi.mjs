import axios  from 'axios';

export const init = () => {
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
            baseURL: `${credentials.url}/api/v2/apps/installations`,
            timeout: 10000,
            headers: { 'Authorization': 'Basic ' + encoded }
        });
    }
    catch (err) {
        console.error('Error initiating web client: ', err.message);
        return null;
    }
};

export const updateInstallation = async (webClient, setting) => {
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
