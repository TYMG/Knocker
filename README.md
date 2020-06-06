# Knocker

Articles Used
[How to use Serverless with Webpack and Docker locally and in production](https://medium.com/@gannochenko/how-to-use-serverless-locally-with-webpack-and-docker-5e268f71715)

[How to use GraphQL Apollo server with Serverless](https://medium.com/@gannochenko/how-to-use-graphql-apollo-server-with-serverless-606430ad94b3)
c

Convert Project to TypeScript

https://medium.com/@th.guibert/basic-apollo-express-graphql-api- -typescript-2ee021dea2c

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
  - docker rmi \$(docker images -a -q)

## Notes

Looks like Graphql has issues with merging Resolvers, so either the resolvers have to be in the same file, or figure out how they can be merged

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
