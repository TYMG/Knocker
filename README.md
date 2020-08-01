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
    //console.log(`🚀 Server ready at ${url}`)
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
  --client-id 3sde383av087443l1075s32iru \
  --username verde.mateo.a@gmail.com \
  --password Passw0rd! \
  --user-attributes  Name="name",Value="Matt Green" Name="preferred_username",Value="TYMG"

```

- To confirm user:

```

  aws cognito-idp admin-confirm-sign-up \
  --region us-east-1 \
  --user-pool-id us-east-1_95kfEXpVN \
  --username verde

```

## DynamoDB

### Use Cases

When thinking about how to set up our data structure, think how you would fill in the blanks for the following query:

> "Give me all of the \_**_ from a particular _**."

- Create a User
- Retrieve all Users
- Retrieve a User using the User's id
- Add A Played Machine for a User
- Add A Visited Location for a User
- Add A Score on a given machine for a user
- Retrieve a List of Locations Visited in the last 6 months
- Retrieve the Location most visted by user
- Retrieve the machine most played by a user
- Retriece the dates a specific location was visted
- Get all the machines a users have played in a date range
- Retrieve a List of User's scores using User's Id
- Retrieve a List of Scores for a particular XREF Machine
- Retrieve a List of Scores for a particular XREF Machine in descending order
- Retrieve a List of Scores for a particular XREF Machine for a Particular User
- Retrieve a List of Scores for a particular Location
- Retrieve a List of Scores for a particular date
- Get all users that visited certain location
- Get all users that played a certain machine

### Access Pattern

- Write
  - Create a User
  - Add A Played Machine for a User
  - Add A Score that connects to a User
  - Add A Visited Location for a User
  - Add a Sign Off for a Particular Score
  - Add Image Proof for a Particular Score
- Read
  - Retrieve all users
  - Retrieve a specific user
  - Retrtieve a list of locations visites for a user
  - Retrieve a list of machines played for a user
  - Retrieve scores for a user
  - Retreieve scores for a particular machine

### Table Design

DATE - Date
UID - User ID
LID - Location Id (From the Pinball API)
PIN - Pin's Actual ID (From the Pinball API)  
XREF_ID - Pin's XREF Id (From the Pinball API)
~~SID - Score ID~~

~~PID-Permission Id~~

{{DATE}} Using Time Since Epoch Timestamp

When creating a Partition Key, all items must have a PK and SK. So for the Knocker Table, the Partiton Key will be a String called PK and another string called SK

I'm going to create a Composite Key:

| PK              | SK                                                    | Data         | Date           | Other Attributes                                | Purpose                                                                |
| --------------- | ----------------------------------------------------- | ------------ | -------------- | ----------------------------------------------- | ---------------------------------------------------------------------- |
| {{UID}}         | USER                                                  | {{Username}} | {{yyyy-MM-dd}} | Location, Email, Name                           | User Information                                                       |
| {{UID}}         | FAVORITE#MACHINE#{{LocationMachineXrefId}}            | {{Username}} | {{yyyy-MM-dd}} |                                                 | A User's Favorite Pinball Machine (Machine Specific not Game Specific) |
| {{UID}}         | FAVORITE#PIN#{{PinId}}                                | {{Username}} | {{yyyy-MM-dd}} |                                                 | A User's Favorite Pin ( Game Specific)                                 |
| {{UID}}         | FRIEND#{{UID}}                                        | {{Username}} | {{yyyy-MM-dd}} |                                                 | A User's Friend                                                        |
| {{UID}}         | LOCATION#{{LocationId}}#{{EPOCH-TIMESTAMP}}           | {{Username}} | {{yyyy-MM-dd}} |                                                 | A User's Visited Location                                              |
| {{UID}}         | MACHINE#{{LocationMachineXrefId}}#{{EPOCH-TIMESTAMP}} | {{Username}} | {{yyyy-MM-dd}} |                                                 | A User's Played Machines                                               |
| USER            | {{UID}}                                               | {{Username}} | {{yyyy-MM-dd}} | Location, Email, Name                           | User Information                                                       |
| SCORE#{{PinId}} | SCORE#{{UID}}#{{PinId}}#{{EPOCH-TIMESTAMP}}           | {{Username}} | {{yyyy-MM-dd}} | Score, LocationId, LocationMachineXrefId, PinId | Recorded Score                                                         |
| ROLE#{{UID}}    | {{ROLE}}                                              | {{Username}} | {{yyyy-MM-dd}} |                                                 |                                                                        |
|                 |                                                       |              |                |                                                 |                                                                        |
|                 |                                                       |              |                |                                                 |                                                                        |
|                 |                                                       |              |                |                                                 |                                                                        |
|                 |                                                       |              |                |                                                 |                                                                        |

| PK                          | SK (GSK 1 PK) (GSK 2 SK)    | Data (GSK 1 SK) | Date(GSK 2 PK) | Attributes                         | Purpose              |
| --------------------------- | --------------------------- | --------------- | -------------- | ---------------------------------- | -------------------- |
| {{UID}}                     | Username#{{Username}}       | Name            | DateCreated    | Email, Location, Permission[Roles] | Create User          |
| {{UID}}                     | PLAYED#{{XREF_ID}}#{{DATE}} | Username        | DateAdded      | Username, DateAdded                | Add Machine Played]  |
| {{UID}}                     | FAVORITE#PIN#{{XREF}}       | Username        | DateAdded      | DateAdded                          |                      |
| {{UID}}                     | FAVORITE#GAME#{{PIN}}       | Username        | DateAdded      | DateAdded                          |                      |
| {{UID}}                     | LOCATION#{{LID}}#{{DATE}}   | LID             | DateVisited    | Username                           |                      |
| SCORE#{{PIN}}               | SCORE#{{UID}}#{{DATE}}      | Username        | DateRecorded   | Score,LID                          |                      |
| LOCATION#{{LID}}#{{DATE}}   | Date                        | Username        | DateVisited    |                                    | Add Visited Location |
| PERMISSION#{{UID}}#{{DATE}} | Username                    | Role            | DateAdded      |                                    |                      |

| Index | Access Patterns                                       | Query Condition s                                           |
| ----- | ----------------------------------------------------- | ----------------------------------------------------------- |
| 1     | Look Up User By User ID                               | Primary Key on table, ID="UID"                              |
| 2     | Look Up User Metadata By Username                     | Use GSI-1, PK="Username#{{Username}}"                       |
| 3     | Look up Vistors and Date Visted at a Certain Location | Use GSI-1, PK="Location#{{LID}}"                            |
| 4     | Look Up Scores for a certain Machine                  | Use GSI-3, PK="XrefID" SK="{{Date}}" (Either == Or Between) |
| 5     | Look Up Scores by UID                                 | Use GSI-1, PK='SCORE#{{UID}}'                               |
| 6     | Look up Favorite Machines by UID                      | Use Table, PK={{UID}} SK="FAVORITE"                         |
| 7     | Get All Vistors at certain Location                   | Use GSI-1PK="LOCATION#LID"                                  |
| 8     | Look Up All Machines Played By A User                 | Use GSI-1, PK="Username" SK="PIN"                           |
| 9     | Look Up All Favorite Machine Played By A User         | Use GSI-1, PK="Username" SK="FAVORITE"                      |
| 10    | Look Up All Scores Recorded on A Certain Date         | Use GSI-2, PK="DATE" S                                      |
| 11    | Look Up Users Who Like Specific Machine               | Use GSI-1, PK="FAVORITE#{{PINID}}"                          |
|       |                                                       |                                                             |
|       |                                                       |                                                             |
|       |                                                       |                                                             |
|       |                                                       |                                                             |

#### Facets

- User
  - Name
  - Username
  - Email
- Location
  - Date
- Pinball Machine Played
  - Location Id
  - Date
- Score
  - Score
  - Date
  - Username
  - ImageId (For Proof)
  - SignOff (UserID)

### Queries

### Updates

## Graphql

### Queries

```
query locations{
  locations(region:"ca-central"){
    id
    name
    lat
    lon
  }
}

