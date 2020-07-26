import Database from "../../db/database";
import stringGen from "crypto-random-string";
import score from "../../db/tables/score";
const cryptoRandomString = require("crypto-random-string");
const crypto = require("crypto");
const { v4 } = require("uuid");

export default class KnockerDB {
  constructor() {}
  // our methods go here, we are going to discuss them below
  async put(data) {
    const paramsData = data;
    //console.log("knocker-db.js - put()", paramsData);
    /* const item = {
      username: {
        S: data.username.toString(),
      },
      name: {
        S: data.name.toString(),
      },
      machinesPlayed: {
        L: [],
      },
      scores: {
        L: [],
      },
      locationsVisited: {
        L: [],
      },
      email: {
        S: data.email.toString(),
      },
    };

    if (data.id) {
      item.id = { S: data.id.toString() };
    } else {
      // as we mentioned before, we need to specify a new key explicitly
      crypto.randomBytes(20, (err, buffer) => {
        const token = buffer.toString("hex");
        item.id = { S: token };
      });
    } */

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

  async createScore(scoreData, userId) {
    const paramsData = scoreData;
    //console.log("knocker-db.js - createScore()", paramsData, userId);
    var params = {
      TableName: process.env.PLAYER_TABLE,
      Key: { id: userId },
      UpdateExpression: "SET scores = list_append(scores, :score)",
      ExpressionAttributeValues: {
        ":score": [{ ...scoreData, id: v4(), createdAt: new Date().getTime() }],
      },
      ReturnValues: "UPDATED_NEW",
    };
    const db = await this.getDatabase();

    const res = await db.update(params).then(function (data, err) {
      if (err) {
        //console.log(err, err.stack);
      } else {
        //console.log("update createScore() Response: ", paramsData);
        console.log("data", data);
        return scoreData;
      }
    });
    return res;
  }

  async createMachinePlayed(machinePlayed, userId) {
    const db = await this.getDatabase();
    const paramsData = machinePlayed;
    var queryParams = {
      TableName: process.env.PLAYER_TABLE,
      KeyConditionExpression: "id =:i",
      FilterExpression: "contains(machinesPlayed,:machineId)",
      ExpressionAttributeValues: {
        ":machineId": machinePlayed.machineId,
        ":i": userId,
      },
    };
    const query = await db.query(queryParams, function (data, err) {
      if (err) {
        console.log(err, err.stack);
      } else {
        //console.log("update createScore() Response: ", paramsData);
        console.log("data", data);
        return data;
      }
    });

    var params = {
      TableName: process.env.PLAYER_TABLE,
      Key: { id: userId },
      UpdateExpression:
        "SET machinesPlayed = list_append(machinesPlayed, :machines)",
      ExpressionAttributeValues: {
        ":machines": [
          { ...machinePlayed, id: v4(), lastUpdated: new Date().getTime() },
        ],
      },
      ReturnValues: "UPDATED_NEW",
    };
    const res = await db.update(params).then(function (data, err) {
      if (err) {
        //console.log(err, err.stack);
      } else {
        //console.log("update createScore() Response: ", paramsData);
        console.log("data", data);
        return machinePlayed;
      }
    });
    return res;
  }

  async createVisitedLocation(visitedLocation, userId) {
    const paramsData = visitedLocation;
    var params = {
      TableName: process.env.PLAYER_TABLE,
      Key: { id: userId },
      UpdateExpression:
        "SET machinesPlayed = list_append(machinesPlayed, :machines)",
      ExpressionAttributeValues: {
        ":machines": [
          { ...visitedLocation, id: v4(), dateVisted: new Date().getTime() },
        ],
      },
      ReturnValues: "UPDATED_NEW",
    };
    const db = await this.getDatabase();
    const res = await db.update(params).then(function (data, err) {
      if (err) {
        //console.log(err, err.stack);
      } else {
        //console.log("update createScore() Response: ", paramsData);
        console.log("data", data);
        return scoreData;
      }
    });
    return res;
  }

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
    return db.query({
      TableName: process.env.PLAYER_TABLE,
      KeyConditionExpression: "PK = :PK ",
      ExpressionAttributeValues: {
        ":PK": id,
      },
    });
  }

  /**
   *
   * This function needs to be updated to return list of Locations, Machines Played, Scores
   *
   * @param {*} username
   */
  async getUserByUsername(username) {
    const db = await this.getDatabase();
    return db.query({
      TableName: process.env.PLAYER_TABLE,
      IndexName: "DataGSI",
      KeyConditionExpression: "#Data = :Data",
      ExpressionAttributeNames: {
        "#Data": "Data",
      },
      ExpressionAttributeValues: {
        ":Data": username,
      },
    });
  }

  async getUserRolesById(id) {
    const permissionUserHash = crypto
      .createHash("md5")
      .update("ROLE#" + id)
      .digest("hex");
    console.log(permissionUserHash);
    const db = await this.getDatabase();
    return db.query({
      TableName: process.env.PLAYER_TABLE,
      KeyConditionExpression: "PK = :PK",
      ExpressionAttributeValues: {
        ":PK": permissionHash,
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
      IndexName: "XrefIdGSI",
      KeyConditionExpression: "XrefId = :XrefId",
      ExpressionAttributeValues: {
        ":XrefId": locMachId,
      },
    };

    docClient.query(params, function (err, data) {
      if (err) console.log(err);
      // an error occurred
      else console.log("Result", data); // successful response
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
        ":Date": date,
      },
    };
  }

  /* 
async getForCharacter(id) {
    const db = await this.getDatabase();
    const result = await db.scan({
        TableName: 'player',
        ExpressionAttributeValues: {
            ':cId': {
                S: id,
            },
        },
        FilterExpression: 'contains(characters, :cId)',
    });

    if (result && result.Items) {
        // need to "decode" the items, i know this is annoying
        return result.Items.map((item) => {

            const p = item.parameters ? item.parameters.M : {};
            const parameters = [];
            Object.keys(p).forEach((k) => {
                parameters.push({
                    name: k,
                    value: p[k].S,
                });
            });

            return {
                name: item.name.S,
                damage: item.damage.N,
                id: item.id.S,
                type: item.type.S,
                parameters,
            };
        });
    }

    return [];
} */

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
