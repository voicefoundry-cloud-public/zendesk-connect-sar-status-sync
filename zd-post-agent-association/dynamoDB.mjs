import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
const client = new DynamoDBClient({});

export const addAssociation = async (zendeskAgentId, connectAgent) => {
    const params = {
        Item: {
            zendeskAgentId: { S: zendeskAgentId },
            connectAgent: { S: connectAgent },
        },
        ReturnConsumedCapacity: 'TOTAL',
        TableName: process.env.AGENT_ASSOCIATIONS_TABLE
    };
    const command = new PutItemCommand(params);
    let success = true;
    await client.send(command).catch((err) => {
        const message = 'Error adding new association to DynamoDB.';
        console.error(message, err);
        success = false; // TODO: raise a cloudwatch alert
    });
    return success;
};