```

```
query locationsByRegion {
  locationsByRegion(region:"dc"){
  	name
    id
  }
}
```

Add Player

```

mutation {
  putPlayer(data:
    {
    username: "tymg",
    name: "Matt Green",
    email: "verde.mateo.a@gmail.com"
    }
  ) {
  error
  }
}


```

### Mutations

Add Score

```
mutation addScore{
  addScore(userId:"666",username:"TYMG",
    data: {score:"3,000,000,000",locationMachineXrefId:"62614",pinId:"85352",locationId:"12410",s3RefId:null,isVerified:false}){
    username
    scores
  }
}

```

Add Favorite Game

```

mutation addFavoriteGame{
  addFavoriteGame(userId:"666",username:"TYMG",data:{gameId:"900"})
}

```

Add Favorite Machine

```
mutation addFavoriteMachine {
  addFavoriteMachine(userId:"666",username:"TYMG",data:{locationMachineXrefId:"1741"})
}
```

Add Visited Location

```
mutation {
  addVisitedLocation(userId:"666", username:"TYMG",data:{locationId:"111"}){
    locationId
  }
}

```

Add Played Machine

```

mutation addPlayedMachine {
  addPlayedMachine(userId:"666",data:{locationMachineXrefId:"123"}){
    locationMachineXrefId
  }
}

```

### Notes

Looks like Graphql has issues with merging Resolvers, so either the resolvers have to be in the same file, or figure out how they can be merged

## JS SDK

`Scan a table`

```
var params = {
    TableName: 'knocker-dev',
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
