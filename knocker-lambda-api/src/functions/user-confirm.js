"use strict";
const AWS = require("aws-sdk");
const Joi = require("joi");
const { v4 } = require("uuid");
const dynamoDb = new AWS.DynamoDB.DocumentClient();
var moment = require("moment"); // require

const dbParams = {
  TableName: process.env.KNOCKER_TABLE,
  ProjectionExpression: "id, email,  name, scores, usernames",
};

const postSchema = Joi.object({
  id: Joi.number().required(),
  username: Joi.string().required(),
  email: Joi.string().required(),
  name: Joi.string().required(),
});

/**
Sample Post Confirmation Payload 

INFO	EVENT:  {
  version: '1',
  region: 'us-east-1',
  userPoolId: 'us-east-1_XF66Apxby',
  userName: 'de11dcbc-e3fc-45ad-a8be-6ed67eca6794',
  callerContext: {
    awsSdkVersion: 'aws-sdk-unknown-unknown',
    clientId: '23cfnmhglhfib3omu2t7u8gm8p'
  },
  triggerSource: 'PostConfirmation_ConfirmSignUp',
  request: {
    userAttributes: {
      sub: 'de11dcbc-e3fc-45ad-a8be-6ed67eca6794',
      'cognito:email_alias': 'verde.mateo.a@gmail.com',
      'cognito:user_status': 'CONFIRMED',
      email_verified: 'true',
      name: 'Matt Green',
      preferred_username: 'TYMG',
      email: 'verde.mateo.a@gmail.com'
    }
  },
  response: {}
}

 **/

module.exports.main = (event, context, callback) => {
  console.log("EVENT: ", event);
  //console.log("Username: ", event.userName);
  //const requestBody = JSON.parse(event.body);
  ////console.log(requestBody);
  //event.request.userAttributes.email
  const id = event.request.userAttributes.sub;
  const username = event.request.userAttributes.preferred_username;
  const email = event.request.userAttributes.email;
  const name = event.request.userAttributes.name;
  //const location = event.request.userAttributes.location;
  //const { error } = postSchema.validate(requestBody);
  /*  //console.log(error);
  if (error) return callback(error); */

  const result = addUser(id, username, email, name);
  console.log("Result: ", result);
  return callback(null, event);
};

const addUser = (id, username, email, name, callback) => {
  const tableName = process.env.KNOCKER_TABLE;
  var params = {};
  params.RequestItems = {};
  params.RequestItems[tableName] = [
    // a list of Put or Delete requests for that table
    {
      // An example PutRequest
      PutRequest: {
        Item: {
          // a map of attribute name to AttributeValue
          PK: "USER",
          SK: username,
          Data: id,
          Location: "",
          Email: email,
          Date: moment().format("YYYY-MM-DD"),
          Name: name,
          // attribute_value (string | number | boolean | null | Binary | DynamoDBSet | Array | Object)
          // ... more attributes ...
        },
      },
    },
    {
      // An example PutRequest
      PutRequest: {
        Item: {
          // a map of attribute name to AttributeValue
          PK: id,
          SK: "USER",
          Data: username,
          Location: "",
          Email: email,
          Date: moment().format("YYYY-MM-DD"),
          Name: name,
          // attribute_value (string | number | boolean | null | Binary | DynamoDBSet | Array | Object)
          // ... more attributes ...
        },
      },
    },
  ];

  return dynamoDb.batchWrite(params, function (err, data) {
    if (err) {
      console.log(err);
      return false;
      // an error occurred
    } else {
      return true;
    } // successful response
  });
};
