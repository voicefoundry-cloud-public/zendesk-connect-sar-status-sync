console.log('Loading function');

import { addAssociation }  from './dynamoDB.mjs';

export const handler = async (event) => {
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
