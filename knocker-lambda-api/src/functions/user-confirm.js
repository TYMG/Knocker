"use strict";
const AWS = require("aws-sdk");
const Joi = require("joi");
const { v4 } = require("uuid");
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const dbParams = {
  TableName: process.env.PLAYER_TABLE,
  ProjectionExpression: "id, email,  name, scores, usernames",
};

const postSchema = Joi.object({
  username: Joi.string().required(),
  email: Joi.string().required(),
  name: Joi.string().required(),
});

module.exports.main = (event, context, callback) => {
  const requestBody = JSON.parse(event.body);
  console.log(requestBody);
  const { error } = postSchema.validate(requestBody);
  console.log(error);
  if (error) return callback(error);

  const { username, email, name } = requestBody;

  addUser(createUser(username, email, name), (err, res) => {
    if (err) return callback(err);
    callback(
      null,
      makeSuccessResponse({
        message: `User ${username} has been added`,
        Id: res.id,
      })
    );
  });
};

const addUser = (user, callback) => {
  const userData = {
    TableName: process.env.PLAYER_TABLE,
    Item: user,
  };
  return dynamoDb.put(userData, callback);
};

const createUser = (username, email, name) => {
  const timestamp = new Date().getTime();
  return {
    id: v4(),
    createdAt: timestamp,
    username,
    email,
    name,
  };
};

const makeSuccessResponse = (data) => ({
  statusCode: 200,
  body: JSON.stringify({
    data,
  }),
});
