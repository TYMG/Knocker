import Database from "../../db/database";
import stringGen from "crypto-random-string";

export default class KnockerDB {
  // our methods go here, we are going to discuss them below
  async put(data) {
    const item = {
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
      item.id = { S: stringGen(12) };
    }

    const db = await this.getDatabase();
    await db.putItem({
      TableName: "player",
      Item: item,
    });
  }

  async get() {
    const db = await this.getDatabase();
    return db.get({
      TableName: "player",
      Key: {
        HashKey: "hashkey",
      },
    });
  }

  async getById(id) {
    const db = await this.getDatabase();
    return db.getItem({
      TableName: "player",
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
      TableName: "player",
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
      TableName: "player",
      Key: {
        id: {
          S: id.toString(),
        },
      },
    });
  }
  async getDatabase() {
    if (!this._db) {
      console.log("db created");
      this._db = new Database();
      await this._db.connect();
    }

    return this._db;
  }
}
