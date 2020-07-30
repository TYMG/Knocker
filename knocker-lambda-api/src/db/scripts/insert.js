// Load the AWS SDK for Node.js
var AWS = require("aws-sdk");
var crypto = require("crypto");
const fs = require("fs");
var moment = require("moment"); // require

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

/**
 *
 *
 * Condtionally Add A Friend (Towlie) If He Doesnt Exist
 *
 *
 * Successful Response:
 *
 * Attributes: {
 *      "Data": "Towlie"
 *      "Date": "2020_06_01"
 * }
 *
 * Conditional Failed Check
 *
 * "message": "The conditional request failed"
 * "code": ConditionalCheckFailedException"
 * "time": {{timestamp}}
 * "statusCode": 400
 * "retryable": false
 *
 */

var params = {
  TableName: "knocker-dev",
  Key: {
    // The primary key of the item (a map of attribute name to AttributeValue)

    PK: "666", //(string | number | boolean | null | Binary)
    SK: "FRIEND#420",
  },
  UpdateExpression: "set #d = :d, #x = :x", // String representation of the update to an attribute
  // SET set-action , ...
  // REMOVE remove-action , ...  (for document support)
  // ADD add-action , ...
  // DELETE delete-action , ...  (previous DELETE equivalent)
  ConditionExpression: "Not contains(SK,:sk)", // Checks if SK contains :sk value ? ConditionalCheckFailedException : Add Item
  ExpressionAttributeNames: {
    // a map of substitutions for attribute names with special character
    "#d": "Data",
    "#x": "Date",
  },
  ExpressionAttributeValues: {
    // a map of substitutions for all attribute values
    ":sk": "FRIEND#420",
    ":d": "TOWLIE",
    ":x": "2020_06_01",
  },
  ReturnValues: "UPDATED_NEW", // optional (NONE | ALL_OLD | UPDATED_OLD | ALL_NEW | UPDATED_NEW)
};
docClient.update(params, function (err, data) {
  if (err) console.log("Error", err);
  // an error occurred
  else console.log("Result:", data); // successful response
});

/***
 *
 *
 * Add a Recorded Score
 *
 */

const scorePKHash = console.log(
  crypto.createHash("md5").update("SCORE#777").digest("hex")
);
var params = {
  TableName: "knocker-dev",
  Key: {
    // The primary key of the item (a map of attribute name to AttributeValue)

    PK: scorePKHash, //(string | number | boolean | null | Binary)
    SK: "SCORE#666#123#1595769113",
    // more attributes...
  },
  UpdateExpression:
    "SET #Data = :Data, #Score = :Score, #Date = :Date, #LocationId = :LocationId, #LocationMachineXrefId =:LocationMachineXrefId",
  ConditionExpression: "Not contains(SK,:SK)", // optional String describing the constraint to be placed on an attribute
  ExpressionAttributeNames: {
    // a map of substitutions for attribute names with special characters
    "#Data": "Data",
    "#Score": "Score",
    "#Date": "Date",
    "#LocationId": "LocationId",
    "#LocationMachineXrefId": "LocationMachineXrefId",
  },
  ExpressionAttributeValues: {
    // a map of substitutions for all attribute values
    ":SK": "SCORE#666#123#1595769113",
    ":Data": "TYMG",
    ":Score": 777000000,
    ":Date": "2020_07_24",
    ":LocationId": "10158",
    ":LocationMachineXrefId": "616",
  },
  ReturnValues: "UPDATED_NEW",
};
docClient.update(params, function (err, data) {
  if (err) ppJson(err);
  // an error occurred
  else ppJson(data); // successful response
});

var params = {
  TableName: "knocker-dev",
};
dynamodb.scan(params, function (err, data) {
  if (err) ppJson(err);
  // an error occurred
  else ppJson(data); // successful response
});

var hashString = "PERMISSION#" + userId;
const permissionUserHash = crypto.createHash("md5").update(data).digest("hex");

var params = {
  TableName: "knocker-dev",
  Key: {
    // The primary key of the item (a map of attribute name to AttributeValue)

    PK: permissionUserHash, //(string | number | boolean | null | Binary)
    SK: permission,
    // more attributes...
  },
  UpdateExpression: "SET #Data = :Data, #Date = :Date",
  ConditionExpression: "Not contains(SK,:SK)", // optional String describing the constraint to be placed on an attribute
  ExpressionAttributeNames: {
    // a map of substitutions for attribute names with special characters
    "#Data": "Data",
    "#Date": "Date",
  },
  ExpressionAttributeValues: {
    // a map of substitutions for all attribute values
    ":SK": permission,
    ":Data": username,
    ":Date": moment().format("YYYY-MM-DD"),
  },
  ReturnValues: "UPDATED_NEW",
};

const res = await db.update(params).then(function (data, err) {
  if (err) {
    //console.log(err, err.stack);
  } else {
    //console.log("update createScore() Response: ", paramsData);
    console.log("data", data);
    return machinePlayed;
  }
});

const epoch = moment().format("X");
const SK = "MACHINE#616#" + epoch;
var params = {
  TableName: process.env.KNOCKER_TABLE,
  Key: {
    PK: userId, //(string | number | boolean | null | Binary)
    SK: SK,
  },
  UpdateExpression: "set #data = :data, #date = :date", // String representation of the update
  ConditionExpression: "Not contains(SK,:sk)", // Checks if SK contains :sk value ? ConditionalCheckFailedException : Add Item
  ExpressionAttributeNames: {
    // a map of substitutions for attribute names with special character
    "#data": "Data",
    "#date": "Date",
  },
  ExpressionAttributeValues: {
    // a map of substitutions for all attribute values
    ":sk": SK,
    ":data": username,
    ":date": moment().format("YYYY-MM-DD"),
  },
  ReturnValues: "UPDATED_NEW",
};
docClient.update(params, function (err, data) {
  if (err) console.log("Error", err);
  // an error occurred
  else console.log("Result:", data); // successful response
});
