# Knocker

## Next Steps:
- [ ] - Add User Authentication Via AWS Cognito
  - Resources: https://itnext.io/my-experience-with-severless-graphql-2e95e5a8bda7
- [ ] - Update Apollo Server API
  - [ ] - Add Seed Data for Player Table
  - [ ] - Update Deployment Scripts (Run Seed Data Before Deploying)
  - [ ] - Update Serverless to use preexisting DynamoDB Table
    - [ ] - Add IAM Roles For Serverless Lambda Function To Access DynamoDB Table
  - Resources: https://github.com/serverless/serverless-graphql/tree/master/app-backend/dynamodb


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
### Used Articles:
* [How to use Serverless with Webpack and Docker locally and in production](https://medium.com/@gannochenko/how-to-use-serverless-locally-with-webpack-and-docker-5e268f71715)
* [How to use GraphQL Apollo server with Serverless](https://medium.com/@gannochenko/how-to-use-graphql-apollo-server-with-serverless-606430ad94b3)
### Research Articles:
* [Basic Apollo Express GraphQL API with TypeScript](https://medium.com/@th.guibert/basic-https://medium.com/@th.guibert/basic-apollo-express-graphql-api-with-typescript-2ee021dea2capollo-express-graphql-api-with-typescript-2ee021dea2c)
