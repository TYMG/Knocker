"use strict";
const AWS = require("aws-sdk");
const Joi = require("joi");
const { v4 } = require("uuid");
const dynamoDb = new AWS.DynamoDB.DocumentClient();

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
  //const { error } = postSchema.validate(requestBody);
  /*  //console.log(error);
  if (error) return callback(error); */

  addUser(createUser(id, username, email, name), (err, res) => {
    if (err) return callback(err);
    //console.log("Succesful Player Creation:", username);
    callback(null, event);
  });
};

const addUser = (user, callback) => {
  const userData = {
    TableName: process.env.KNOCKER_TABLE,
    Item: user,
  };
  return dynamoDb.put(userData, callback);
};

const createUser = (id, username, email, name) => {
  const timestamp = new Date().getTime();
  return {
    id: v4(),
    createdAt: timestamp,
    id,
    username,
    email,
    name,
    locationsVisited: [],
    machinesPlayed: [],
    scores: [],
  };
};

const makeSuccessResponse = (data) => ({
  statusCode: 200,
  body: JSON.stringify({
    data,
  }),
});
