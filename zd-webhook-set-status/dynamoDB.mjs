import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
const client = new DynamoDBClient({});

export const getStatus = async (zendeskStatusId) => {
    const params = {
        Key: { zendeskStatusId: { S: zendeskStatusId } },
        ProjectionExpression: 'connectStatusId',
        TableName: process.env.STATUS_MAPPING_TABLE
    };
    const command = new GetItemCommand(params);
    const result = await client.send(command).catch((err) => {
        const message = `Error getting zendesk status ${zendeskStatusId} from DynamoDB.`;
        console.error(message, err);
        return null; // TODO: raise a cloudwatch alert
    });
    if (!result?.Item) {
        console.log(`Zendesk status ${zendeskStatusId} is not mapped`);
        return null; 
    }
    return result.Item.connectStatusId.S;
};

export const getAssociation = async (agentId) => {
    const params = {
        Key: { zendeskAgentId: { S: agentId } },
        ProjectionExpression: 'connectAgent',
        TableName: process.env.AGENT_ASSOCIATIONS_TABLE
    };
    const command = new GetItemCommand(params);
    const result = await client.send(command).catch((err) => {
        const message = `Error getting zendesk agent ${agentId} from DynamoDB.`;
        console.error(message, err);
        return null; // TODO: raise a cloudwatch alert
    });
    if (!result.Item) {
        console.log(`Connect agent not found for Zendesk agent ${agentId}`);
        return null;
    }
    return result.Item.connectAgent.S;
};
