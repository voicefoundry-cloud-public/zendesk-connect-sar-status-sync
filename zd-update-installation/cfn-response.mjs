// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import https from "https";
import url from "url";

const SUCCESS = "SUCCESS";
const FAILED = "FAILED";

const send = function (event, context, responseStatus, responseData, physicalResourceId, noEcho) {

  return new Promise((resolve, reject) => {
    const responseBody = JSON.stringify({
      Status: responseStatus,
      Reason: "See the details in CloudWatch Log Stream: " + context.logStreamName,
      PhysicalResourceId: physicalResourceId || context.logStreamName,
      StackId: event.StackId,
      RequestId: event.RequestId,
      LogicalResourceId: event.LogicalResourceId,
      NoEcho: noEcho || false,
      Data: responseData
    });
    console.log("Response body:\n", responseBody);
    
    // const parsedUrl = new URL(event.ResponseURL); //TODO: doesn't produce proper hostname and path!
    const parsedUrl = url.parse(event.ResponseURL);
    console.log("cfn parsedUrl:\n", parsedUrl);
    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.path,
      method: "PUT",
      headers: {
        "content-type": "",
        "content-length": responseBody.length
      }
    };

    var request = https.request(options, function (response) {
      console.log("Status code: " + parseInt(response.statusCode));
      resolve(context.done());
    });

    request.on("error", function (error) {
      console.log("send(..) failed executing https.request(..): " + error);
      reject(context.done(error));
    });

    request.write(responseBody);
    request.end();
  })
}

export default {
  SUCCESS,
  FAILED,
  send,
}