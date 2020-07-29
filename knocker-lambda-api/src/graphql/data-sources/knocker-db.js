import Database from "../../db/database";
import stringGen from "crypto-random-string";
import score from "../../db/tables/score";
const cryptoRandomString = require("crypto-random-string");
const crypto = require("crypto");
const { v4 } = require("uuid");

var moment = require("moment"); // require
const userReducer = require("../reducers/user");
export default class KnockerDB {
  constructor() {}
  // our methods go here, we are going to discuss them below

  /**
   *
   * ---------------------------------------------
   *                   Writes
   * ---------------------------------------------
   *
   */

  async put(data) {
    const paramsData = data;

    const item = {
      id: "2",
      createdAt: new Date().getTime(),
      username: data.username.toString(),
      email: data.email.toString(),
      name: data.name.toString(),
      locationsVisited: [],
      machinesPlayed: [],
      scores: [],
    };

    const db = await this.getDatabase();
    /* await db.putItem({
     TableName: process.env.PLAYER_TABLE,
      Item: item,
    }); */
    //return item;

    //console.log("item: ", item);
    await db
      .putItem({
        TableName: process.env.PLAYER_TABLE,
        Item: item,
        ReturnValues: "NONE",
      })
      .then(function (data, err) {
        if (err) {
          //console.log(err, err.stack);
        } else {
          //console.log("update putItem() Response: ", paramsData);
          return paramsData;
        }
      });

    return item;
  }

  async addRoles(role, userId, username) {
    var hashString = "ROLE#" + userId;
    const roleUserHash = crypto
      .createHash("md5")
      .update(hashString)
      .digest("hex");

    var params = {
      TableName: process.env.PLAYER_TABLE,
      Key: {
        // The primary key of the item (a map of attribute name to AttributeValue)

        PK: roleUserHash, //(string | number | boolean | null | Binary)
        SK: role,
        // more attributes...
      },
      UpdateExpression: "SET #Data = :Data, #Date = :Date",
      ConditionExpression: "Not contains(SK,:SK)", // optional String describing the constraint to be placed on an attribute
      ExpressionAttributeNames: {
        // a map of substitutions for attribute names with special characters
        "#Data": "Data",
        "#Date": "Date",
      },
      ExpressionAttributeValues: {
        // a map of substitutions for all attribute values
        ":SK": role,
        ":Data": username,
        ":Date": moment().format("YYYY-MM-DD"),
      },
      ReturnValues: "UPDATED_NEW",
    };
    const db = await this.getDatabase();

    return db.update(params).then(function (data, err) {
      if (err) {
        //console.log(err, err.stack);
      } else {
        //console.log("update createScore() Response: ", paramsData);
        console.log("data", data);
      }
    });
  }

  async addFriend(friendUserName, friendUid, userId) {
    const SK = "FRIEND#" + friendUid;
    var params = {
      TableName: process.env.PLAYER_TABLE,
      Key: {
        PK: userId, //(string | number | boolean | null | Binary)
        SK: SK,
      },
      UpdateExpression: "set #data = :data, #date = :date", // String representation of the update
      ConditionExpression: "Not contains(SK,:sk)", // Checks if SK contains :sk value ? ConditionalCheckFailedException : Add Item
      ExpressionAttributeNames: {
        // a map of substitutions for attribute names with special character
        "#data": "Data",
        "#date": "Date",
      },
      ExpressionAttributeValues: {
        // a map of substitutions for all attribute values
        ":sk": SK,
        ":data": friendUserName,
        ":date": moment().format("YYYY-MM-DD"),
      },
      ReturnValues: "UPDATED_NEW",
    };
    const db = await this.getDatabase();

    return db.update(params).then(function (data, err) {
      if (err) {
        //console.log(err, err.stack);
      } else {
        //console.log("update createScore() Response: ", paramsData);
        console.log("data", data);
      }
    });
  }
  async addFavoritePin(pinId, username, userId) {
    const SK = "FAVORITE#PIN#" + pinId;
    var params = {
      TableName: process.env.PLAYER_TABLE,
      Key: {
        PK: userId, //(string | number | boolean | null | Binary)
        SK: SK,
      },
      UpdateExpression: "set #data = :data, #date = :date", // String representation of the update
      ConditionExpression: "Not contains(SK,:sk)", // Checks if SK contains :sk value ? ConditionalCheckFailedException : Add Item
      ExpressionAttributeNames: {
        // a map of substitutions for attribute names with special character
        "#data": "Data",
        "#date": "Date",
      },
      ExpressionAttributeValues: {
        // a map of substitutions for all attribute values
        ":sk": SK,
        ":data": username,
        ":date": moment().format("YYYY-MM-DD"),
      },
      ReturnValues: "UPDATED_NEW",
    };
    const db = await this.getDatabase();

    return db.update(params).then(function (data, err) {
      if (err) {
        //console.log(err, err.stack);
      } else {
        //console.log("update createScore() Response: ", paramsData);
        console.log("data", data);
      }
    });
  }

