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

  async getById(id) {
    const db = await this.getDatabase();
    return db.getItem({
      TableName: process.env.PLAYER_TABLE,
      Key: {
        id: {
          S: id.toString(),
        },
      },
    });
  }

  async getByUsername(username) {
    const db = await this.getDatabase();
    return db.getItem({
      TableName: process.env.PLAYER_TABLE,
      Key: {
        username: {
          S: username.toString(),
        },
      },
    });
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
