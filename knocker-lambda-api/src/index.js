import { ApolloServer } from "apollo-server-lambda";
import resolvers from "./graphql/resolvers";
import typeDefs from "./graphql/types";

import { PinballMachineAPI } from "./graphql/data-sources/pinball";

/* const AWS = require("aws-sdk");
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const promisify = foo =>
  new Promise((resolve, reject) => {
    foo((error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });

// replace previous implementation of getGreeting
const getGreeting = firstName =>
  promisify(callback =>
    dynamoDb.get(
      {
        TableName: process.env.DYNAMODB_TABLE,
        Key: { firstName }
      },
      callback
    )
  )
    .then(result => {
      if (!result.Item) {
        return firstName;
      }
      return result.Item.nickname;
    })
    .then(name => `Hello, ${name}.`);

// add method for updates
const changeNickname = (firstName, nickname) =>
  promisify(callback =>
    dynamoDb.update(
      {
        TableName: process.env.DYNAMODB_TABLE,
        Key: { firstName },
        UpdateExpression: "SET nickname = :nickname",
        ExpressionAttributeValues: {
          ":nickname": nickname
        }
      },
      callback
    )
  ).then(() => nickname);
*/
// set up any dataSources our resolvers need
const dataSources = () => ({
  pinballMachineAPI: new PinballMachineAPI(),
});

// Set up Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  dataSources: () => ({
    pinballMachineAPI: new PinballMachineAPI(),
  }),
  introspection: true,
  playground: true,
  debug: true,
  /*   cacheControl: { defaultMaxAge: 240 },
  // engine: {
  //   apiKey: process.env.engineKey,
  //   // FIXME: Do not know why we need these below properties,
  //   // If not provided, application doesn't start!!
  //   privateHeaders: true,
  //   privateVariables: true,
  // }, */
  context: ({ event, context }) => ({
    headers: event.headers,
    functionName: context.functionName,
    event,
    context,
    language:
      event.headers &&
      event.headers["Accept-Language"] &&
      event.headers["Accept-Language"].length === 2
        ? event.headers["Accept-Language"]
        : "en",
  }),
});

const handler = server.createHandler({
  cors: {
    origin: "*",
    credentials: true,
  },
});
/* const handler = (event, context, callback) => {

  // tell AWS lambda we do not want to wait for NodeJS event loop
  // to be empty in order to send the response
  context.callbackWaitsForEmptyEventLoop = false;

  // process the request
  return handler(event, context, callback);
}; */

export default handler;
