// Load the AWS SDK for Node.js
var AWS = require("aws-sdk");
var crypto = require("crypto");
const fs = require("fs");

// Set the region
AWS.config.update({ region: "REGION" });

// Create DynamoDB document client
params = {
  endpoint: "http://localhost:8000",
  region: "local",
  accessKeyId: "local",
  secretAccessKey: "local",
};
var docClient = new AWS.DynamoDB.DocumentClient(params);

/*
 *
 *     [ { SK: 'FAVORITE#GAME#777',
       Data: 'TYMG',
       PK: '666',
       Date: '2020_06_23' },
     { SK: 'FAVORITE#MACHINE#616',
       Data: 'TYMG',
       PK: '666',
       Date: '2020_05_02' },
     { SK: 'FRIEND#820', Data: 'TOTT', PK: '666', Date: '2020_05_30' },
     { SK: 'LOCATION#999#345',
       Data: 'TYMG',
       PK: '666',
       Date: '2020_06_23' },
     { SK: 'LOCATION#999#789',
       Data: 'TYMG',
       PK: '666',
       Date: '2020_07_04' },
     { SK: 'MACHINE#1741#1587384000',
       Data: 'TYMG',
       PK: '666',
       Date: '2020_04_20' },
     { SK: 'MACHINE#616#1592913600',
       Data: 'TYMG',
       PK: '666',
       Date: '2020_06_23' },
     { SK: 'MACHINE#616#1595889442',
       Data: 'TYMG',
       PK: '666',
       Date: '2020-07-27' },
     { Email: 'verde.madeo.a@gmail.com',
       SK: 'USER',
       Data: 'TYMG',
       PK: '666',
       Date: '2020_07_02',
       Name: 'Matt Green',
       Location: 'Washington DC' } ],
 *
 */
var params = {
  TableName: "knocker-dev",
  KeyConditionExpression: "PK = :PK ",
  ExpressionAttributeValues: {
    ":PK": "666",
  },
};

docClient.query(params, function (err, data) {
  if (err) console.log(err);
  // an error occurred
  else {
    console.log("Retrieve User With PK n/", data);
    console.log(Array.isArray(data.Items));
    const items = data.Items;
    var user = {};
    items.forEach((element) => {
      if (element.SK.startsWith("USER")) {
        user.username = element.Data;
        user.name = element.Name;
        user.location = element.Location;
      } else if (element.SK.startsWith("FAVORITE#GAME")) {
        if (user.favoriteGames === undefined) {
          user.favoriteGames = [];
        }
        user.favoriteGames = [
          ...user.favoriteGames,
          {
            gameId: +element.SK.split("FAVORITE#GAME#")[1],
            dateAdded: element.Date,
          },
        ];
      } else if (element.SK.startsWith("FAVORITE#MACHINE")) {
        if (user.favoriteMachines === undefined) {
          user.favoriteMachines = [];
        }
        user.favoriteMachines = [
          ...user.favoriteMachines,
          {
            machineId: +element.SK.split("FAVORITE#MACHINE#")[1],
            dateAdded: element.Date,
          },
        ];
      } else if (element.SK.startsWith("FRIEND")) {
        if (user.friends === undefined) {
          user.friends = [];
        }
        user.friends = [
          ...user.friends,
          {
            id: +element.SK.split("FRIEND#")[1],
            username: element.Data,
            dateAdded: element.Date,
          },
        ];
      } else if (element.SK.startsWith("LOCATION")) {
        if (user.vistedLocations === undefined) {
          user.vistedLocations = [];
        } else {
          user.vistedLocations = [
            ...user.vistedLocations,
            {
              locationId: +element.SK.split("#")[1],
              dateVisted: element.Date,
            },
          ];
        }
      } else if (element.SK.startsWith("MACHINE")) {
        if (user.playedMachines === undefined) {
          user.playedMachines = [];
        }
        user.playedMachines = [
          ...user.playedMachines,
          { machineId: +element.SK.split("#")[1], datePlayed: element.Date },
        ];
      }
    });
    console.log(user);
  } // successful response}
});
