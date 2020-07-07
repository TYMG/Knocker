# Knocker

## Next Steps:

### Short Term

- [x] Add User Authentication Via AWS Cognito

  - Resources: https://itnext.io/my-experience-with-severless-graphql-2e95e5a8bda7

- [ ] Configure Knocker to use Hosted Web Address
      [x] Purchase knckr.com via Route 53
      [ ] Configure the API Gateway to use Route 53 via - Resources: [How to set up a custom domain name for API Gateway in your Serverless app](https://seed.run/blog/how-to-set-up-a-custom-domain-name-for-api-gateway-in-your-serverless-app.html)
      [ ] Update Amplify Configure to use Knocker API Address

  - Resources: https://www.serverless.com/blog/serverless-api-gateway-domain

- [ ] Sending Verification Emails
  - [ ] So... Cognito Sucks Ass So I will have to create my own Email Address - [ ] Have to create a Email Server [Integrating Amazon SES with Postfix
        ](https://docs.aws.amazon.com/ses/latest/DeveloperGuide/postfix.html#send-email-postfix)
        [A serverless email server on AWS using S3 and SES (github.com)](https://news.ycombinator.com/item?id=21953960)
  - [ ] Getting Email Address Verified
  - [ ] Sending Emails Through Cognito
    - https://stackoverflow.com/questions/60645671/serverless-framework-configure-cognito-user-pool-to-send-emails-through-ses
- [ ] Authorization with JWT

  - [ ] When a User Signs Up With Cognito, Create A Player in DynamoDB Table

    - [ ] Creating a Cognito Trigger
          How the trigger is suppose to work:
          When a user is created, the Cognito Trigger Post Confirmation should be triggered
          ![Client Confirm Sign Up Flow](https://docs.aws.amazon.com/cognito/latest/developerguide/images/lambda-post-confirmation-1.png)
          [Example](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-post-confirmation.html#user-pool-lambda-post-confirmation-flows)
          [SO: Great Example of What I'm Trying to Do](https://stackoverflow.com/questions/57403579/how-to-configure-serverless-cognito-lambda-tiggers)
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

- [ ] Update Serverless to use preexisting AWS Resources
  - [ ] Add IAM Roles For Serverless Lambda Function To Access DynamoDB Table
  - [ ] Update API Gateway to Use Knckr.com Domain
- [ ] Update Apollo Server API
  - [ ] Add Seed Data for Player Table For Local Envs
  - [ ] Update Deployment Scripts (Run Seed Data Before Deploying)
  - Resources: https://github.com/serverless/serverless-graphql/tree/master/app-backend/dynamodb

### Long Term

- [ ] Remove SES Sandbox ([Example:](https://youtu.be/IrSP7soIq3A?t=348))
- [ ] - Deploying to Production
  - How can I create a dev and prod envs?
  - [ ] - Deploy API
  - [ ] - Deploy React App
    - [ ] - Configure React App's Address to be Knocker.com
    - [ ] - Implement a CI/CD Pipeline for React App
  - Resources: https://serverless-stack.com/chapters/deploy-the-apis.html
- [ ] - Optional
  - [ ] - Add Secret Keys To Env File
    - Resources: https://www.serverless.com/blog/react-apps-with-serverless-components/
  - [ ] - Configure the AWS SDK Using Secret Keys
    - Resources:
      - https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Credentials.html
  - [ ] - Retrieve list of Apis
    - Resources:
      - https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/APIGateway.html#getApiKeys-property

### Future Ideas

- Containerize React App Using Docker
- Using Kubernetes Deploy The App

---

Implementation Steps:

- UI

- API
- Authentication
  1. Create Cognito Pool Via SLS
  2. Create a Verified Email Address
     1. Verify the Domain
     2. Create SMTP For Email
     3. Verify the Email Address (verification@mail.knckr.com)
     4. Ge

---

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

- To Install Local DynamoDB
  - sls dynamodb install
- To Run Local DynamoDB
  - sls dynamodb start --migrate
- To Run Severless Offline
  - sls offline start

## AWS Commands

- To create cognito users

```

aws cognito-idp sign-up \
--region us-east-1 \
--client-id 3n5im2nd1fprba38co1frqbar2 \
--username admin@example.com \
--password Pass@123

```

for `knocker-user-pool`

```

aws cognito-idp sign-up \
  --region us-east-1 \
  --client-id 7uqjtuqrjoc7uqppi2jkamvh8j \
  --username verde \
  --password Passw0rd! \
  --user-attributes Name="email",Value="verde.mateo.a@gmail.com" Name="name",Value="Jane"


```

- To confirm user:

```

  aws cognito-idp admin-confirm-sign-up \
  --region us-east-1 \
  --user-pool-id us-east-1_95kfEXpVN \
  --username verde

```

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

### Notes

Looks like Graphql has issues with merging Resolvers, so either the resolvers have to be in the same file, or figure out how they can be merged

## JS SDK

`Scan a table`

```
var params = {
    TableName: 'knocker-lambda-player-dev',
};
dynamodb.scan(params, function(err, data) {
    if (err) ppJson(err); // an error occurred
    else ppJson(data); // successful response
});
```

## Cognito

#### Updating the Config

USER_POOL_ID - Pool ID top of the General Settings page for the User Pool
APP_CLIENT_ID - Under App Integration, click App Client Settings, ID is under the App Client
IDENTITY_POOL_ID - Click Federated Identities, Click the Identity Pool Link, the end of the url is what the ID

> https://console.aws.amazon.com/cognito/pool/?region=us-east-1&id=us-east-1:ba1ea731-44c8-4251-95ce-1c0e7c3e1651

`us-east-1:ba1ea731-44c8-4251-95ce-1c0e7c3e1651`

## References:

### Videos:

- [Serverless Security(Foobar Serveless)](https://www.youtube.com/playlist?list=PLGyRwGktEFqeqlHxUk6jVlbavPhiu9kP8)

### Used Articles:

- [How to use Serverless with Webpack and Docker locally and in production](https://medium.com/@gannochenko/how-to-use-serverless-locally-with-webpack-and-docker-5e268f71715)
- [How to use GraphQL Apollo server with Serverless](https://medium.com/@gannochenko/how-to-use-graphql-apollo-server-with-serverless-606430ad94b3)

### Research Articles:

- [Basic Apollo Express GraphQL API with TypeScript](https://medium.com/@th.guibert/basic-https://medium.com/@th.guibert/basic-apollo-express-graphql-api-with-typescript-2ee021dea2capollo-express-graphql-api-with-typescript-2ee021dea2c)

```

```
