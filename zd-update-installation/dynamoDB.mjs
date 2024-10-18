import { DynamoDBClient, GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
const client = new DynamoDBClient({});

export const saveWebhookId = async (id) => {
  const params = {
    Item: {
      id: { S: "single" },
      webhookId: { S: id },
    },
    ReturnConsumedCapacity: 'TOTAL',
    TableName: process.env.WEBHOOK_ID_TABLE
  };
  const command = new PutItemCommand(params);
  await client.send(command).catch((err) => {
    const message = 'Error storing webhook id to DynamoDB.';
    console.error(message, err);
  });
};

export const getWebhookId = async () => {
  const params = {
    Key: { id: { S: "single" } },
    ProjectionExpression: 'webhookId',
    TableName: process.env.WEBHOOK_ID_TABLE
  };
  const command = new GetItemCommand(params);
  const result = await client.send(command).catch((err) => {
    const message = `Error getting webhook id from DynamoDB.`;
    console.error(message, err);
    return null; // TODO: raise a cloudwatch alert
  });
  return result.Item ? result.Item.webhookId.S : null;
};
