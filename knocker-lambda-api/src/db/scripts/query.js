// Load the AWS SDK for Node.js
var AWS = require("aws-sdk");
var crypto = require("crypto");
const fs = require("fs");

// Set the region
AWS.config.update({ region: "REGION" });

// Create DynamoDB document client
params = {
  endpoint: "http://localhost:8000",
  region: "local",
  accessKeyId: "local",
  secretAccessKey: "local",
};
var docClient = new AWS.DynamoDB.DocumentClient(params);

/*
 *
 * Query: Retrieve User With PK
 *
 */
var params = {
  TableName: "knocker-dev",
  KeyConditionExpression: "PK = :PK ",
  ExpressionAttributeValues: {
    ":PK": "666",
  },
};

docClient.query(params, function (err, data) {
  if (err) console.log(err);
  // an error occurred
  else console.log(data); // successful response
});

/*
 *
 * Query: Retrieve Favorite Locations
 *
 */

var params = {
  TableName: "knocker-dev",
  KeyConditionExpression: "PK = :PK AND begins_with(SK,:SK)",
  ExpressionAttributeValues: {
    ":PK": "666",
    ":SK": "LOCATION",
  },
};

docClient.query(params, function (err, data) {
  if (err) console.log(err);
  // an error occurred
  else console.log(data); // successful response
});

/*
 *
 * Query: Retrieve Favorite Pinball Games
 *
 */

var params = {
  TableName: "knocker-dev",
  KeyConditionExpression: "PK = :PK AND begins_with(SK,:SK)",
  ExpressionAttributeValues: {
    ":PK": "666",
    ":SK": "FAVORITE#GAME",
  },
};

docClient.query(params, function (err, data) {
  if (err) console.log(err);
  // an error occurred
  else console.log(data); // successful response
});

/* var data = "SCORE#777";
console.log(crypto.createHash("md5").update(data).digest("hex"));
var data = "SCORE#13";
console.log(crypto.createHash("md5").update(data).digest("hex"));
var data = "PERMISSION#666";
console.log(crypto.createHash("md5").update(data).digest("hex"));
var data = "PERMISSION#820";
console.log(crypto.createHash("md5").update(data).digest("hex"));
 */
