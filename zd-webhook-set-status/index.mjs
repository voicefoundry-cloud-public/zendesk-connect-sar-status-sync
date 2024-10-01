console.log('Loading function');

import { getStatus, getAssociation } from './dynamoDB.mjs';
import { setStatus } from './connect.mjs';

export const handler = async (apiEvent) => {
  const changes = JSON.parse(apiEvent.body);
  console.log("changes: ", changes);
  let success = true;

  const { event, detail } = changes;
  const zendeskAgentId = detail.agent_id;
  const zendeskStatusId = event.new_unified_state.id;
  const reason = event.new_unified_state.reason;
  
  if (zendeskStatusId && zendeskAgentId && reason !== "PUBLIC_API") {
    const connectUserId = await getAssociation(zendeskAgentId);
    if (connectUserId) {
      const connectStatusId = await getStatus(zendeskStatusId);
      if (connectStatusId) {
        success = await setStatus(connectStatusId, connectUserId);
      }
    }
  }

  const response = {
    statusCode: success ? 200 : 500,
    body: success ? "Ok" : "Server error",
  };
  return response;
};

