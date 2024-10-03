import { DynamoDBClient, PutItemCommand, DeleteItemCommand } from "@aws-sdk/client-dynamodb";
const client = new DynamoDBClient({});

export const addMapping = async (zendeskStatusId, connectStatusId) => {
    const params = {
        Item: {
            zendeskStatusId: { S: zendeskStatusId },
            connectStatusId: { S: connectStatusId },
        },
        ReturnConsumedCapacity: 'TOTAL',
        TableName: process.env.STATUS_MAPPING_TABLE
    };
    const command = new PutItemCommand(params);
    let success = true;
    await client.send(command).catch((err) => {
        const message = 'Error adding new mapping to DynamoDB.';
        console.error(message, params.Item, err);
        success = false; // TODO: raise a cloudwatch alert
    });
    return success;
};

export const deleteMapping = async (zendeskStatusId) => {
    const params = {
        Key: { zendeskStatusId: { S: zendeskStatusId } },
        TableName: process.env.STATUS_MAPPING_TABLE
    };
    const command = new DeleteItemCommand(params);
    let success = true;
    await client.send(command).catch((err) => {
        const message = `Error deleting mapping for Zendesk status ${zendeskStatusId} from DynamoDB.`;
        console.error(message, err);
        success = false; // TODO: raise a cloudwatch alert
    });
    return success;
};
