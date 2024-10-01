import { ConnectClient, PutUserStatusCommand } from "@aws-sdk/client-connect";
const client = new ConnectClient({});

export const setStatus = async (AgentStatusId, UserId) => {
  const params = {
    UserId,
    AgentStatusId,
    InstanceId: process.env.CONNECT_INSTANCE_ID,
  };
  const command = new PutUserStatusCommand(params);
  const result = await client.send(command).catch((err) => {
    const message = `Error setting agent status ${AgentStatusId} for agent ${UserId}.`;
    console.error(message, err);
    return null; // TODO: raise a cloudwatch alert
  });
  return result !== null;
};