  async addFavoriteMachine(locationMachineXrefId, username, userId) {
    const SK = "FAVORITE#MACHINE#" + locationMachineXrefId;
    var params = {
      TableName: process.env.PLAYER_TABLE,
      Key: {
        PK: userId, //(string | number | boolean | null | Binary)
        SK: SK,
      },
      UpdateExpression: "set #data = :data, #date = :date", // String representation of the update
      ConditionExpression: "Not contains(SK,:sk)", // Checks if SK contains :sk value ? ConditionalCheckFailedException : Add Item
      ExpressionAttributeNames: {
        // a map of substitutions for attribute names with special character
        "#data": "Data",
        "#date": "Date",
      },
      ExpressionAttributeValues: {
        // a map of substitutions for all attribute values
        ":sk": SK,
        ":data": username,
        ":date": moment().format("YYYY-MM-DD"),
      },
      ReturnValues: "UPDATED_NEW",
    };
    const db = await this.getDatabase();

    return db.update(params).then(function (data, err) {
      if (err) {
        //console.log(err, err.stack);
      } else {
        //console.log("update createScore() Response: ", paramsData);
        console.log("data", data);
      }
    });
  }

  async addPlayedMachine(locationMachineXrefId, userId) {
    const epoch = moment().format("X");
    const SK = "MACHINE#" + locationMachineXrefId + "#" + epoch;
    var params = {
      TableName: process.env.PLAYER_TABLE,
      Key: {
        PK: "666", //(string | number | boolean | null | Binary)
        SK: SK,
      },
      UpdateExpression: "set #data = :data, #date = :date", // String representation of the update
      ConditionExpression: "Not contains(SK,:sk)", // Checks if SK contains :sk value ? ConditionalCheckFailedException : Add Item
      ExpressionAttributeNames: {
        // a map of substitutions for attribute names with special character
        "#data": "Data",
        "#date": "Date",
      },
      ExpressionAttributeValues: {
        // a map of substitutions for all attribute values
        ":sk": SK,
        ":data": "TYMG",
        ":date": moment().format("YYYY-MM-DD"),
      },
      ReturnValues: "UPDATED_NEW",
    };

    const db = await this.getDatabase();

    return db.update(params).then(function (data, err) {
      if (err) {
        //console.log(err, err.stack);
      } else {
        //console.log("update createScore() Response: ", paramsData);
        console.log("data", data);
      }
    });
  }

