import { APIGatewayClient, GetApiKeyCommand } from "@aws-sdk/client-api-gateway";
const client = new APIGatewayClient({});

export const getApiKeyValue = async (keyId) => {
  const params = { 
    apiKey: keyId, 
    includeValue: true,
  };
  const command = new GetApiKeyCommand(params);
  const response = await client.send(command).catch((err) => {
    const message = `Error retrieving API key for key ID ${keyId}.`;
    console.error(message, err);
    return null; 
  });

  return response?.value;
};