import { DynamoDBClient, GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { init } from "./zdApi.mjs";

const client = new DynamoDBClient({});

export const validateSourceIP = async (sourceIP) => {
  const cachedList = await getList();
  if (!cachedList) return false; //DDB error
  if (cachedList.includes(sourceIP)) return true;

  const axiosClient = init("");
  if (axiosClient) {
    const response = await axiosClient.get(`ips`).catch((err) => {
      console.error("error retrieving IP ranges from Zendesk", err);
      return null;
    });
    if (!response?.data) return false;
    const { all, specific } = response.data.ips.egress;
    const exact = [...all, ...specific].filter((cidr) => cidr.endsWith("/32")).map((cidr) => cidr.split("/")[0]);
    const unique = [...new Set(exact)];
    if (!unique.includes(sourceIP)) {
      console.warn("Request from non-Zendesk-proxy IP address: ", sourceIP);
      return false;
    }
    await updateList(unique);
    return true;
  }
  return false;
};

const updateList = async (list) => {
  const listString = JSON.stringify(list);
  const params = {
    Item: {
      id: { S: "single" },
      ipList: { S: listString },
    },
    ReturnConsumedCapacity: 'TOTAL',
    TableName: process.env.PROXY_IPS_TABLE
  };
  const command = new PutItemCommand(params);
  await client.send(command).catch((err) => {
    const message = 'Error storing IP address list to DynamoDB.';
    console.error(message, err);
  });
};

const getList = async () => {
  const params = {
    Key: { id: { S: "single" } },
    ProjectionExpression: 'ipList',
    TableName: process.env.PROXY_IPS_TABLE
  };
  const command = new GetItemCommand(params);
  const result = await client.send(command).catch((err) => {
    const message = `Error getting IP address list from DynamoDB.`;
    console.error(message, err);
    return null; // TODO: raise a cloudwatch alert
  });
  return result.Item ? JSON.parse(result.Item.ipList.S) : [];
};