  async addVisitedLocation(locationId, userId) {
    const epoch = moment().format("X");
    const SK = "LOCATION#" + locationId + "#" + epoch;
    var params = {
      TableName: process.env.PLAYER_TABLE,
      Key: {
        PK: "666", //(string | number | boolean | null | Binary)
        SK: SK,
      },
      UpdateExpression: "set #data = :data, #date = :date", // String representation of the update
      ConditionExpression: "Not contains(SK,:sk)", // Checks if SK contains :sk value ? ConditionalCheckFailedException : Add Item
      ExpressionAttributeNames: {
        // a map of substitutions for attribute names with special character
        "#data": "Data",
        "#date": "Date",
      },
      ExpressionAttributeValues: {
        // a map of substitutions for all attribute values
        ":sk": SK,
        ":data": "TYMG",
        ":date": moment().format("YYYY-MM-DD"),
      },
      ReturnValues: "UPDATED_NEW",
    };

    const db = await this.getDatabase();

    return db.update(params).then(function (data, err) {
      if (err) {
        //console.log(err, err.stack);
      } else {
        //console.log("update createScore() Response: ", paramsData);
        console.log("data", data);
      }
    });
  }

  async createScore(
    score,
    pinId,
    locationId,
    locationMachineXrefId,
    username,
    userId
  ) {
    const epoch = moment().format("X");
    const scoreString = "SCORE#" + pinId;
    const PK = crypto.createHash("md5").update(scoreString).digest("hex");

    const SK = "SCORE#" + userId + "#" + epoch;
    var params = {
      TableName: process.env.PLAYER_TABLE,
      Key: {
        PK: PK, //(string | number | boolean | null | Binary)
        SK: SK,
        // more attributes...
      },
      UpdateExpression:
        "SET #Data = :Data, #Score = :Score, #Date = :Date, #LocationId = :LocationId, #LocationMachineXrefId =:LocationMachineXrefId",
      ConditionExpression: "Not contains(SK,:SK)", // optional String describing the constraint to be placed on an attribute
      ExpressionAttributeNames: {
        // a map of substitutions for attribute names with special characters
        "#Data": "Data",
        "#Score": "Score",
        "#Date": "Date",
        "#LocationId": "LocationId",
        "#LocationMachineXrefId": "LocationMachineXrefId",
      },
      ExpressionAttributeValues: {
        // a map of substitutions for all attribute values
        ":SK": SK,
        ":Data": username,
        ":Score": score,
        ":Date": moment().format("YYYY-MM-DD"),
        ":LocationId": locationId,
        ":LocationMachineXrefId": locationMachineXrefId,
      },
      ReturnValues: "UPDATED_NEW",
    };
    const db = await this.getDatabase();

    return db.update(params).then(function (data, err) {
      if (err) {
        //console.log(err, err.stack);
      } else {
        //console.log("update createScore() Response: ", paramsData);
        console.log("data", data);
      }
    });
  }

  /**
   *
   * ---------------------------------------------
   *                   Queries
   * ---------------------------------------------
   *
   */

  async get() {
    const db = await this.getDatabase();
    //console.log("knocker-db.js - get()");

    return db.get({
      TableName: process.env.PLAYER_TABLE,
      Key: {
        HashKey: "hashkey",
      },
    });
  }

  /**
   *
   * This function needs to be updated to return lists of Locations, Machines Played Favorite Machines, Favorite Games, Friends
   *
   * @param {*} id
   */
  async getUserById(id) {
    const db = await this.getDatabase();
    const params = {
      TableName: process.env.PLAYER_TABLE,
      KeyConditionExpression: "PK = :PK ",
      ExpressionAttributeValues: {
        ":PK": id,
      },
    };
    return docClient.query(params, function (err, data) {
      if (err) console.log(err);
      // an error occurred
      else return userReducer.reduce(data); // successful response
    });

    // successful response}
  }

  /**
   *
   * This function needs to be updated to return list of Locations, Machines Played, Scores
   *
   * @param {*} username
   */
  async getUserByUsername(username) {
    const params = {
      TableName: process.env.PLAYER_TABLE,
      IndexName: "DataGSI",
      KeyConditionExpression: "#Data = :Data",
      ExpressionAttributeNames: {
        "#Data": "Data",
      },
      ExpressionAttributeValues: {
        ":Data": username,
      },
    };
    const db = await this.getDatabase();
    return db.query(function (err, data) {
      if (err) console.log(err);
      // an error occurred
      else return userReducer.reduce(data); // successful response
    });
  }

