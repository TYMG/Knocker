import { ApolloServer } from "apollo-server-lambda";
import resolvers from "../graphql/resolvers";
import typeDefs from "../graphql/types";

import { PinballMachineAPI } from "../graphql/data-sources/pinball";
import KnockerDB from "../graphql/data-sources/knocker-db";
// set up any dataSources our resolvers need
const dataSources = () => ({
  pinballMachineAPI: new PinballMachineAPI(),
  knockerDB: new KnockerDB(),
});

// Set up Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: (error) => {
    console.log(error);
    return error;
  },
  formatResponse: (response) => {
    console.log(response);
    return response;
  },
  // initial context state, will be available in resolvers
  context: ({ event, context }) => ({
    headers: event.headers,
    functionName: context.functionName,
    event,
    context,
  }),

  //dataSources,
  //introspection: true,
  //playground: true,
  // an object that goes to the "context" argument
  // when executing resolvers
  dataSources: () => {
    return {
      pinballMachineAPI: new PinballMachineAPI(),
      knockerDB: new KnockerDB(),
    };
  },
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
