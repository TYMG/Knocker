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

2020-07-03T20:02:03.294Z	87bb6d1c-6baf-4925-9712-76cfff1235ad	INFO	{
  version: '1',
  region: 'us-east-1',
  userPoolId: 'us-east-1_95kfEXpVN',
  userName: 'tymg',
  callerContext: { awsSdkVersion: 'aws-sdk-unknown-unknown', clientId: null },
  triggerSource: 'PostConfirmation_ConfirmSignUp',
  request: {
    userAttributes: {
      sub: '22ef8af6-8c9a-4505-8506-e5f20a97a887',
      'cognito:user_status': 'CONFIRMED',
      email_verified: 'false',
      name: 'Jane',
      email: 'verde.mateo.a@gmail.com'
    }
  },
  response: {}
}

 **/

module.exports.main = (event, context, callback) => {
  //console.log("EVENT: ", event);
  //console.log("Username: ", event.userName);
  //const requestBody = JSON.parse(event.body);
  ////console.log(requestBody);
  //event.request.userAttributes.email
  const id = event.request.userAttributes.sub;
  const username = event.userName;
  const email = event.request.userAttributes.email;
  const name = event.request.userAttributes.name;
  //const location = event.request.userAttributes.location;
  //const { error } = postSchema.validate(requestBody);
  /*  //console.log(error);
  if (error) return callback(error); */

  addUser((id, username, email, name), (err, res) => {
    if (err) return callback(err);
    //console.log("Succesful Player Creation:", username);
    callback(res, event);
  });
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

  return docClient.batchWrite(params, function (err, data) {
    if (err) console.log(err);
    // an error occurred
    else return console.log("PLAYER CREATED!!!!"), data, callback; // successful response
  });
};
