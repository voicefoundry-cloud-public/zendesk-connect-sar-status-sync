import { DynamoDBClient, GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { init } from "./zdApi.mjs";
import { isIP } from "net";

const client = new DynamoDBClient({});

// Utility function to check if an IP address is within a CIDR range
const isIPInRange = (ip, cidr) => {
  if (!isIP(ip)) return false;
  
  const [rangeIP, prefixLength] = cidr.split('/');
  if (!isIP(rangeIP) || !prefixLength) return false;
  
  const prefix = parseInt(prefixLength, 10);
  if (prefix < 0 || prefix > 32) return false;
  
  // Convert IP addresses to 32-bit integers
  const ipToInt = (ipStr) => {
    return ipStr.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  };
  
  const targetIP = ipToInt(ip);
  const rangeIPInt = ipToInt(rangeIP);
  
  // Create subnet mask
  const mask = (0xFFFFFFFF << (32 - prefix)) >>> 0;
  
  // Check if IP is in range
  return (targetIP & mask) === (rangeIPInt & mask);
};

// Check if IP is in any of the provided CIDR ranges
const isIPInAnyRange = (ip, cidrRanges) => {
  return cidrRanges.some(cidr => isIPInRange(ip, cidr));
};

export const validateSourceIP = async (sourceIP) => {
  const cachedRanges = await getList();
  if (!cachedRanges) return false; //DDB error
  if (isIPInAnyRange(sourceIP, cachedRanges)) return true;

  const axiosClient = await init("");
  if (axiosClient) {
    const response = await axiosClient.get(`ips`).catch((err) => {
      console.error("error retrieving IP ranges from Zendesk", err);
      return null;
    });
    if (!response?.data) return false;
    const { all } = response.data.ips.egress;
    if (!all || !Array.isArray(all)) {
      console.error("Invalid response format from Zendesk IPs API");
      return false;
    }
    
    if (!isIPInAnyRange(sourceIP, all)) {
      console.warn("Request from non-Zendesk-proxy IP address: ", sourceIP);
      return false;
    }
    await updateList(all);
    return true;
  }
  return false;
};

const updateList = async (cidrRanges) => {
  const rangesString = JSON.stringify(cidrRanges);
  const params = {
    Item: {
      id: { S: "single" },
      ipRanges: { S: rangesString },
    },
    ReturnConsumedCapacity: 'TOTAL',
    TableName: process.env.PROXY_IPS_TABLE
  };
  const command = new PutItemCommand(params);
  await client.send(command).catch((err) => {
    const message = 'Error storing IP ranges list to DynamoDB.';
    console.error(message, err);
  });
};

const getList = async () => {
  const params = {
    Key: { id: { S: "single" } },
    ProjectionExpression: 'ipRanges, ipList',
    TableName: process.env.PROXY_IPS_TABLE
  };
  const command = new GetItemCommand(params);
  const result = await client.send(command).catch((err) => {
    const message = `Error getting IP ranges list from DynamoDB.`;
    console.error(message, err);
    return null; // TODO: raise a cloudwatch alert
  });
  
  if (!result.Item) return [];
  
  // Try to get new format (ipRanges) first, fallback to old format (ipList)
  if (result.Item.ipRanges) {
    return JSON.parse(result.Item.ipRanges.S);
  } else if (result.Item.ipList) {
    // Convert old format (individual IPs) to CIDR format for backward compatibility
    const oldList = JSON.parse(result.Item.ipList.S);
    return oldList.map(ip => `${ip}/32`);
  }
  
  return [];
};
