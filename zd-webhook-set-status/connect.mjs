import { ConnectClient, PutUserStatusCommand } from "@aws-sdk/client-connect";
const client = new ConnectClient({});

const sendCommandWithBackoff = async (command, retries = 5, delay = 2000) => {
  let attempt = 0;

  while (attempt < retries) {
    try {
      // Attempt to send the command
      const result = await client.send(command);
      return result;  // Exit if successful
    } catch (error) {
      // If it's not a 429 error, rethrow
      if (error.$metadata?.httpStatusCode !== 429) {
        throw error;
      }

      // Implement exponential backoff
      attempt++;
      const backoffDelay = delay * (Math.random() + 1) * Math.pow(2, attempt); // Exponential backoff with some randomness
      console.warn(`Rate limited. Retrying in ${backoffDelay / 1000} seconds... (Attempt ${attempt}/${retries})`);

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  throw new Error("Max retries reached");
};

export const setStatus = async (AgentStatusId, UserId) => {
  const params = {
    UserId,
    AgentStatusId,
    InstanceId: process.env.CONNECT_INSTANCE_ID,
  };
  const command = new PutUserStatusCommand(params);
  const result = await sendCommandWithBackoff(command).catch((err) => {
    const message = `Error setting agent status ${AgentStatusId} for agent ${UserId}.`;
    console.error(message, err);
    return null; // TODO: raise a cloudwatch alert
  });
  return result !== null;
};
