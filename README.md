# Knocker

## Next Steps:

- [x] - Add User Authentication Via AWS Cognito
  - Resources: https://itnext.io/my-experience-with-severless-graphql-2e95e5a8bda7
- [ ] - Configure Knocker to user Hosted Web Address
  - [ ] - Purchase knocker.com via Route 53
  - [ ] - Configure the API Gateway to use Route 53 via Serverless
  - [ ] - Update Amplify Configure to use Knocker API Address
    - Resources: https://www.serverless.com/blog/serverless-api-gateway-domain/
- [ ] - Authorization with JWT
  - [ ] - When a User Signs Up With Cognito, Create A Player in DynamoDB Table
    - Resources:
      - https://www.reddit.com/r/aws/comments/ad8arj/q_what_is_the_best_way_to_store_user_data_aws/
      - https://github.com/vbudilov/cognito-to-dynamodb-lambda
        > I would definitely use DynamoDB for storing additional user meta-data. I created a Lambda function to automatically (using Cognito triggers) copy newly-created Cognito users to a DynamoDB's Users table. That gives you the essential setup to continue adding the meta-data. It comes useful if you want to use AppSync (or anything else for that matter) to retrieve and manipulate the data. It's much more effective to work with DDB for key-value lookups than Cognito since you control the scalability of DDB and you can add a lot of different data types into DDB (vs clear text in Cognito).
  - [ ] - Using Token Passed In Context, be able to retrieve a user
    - Implementation

      ```
        // using apollo-server 2.x
        const { ApolloServer } = require('apollo-server');

        const server = new ApolloServer({
        typeDefs,
        resolvers,
        context: ({ req }) => {
          // Note! This example uses the `req` object to access headers,
          // but the arguments received by `context` vary by integration.
          // This means they will vary for Express, Koa, Lambda, etc.!
          //
          // To find out the correct arguments for a specific integration,
          // see the `context` option in the API reference for `apollo-server`:
          // https://www.apollographql.com/docs/apollo-server/api/apollo-server/

          // Get the user token from the headers.
          const token = req.headers.authorization || '';

          // try to retrieve a user with the token
          const user = getUser(token);

          // add the user to the context
          return { user };
        },
        });

        server.listen().then(({ url }) => {
        console.log(`🚀 Server ready at ${url}`)
        });
      ```

    - Resources:
      - https://www.apollographql.com/docs/apollo-server/security/authentication/#authorization-outside-of-graphql
      - https://stackoverflow.com/questions/55487265/how-to-store-aws-cognito-user-pool-users-in-db-for-instance-dynamodb
    - Resources:
- [ ] - Deploying to Production
  - How can I create a dev and prod envs?
  - [ ] - Deploy API
  - [ ] - Deploy React App
    - [ ] - Configure React App's Address to be Knocker.com
    - [ ] - Implement a CI/CD Pipeline for React App
  - Resources: https://serverless-stack.com/chapters/deploy-the-apis.html
- [ ] - Update Apollo Server API
  - [ ] - Add Seed Data for Player Table For Local Envs
  - [ ] - Update Deployment Scripts (Run Seed Data Before Deploying)
  - [ ] - Update Serverless to use preexisting DynamoDB Table
    - [ ] - Add IAM Roles For Serverless Lambda Function To Access DynamoDB Table
  - Resources: https://github.com/serverless/serverless-graphql/tree/master/app-backend/dynamodb
- [ ] - Optional
  - [ ] - Add Secret Keys To Env File
    - Resources: https://www.serverless.com/blog/react-apps-with-serverless-components/
  - [ ] - Configure the AWS SDK Using Secret Keys
    - Resources:
      - https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Credentials.html
  - [ ] - Retrieve list of Apis
    - Resources:
      - https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/APIGateway.html#getApiKeys-property

## Docker Commands

- To Build Docker
  - docker-compose -f compose.yml build --force-rm
- To Start Docker
  - docker-compose -f compose.yml up
- To Take Down Docker
  - docker-compose -f compose.yml down
- To Restart Docker
  - docker-compose up -d --build {{service}}
- To Remove "Dangling Images"
  - docker rmi \$(docker images -a -q) => docker rmi \$(docker images --filter "dangling=true" -q --no-trunc)\n

## Serverless Commands

- To Deploy
  - npx sls deploy
- To Take Down
  - npx sls remove
- To Check the Logs for the Knocker API

  - npx sls logs -f knocker-graphql-api

## AWS Commands

- To create cognito users

```
aws cognito-idp sign-up \
--region us-east-1 \
--client-id 3n5im2nd1fprba38co1frqbar2 \
--username admin@example.com \
--password Pass@123
```

## Notes

Looks like Graphql has issues with merging Resolvers, so either the resolvers have to be in the same file, or figure out how they can be merged

## Graphql

Add Player

```
mutation {
  putPlayer(data:{
    username: "tymg",
    name: "Matt Green",
    email: "verde.mateo.a@gmail.com"
  }) {
    error
  }
}
```

## References:

### Videos:
- [Serverless Security(Foobar Serveless)](https://www.youtube.com/playlist?list=PLGyRwGktEFqeqlHxUk6jVlbavPhiu9kP8)

### Used Articles:

- [How to use Serverless with Webpack and Docker locally and in production](https://medium.com/@gannochenko/how-to-use-serverless-locally-with-webpack-and-docker-5e268f71715)
- [How to use GraphQL Apollo server with Serverless](https://medium.com/@gannochenko/how-to-use-graphql-apollo-server-with-serverless-606430ad94b3)

### Research Articles:

- [Basic Apollo Express GraphQL API with TypeScript](https://medium.com/@th.guibert/basic-https://medium.com/@th.guibert/basic-apollo-express-graphql-api-with-typescript-2ee021dea2capollo-express-graphql-api-with-typescript-2ee021dea2c)
