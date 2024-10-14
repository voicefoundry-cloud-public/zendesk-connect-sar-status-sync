console.log('Loading function');

import { addMapping, deleteMapping } from './dynamoDB.mjs';
import { validateSourceIP } from './validateSourceIP.mjs';

export const handler = async (event) => {
  const isValidSourceIP = await validateSourceIP(event.requestContext.identity.sourceIp);
  if (!isValidSourceIP) {
    return {
      statusCode: 401,
      body: "Access denied",
    }
  }

  const mappings = JSON.parse(event.body);
  console.log("mappings: ", mappings);
  let success = true;

  // process mappings in parallel
  const asyncRequests = mappings.map(async (mapping) => {
    const { zendeskStatusId, connectStatusId } = mapping;
    if (zendeskStatusId) {
      let result;
      if (connectStatusId) {
        result = await addMapping(zendeskStatusId.toString(), connectStatusId);
      } else {
        result = await deleteMapping(zendeskStatusId.toString());
      }
      success = result ? success : false;
    }

  });
  await Promise.all(asyncRequests);

  const response = {
    statusCode: 200,
    body: JSON.stringify({ success }),
  };
  return response;
};
