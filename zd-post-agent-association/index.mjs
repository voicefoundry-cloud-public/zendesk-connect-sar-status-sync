console.log('Loading function');

import { addAssociation } from './dynamoDB.mjs';
import { validateSourceIP } from './validateSourceIP.mjs';

export const handler = async (event) => {
  const isValidSourceIP = await validateSourceIP(event.requestContext.identity.sourceIp);
  if (!isValidSourceIP) {
    return {
      statusCode: 401,
      body: "Access denied",
    }
  }
  
  const association = JSON.parse(event.body);
  console.log("association: ", association);
  const { zendeskAgent, connectAgent } = association;
  let success = false;
  if (zendeskAgent && connectAgent) {
    success = await addAssociation(zendeskAgent.toString(), connectAgent);
  }
  const response = {
    statusCode: 200,
    body: JSON.stringify({ success }),
  };
  return response;
};
