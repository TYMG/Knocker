// Load the AWS SDK for Node.js
var AWS = require("aws-sdk");

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

/**
 *
 *
 * Generate Users and Add Permissions
 *
 */
let rawdata = fs.readFileSync("../db/data/users.json");
let users = JSON.parse(rawdata);
console.log(users);

users.forEach((user) => {
  console.log(user);
  var params = {
    TableName: "knocker-dev",
    Item: user,
  };
  docClient.put(params, function (err, data) {
    if (err) {
      console.log("Error", err);
    } else {
      console.log("Success", data);
    }
  });
});

/*
 *
 *
 * Adds Score
 *
 */
let scoreRawdata = fs.readFileSync("../db/data/scores.json");
let scores = JSON.parse(scoreRawdata);
console.log(scores);
scores.forEach((score) => {
  console.log(score);
  var params = {
    TableName: "knocker-dev",
    Item: score,
  };
  docClient.put(params, function (err, data) {
    if (err) {
      console.log("Error", err);
    } else {
      console.log("Success", data);
    }
  });
});

/***
 *
 *
 * Add Favorites
 *
 */
let favoritesRawdata = fs.readFileSync("../db/data/favorites.json");
let favorites = JSON.parse(favoritesRawdata);
console.log(favorites);
favorites.forEach((favorite) => {
  console.log(favorite);
  var params = {
    TableName: "knocker-dev",
    Item: favorite,
  };
  docClient.put(params, function (err, data) {
    if (err) {
      console.log("Error", err);
    } else {
      console.log("Success", data);
    }
  });
});

/***
 *
 *
 * Add Location Visited
 *
 */
let locationsRawdata = fs.readFileSync("../db/data/locations.json");
let locations = JSON.parse(locationsRawdata);
console.log(locations);
locations.forEach((location) => {
  console.log(location);
  var params = {
    TableName: "knocker-dev",
    Item: location,
  };
  docClient.put(params, function (err, data) {
    if (err) {
      console.log("Error", err);
    } else {
      console.log("Success", data);
    }
  });
});
