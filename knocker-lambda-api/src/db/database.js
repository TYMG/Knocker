import AWS from "aws-sdk";

require("./config");
import tables from "./tables";

export default class Database {
  async connect() {
    console.log("Connect Called");
    if (!this._connection) {
      let params = {};
      console.log("__DEV__:", __DEV__);
      if (__DEV__) {
        console.log("Port", process.env.DB_URL);
        params = {
          endpoint: process.env.DB_URL,
          region: "local",
          accessKeyId: "local",
          secretAccessKey: "local",
        };
      } else {
        params = {
          region: "us-east-1",
          apiVersion: "2012-08-10",
        };
      }

      console.log("database.js - params", params);
      this._connection = new AWS.DynamoDB.DocumentClient(params);

      if (__DEV__) {
        //console.log(tables);
        //await this.checkTables();
        // will create tables through lambda only in development
        //await this.createTables(tables);
      }
    }
    console.log("database.js - this._connection", this._connection);
    return this._connection;
  }

  async get() {
    var params = {
      TableName: process.env.PLAYER_TABLE,
    };

    return new Promise((resolve, reject) => {
      this._connection.scan(params, (err, data) => {
        if (err) {
          reject(err);
        } else {
          console.log("database.js - get()", data);
          console.log("database.js - get(): Items", data.Items);
          resolve(this.createPlayers(data.Items));
        }
      });
    });
  }

  async putItem(params) {
    console.log("database.js - putItem");
    return new Promise((resolve, reject) => {
      this._connection.put(params, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }

  async getItem(params) {
    return new Promise((resolve, reject) => {
      this._connection.getItem(params, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }

  async update(params) {
    return new Promise((resolve, reject) => {
      this._connection.update(params, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }

  async updateItem(params) {
    return new Promise((resolve, reject) => {
      this._connection.updateItem(params, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }

  async scan(params = {}) {
    return new Promise((resolve, reject) => {
      this._connection.scan(params, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }

  async deleteItem(params) {
    return new Promise((resolve, reject) => {
      this._connection.deleteItem(params, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }

  async checkTables() {
    this._connection.listTables({}, function (err, data) {
      if (err) console.log(err);
      // an error occurred
      else console.log("checkTables results: ", data); // successful response
    });
  }

  async createTables(tables) {
    for (let k = 0; k < tables.length; k++) {
      const table = tables[k];

      await new Promise((resolve, reject) => {
        this._connection.createTable(table, (err) => {
          if (err) {
            if (err.code !== "ResourceInUseException") {
              console.dir(err);
              reject(err);
            } else {
              console.dir(`Table "${table.TableName}" exists`);
              resolve();
            }
          } else {
            console.dir(`Created table "${table.TableName}"`);
            resolve();
          }
        });
      });
    }
  }

  /**
   * 
   * atabase.js - get(): Items [
knocker-lambda-api_1  |   {
knocker-lambda-api_1  |     machinesPlayed: { L: [] },
knocker-lambda-api_1  |     scores: { L: [] },
knocker-lambda-api_1  |     name: { S: 'zxcvnghn' },
knocker-lambda-api_1  |     locationsVisited: { L: [] },
knocker-lambda-api_1  |     id: { S: '5eedb0709bce5f9a840ae3b2439088b941ba23d9' },
knocker-lambda-api_1  |     email: { S: 'nbbvnv' },
knocker-lambda-api_1  |     username: { S: 'sdfsf' }
knocker-lambda-api_1  |   }
   * 
   * 
   * @param {
    * } playersFromDB 
    */
  createPlayers(playersFromDB) {
    let playerArr = [];
    playersFromDB.forEach((player) => {
      playerArr.push({
        machinesPlayed: player.machinesPlayed.L,
        scores: player.scores.L,
        name: player.name.S,
        locationsVisited: player.locationsVisited.L,
        id: player.id.S,
        email: player.email.S,
        username: player.username.S,
      });
    });
    console.log(playerArr);
    return playerArr;
  }
}
