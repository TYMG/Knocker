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
  ConditionExpression: "Not contains(SK,:sk) ", // Checks if SK contains :sk value ? ConditionalCheckFailedException : Add Item
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
