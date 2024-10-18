export const createWebhook = async (webClient, payload) => {
  return webClient.post(`webhooks`, {
      webhook: payload,
  }).catch((err) => {
      const message = `
      error creating Zendesk webhook as
      ${payload}
  `;
      console.error(message, err);
      return null;
  });
};

export const updateWebhook = async (webClient, webhookId, payload) => {
  return webClient.put(`webhooks/${webhookId}`, {
      webhook: payload,
  }).catch((err) => {
      const message = `
      error updating Zendesk webhook ${webhookId} with
      ${payload}
  `;
      console.error(message, err);
      return null;
  });
};

export const patchWebhook = async (webClient, webhookId, payload) => {
  return webClient.patch(`webhooks/${webhookId}`, {
      webhook: payload,
  }).catch((err) => {
      const message = `
      error patching Zendesk webhook ${webhookId} with
      ${payload}
  `;
      console.error(message, err);
      return null;
  });
};

export const removeWebhook = async (webClient, webhookId) => {
  return webClient.delete(`webhooks/${webhookId}`).catch((err) => {
      const message = `
      error deleting Zendesk webhook 
      ${webhookId}
  `;
      console.error(message, err);
      return null;
  });
};

