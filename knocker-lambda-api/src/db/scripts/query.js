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
  else console.log("Retrieve User With PK n/", data); // successful response
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
  else console.log("Retrieve a User's Location With PK n/", data); // successful response
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
  else console.log("Retrieve a User's Favorite Pinball Games n/", data); // successful response
});

/*
 *
 * Query: Retrieve Permissions For A Specifc User (TOTT)
 *
 */

var params = {
  TableName: "knocker-dev",
  KeyConditionExpression: "PK = :PK",
  ExpressionAttributeValues: {
    ":PK": "da4c2210a187f16715ecb956d57ae5aa",
  },
};

/**
 *
 * Retrieve Users with the Player R
 *
 */

docClient.query(params, function (err, data) {
  if (err) console.log(err);
  // an error occurred
  else console.log("Retrieve Permissions For A Specifc User", data); // successful response
});

var params = {
  TableName: "knocker-dev",
  IndexName: "DataGSI",
  KeyConditionExpression: "SK = :SK",
  ExpressionAttributeValues: {
    ":SK": "PLAYER",
  },
};

docClient.query(params, function (err, data) {
  if (err) console.log(err);
  // an error occurred
  else console.log("Retrieve Permissions For A Specifc User", data); // successful response
});

var params = {
  TableName: "knocker-dev",
  IndexName: "XrefIdGSI",
  KeyConditionExpression: "XrefId = :XrefId",
  ExpressionAttributeValues: {
    ":XrefId": "616",
  },
};

/*
 *
 * GSI: Retrieve all scores from Machine 616
 *
 */
docClient.query(params, function (err, data) {
  if (err) console.log(err);
  // an error occurred
  else console.log("XrefIdGSI where XrefId is 616", data); // successful response
});

var params = {
  TableName: "knocker-dev",
  IndexName: "DateGSI",
  KeyConditionExpression: "#date = :DATE",
  ExpressionAttributeNames: { "#date": "Date" },
  ExpressionAttributeValues: {
    ":DATE": "2020_05_02",
  },
};

/*
 *
 * GSI: Retrieve Events on 2020 05 02
 *
 */

docClient.query(params, function (err, data) {
  if (err) console.log(err);
  // an error occurred
  else console.log("DateGSI where date is 2020 05 02", data); // successful response
});

var params = {
  TableName: "knocker-dev",
  IndexName: "DateGSI",
};

docClient.scan(params, function (err, data) {
  if (err) console.log(err);
  // an error occurred
  else console.log("Table Scan", data); // successful response
});

var params = {
  TableName: "knocker-dev",
  KeyConditionExpression: "PK = :PK",
  ExpressionAttributeValues: {
    ":PK": "USER",
  },
};

docClient.query(params, function (err, data) {
  if (err) console.log(err);
  // an error occurred
  else console.log("Retrieve All Users", data); // successful response
});

var params = {
  TableName: "knocker-dev",
  KeyConditionExpression: "PK = :PK and begins_with(SK,:SK)",
  ExpressionAttributeValues: {
    ":PK": "666",
    ":SK": "FRIEND",
  },
};

docClient.query(params, function (err, data) {
  if (err) console.log(err);
  // an error occurred
  else console.log("Retrieve Friends From User 666", data); // successful response
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
var data = "PERMISSION#820";
console.log(crypto.createHash("md5").update(data).digest("hex"));