  async getUserRolesById(id) {
    const roleUserHash = crypto
      .createHash("md5")
      .update("ROLE#" + id)
      .digest("hex");
    console.log(roleUserHash);
    const db = await this.getDatabase();
    return db.query({
      TableName: process.env.PLAYER_TABLE,
      KeyConditionExpression: "PK = :PK",
      ExpressionAttributeValues: {
        ":PK": roleHash,
      },
    });
  }

  async getUsersByRole(role) {
    return db.query({
      TableName: process.env.PLAYER_TABLE,
      IndexName: "SKGSI",
      KeyConditionExpression: "SK = :SK",
      ExpressionAttributeValues: {
        ":SK": role,
      },
    });
  }

  async getUserScores(username, uid) {
    const db = await this.getDatabase();
    return db.query({
      TableName: process.env.PLAYER_TABLE,
      IndexName: "DataGSI",
      KeyConditionExpression: "#Data = :Data AND begins_with(SK,:SK)",
      ExpressionAttributeNames: {
        "#Data": "Data",
      },
      ExpressionAttributeValues: {
        ":Data": username,
        ":SK": "SCORE",
      },
    });
  }
  async getUserScoresByGameId(username, uid, gameId) {
    const db = await this.getDatabase();
    return db.query({
      TableName: process.env.PLAYER_TABLE,
      IndexName: "DataGSI",
      KeyConditionExpression: "#Data = :Data AND begins_with(SK,:SK)",
      ExpressionAttributeNames: {
        "#Data": "Data",
      },
      ExpressionAttributeValues: {
        ":Data": username,
        ":SK": "SCORE#" + uid + "#" + gameId,
      },
    });
  }

  /**
   *
   * @param {*} gameId
   */
  async getScoresByGameId(gameId) {
    const gameScoreHash = crypto
      .createHash("md5")
      .update("SCORE#" + gameId)
      .digest("hex");
    console.log(gameScoreHash);
    const db = await this.getDatabase();
    return db.query({
      TableName: process.env.PLAYER_TABLE,
      KeyConditionExpression: "PK = :PK ",
      ExpressionAttributeValues: {
        ":PK": gameScoreHash,
      },
    });
  }

  async getKnockerScoresByLocationMachineId(locMachId) {
    var params = {
      TableName: process.env.PLAYER_TABLE,
      IndexName: "LocationMachineXrefIdGSI",
      KeyConditionExpression: "LocationMachineXrefId = :LocationMachineXrefId",
      ExpressionAttributeValues: {
        ":LocationMachineXrefId": locMachId,
      },
    };

    return docClient.query(params, function (err, data) {
      if (err) console.log(err);
      // an error occurred
      else return data; // successful response
    });
  }

  async getEventsByDate(date) {
    var params = {
      TableName: process.env.PLAYER_TABLE,
      IndexName: "DateGSI",
      KeyConditionExpression: "#Date = :Date",
      ExpressionAttributeNames: {
        "#Date": "Date",
      },
      ExpressionAttributeValues: {
        ":Date": moment(date).format("YYYY-MM-DD"),
      },
    };
    return docClient.query(params, function (err, data) {
      if (err) console.log(err);
      // an error occurred
      else return data; // successful response
    });
  }

  async delete(id) {
    const db = await this.getDatabase();
    await db.deleteItem({
      TableName: process.env.PLAYER_TABLE,
      Key: {
        id: {
          S: id.toString(),
        },
      },
    });
  }
  async getDatabase() {
    if (!this._db) {
      //console.log("db created");
      this._db = new Database();
      await this._db.connect();
    }

    return this._db;
  }
}
