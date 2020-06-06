(function(e, a) { for(var i in a) e[i] = a[i]; }(exports, /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/handler.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/db/database.js":
/*!****************************!*\
  !*** ./src/db/database.js ***!
  \****************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"default\", function() { return Database; });\n/* harmony import */ var aws_sdk__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! aws-sdk */ \"aws-sdk\");\n/* harmony import */ var aws_sdk__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(aws_sdk__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _tables__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./tables */ \"./src/db/tables/index.js\");\n\n\nclass Database {\n  async connect() {\n    console.log(\"Connect Called\");\n\n    if (!this._connection) {\n      let params = {};\n      console.log(true);\n\n      if (true) {\n        params = {\n          endpoint: process.env.DB_URL,\n          region: \"local\",\n          accessKeyId: \"local\",\n          secretAccessKey: \"local\"\n        };\n      } else {}\n\n      this._connection = new aws_sdk__WEBPACK_IMPORTED_MODULE_0___default.a.DynamoDB(params);\n\n      if (true) {\n        console.log(_tables__WEBPACK_IMPORTED_MODULE_1__[\"default\"]); // will create tables through lambda only in development\n\n        await this.createTables(_tables__WEBPACK_IMPORTED_MODULE_1__[\"default\"]);\n      }\n    }\n\n    console.log(this._connection);\n    return this._connection;\n  }\n\n  async get() {\n    return new Promise((resolve, reject) => {\n      this._connection.get(params, (err, data) => {\n        if (err) {\n          reject(err);\n        } else {\n          resolve(data);\n        }\n      });\n    });\n  }\n\n  async putItem(params) {\n    return new Promise((resolve, reject) => {\n      this._connection.putItem(params, (err, data) => {\n        if (err) {\n          reject(err);\n        } else {\n          resolve(data);\n        }\n      });\n    });\n  }\n\n  async getItem(params) {\n    return new Promise((resolve, reject) => {\n      this._connection.getItem(params, (err, data) => {\n        if (err) {\n          reject(err);\n        } else {\n          resolve(data);\n        }\n      });\n    });\n  }\n\n  async updateItem(params) {\n    return new Promise((resolve, reject) => {\n      this._connection.updateItem(params, (err, data) => {\n        if (err) {\n          reject(err);\n        } else {\n          resolve(data);\n        }\n      });\n    });\n  }\n\n  async scan(params = {}) {\n    return new Promise((resolve, reject) => {\n      this._connection.scan(params, (err, data) => {\n        if (err) {\n          reject(err);\n        } else {\n          resolve(data);\n        }\n      });\n    });\n  }\n\n  async deleteItem(params) {\n    return new Promise((resolve, reject) => {\n      this._connection.deleteItem(params, (err, data) => {\n        if (err) {\n          reject(err);\n        } else {\n          resolve(data);\n        }\n      });\n    });\n  }\n\n  async createTables(tables) {\n    for (let k = 0; k < tables.length; k++) {\n      const table = tables[k];\n      await new Promise((resolve, reject) => {\n        this._connection.createTable(table, err => {\n          if (err) {\n            if (err.code !== \"ResourceInUseException\") {\n              console.dir(err);\n              reject(err);\n            } else {\n              console.dir(`Table \"${table.TableName}\" exists`);\n              resolve();\n            }\n          } else {\n            console.dir(`Created table \"${table.TableName}\"`);\n            resolve();\n          }\n        });\n      });\n    }\n  }\n\n}\n\n//# sourceURL=webpack:///./src/db/database.js?");

/***/ }),

/***/ "./src/db/tables/index.js":
/*!********************************!*\
  !*** ./src/db/tables/index.js ***!
  \********************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _player__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./player */ \"./src/db/tables/player.js\");\n/* harmony import */ var _score__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./score */ \"./src/db/tables/score.js\");\n\n\n/* harmony default export */ __webpack_exports__[\"default\"] = ([_player__WEBPACK_IMPORTED_MODULE_0__[\"default\"]]);\n\n//# sourceURL=webpack:///./src/db/tables/index.js?");

/***/ }),

/***/ "./src/db/tables/player.js":
/*!*********************************!*\
  !*** ./src/db/tables/player.js ***!
  \*********************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony default export */ __webpack_exports__[\"default\"] = ({\n  TableName: \"player\",\n  KeySchema: [{\n    AttributeName: \"id\",\n    KeyType: \"HASH\"\n  }],\n  AttributeDefinitions: [{\n    AttributeName: \"id\",\n    AttributeType: \"S\"\n  }],\n  ProvisionedThroughput: {\n    ReadCapacityUnits: 5,\n    WriteCapacityUnits: 5\n  }\n});\n\n//# sourceURL=webpack:///./src/db/tables/player.js?");

/***/ }),

/***/ "./src/db/tables/score.js":
/*!********************************!*\
  !*** ./src/db/tables/score.js ***!
  \********************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony default export */ __webpack_exports__[\"default\"] = ({\n  TableName: \"score\",\n  KeySchema: [{\n    AttributeName: \"id\",\n    KeyType: \"HASH\"\n  }],\n  AttributeDefinitions: [{\n    AttributeName: \"id\",\n    AttributeType: \"S\"\n  }],\n  ProvisionedThroughput: {\n    ReadCapacityUnits: 5,\n    WriteCapacityUnits: 5\n  }\n});\n\n//# sourceURL=webpack:///./src/db/tables/score.js?");

/***/ }),

/***/ "./src/graphql/data-sources/knocker-db.js":
/*!************************************************!*\
  !*** ./src/graphql/data-sources/knocker-db.js ***!
  \************************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"default\", function() { return KnockerDB; });\n/* harmony import */ var _db_database__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../db/database */ \"./src/db/database.js\");\n/* harmony import */ var crypto_random_string__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! crypto-random-string */ \"crypto-random-string\");\n/* harmony import */ var crypto_random_string__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(crypto_random_string__WEBPACK_IMPORTED_MODULE_1__);\n\n\nclass KnockerDB {\n  constructor() {\n    console.log(\"knocker-db.js - Constructor Called\");\n  } // our methods go here, we are going to discuss them below\n\n\n  async put(data) {\n    console.log(\"knocker-db.js - put()\", data);\n    const item = {\n      username: {\n        S: data.username.toString()\n      },\n      name: {\n        S: data.name.toString()\n      },\n      machinesPlayed: {\n        L: []\n      },\n      scores: {\n        L: []\n      },\n      locationsVisited: {\n        L: []\n      },\n      email: {\n        S: data.email.toString()\n      }\n    };\n\n    if (data.id) {\n      item.id = {\n        S: data.id.toString()\n      };\n    } else {\n      // as we mentioned before, we need to specify a new key explicitly\n      item.id = {\n        S: crypto_random_string__WEBPACK_IMPORTED_MODULE_1___default()(12)\n      };\n    }\n\n    const db = await this.getDatabase();\n    await db.putItem({\n      TableName: \"player\",\n      Item: item\n    });\n  }\n\n  async get() {\n    const db = await this.getDatabase();\n    return db.get({\n      TableName: \"player\",\n      Key: {\n        HashKey: \"hashkey\"\n      }\n    });\n  }\n\n  async getById(id) {\n    const db = await this.getDatabase();\n    return db.getItem({\n      TableName: \"player\",\n      Key: {\n        id: {\n          S: id.toString()\n        }\n      }\n    });\n  }\n\n  async getByUsername(username) {\n    const db = await this.getDatabase();\n    return db.getItem({\n      TableName: \"player\",\n      Key: {\n        username: {\n          S: username.toString()\n        }\n      }\n    });\n  }\n  /* \n  async getForCharacter(id) {\n    const db = await this.getDatabase();\n    const result = await db.scan({\n        TableName: 'player',\n        ExpressionAttributeValues: {\n            ':cId': {\n                S: id,\n            },\n        },\n        FilterExpression: 'contains(characters, :cId)',\n    });\n     if (result && result.Items) {\n        // need to \"decode\" the items, i know this is annoying\n        return result.Items.map((item) => {\n             const p = item.parameters ? item.parameters.M : {};\n            const parameters = [];\n            Object.keys(p).forEach((k) => {\n                parameters.push({\n                    name: k,\n                    value: p[k].S,\n                });\n            });\n             return {\n                name: item.name.S,\n                damage: item.damage.N,\n                id: item.id.S,\n                type: item.type.S,\n                parameters,\n            };\n        });\n    }\n     return [];\n  } */\n\n\n  async delete(id) {\n    const db = await this.getDatabase();\n    await db.deleteItem({\n      TableName: \"player\",\n      Key: {\n        id: {\n          S: id.toString()\n        }\n      }\n    });\n  }\n\n  async getDatabase() {\n    if (!this._db) {\n      console.log(\"db created\");\n      this._db = new _db_database__WEBPACK_IMPORTED_MODULE_0__[\"default\"]();\n      await this._db.connect();\n    }\n\n    return this._db;\n  }\n\n}\n\n//# sourceURL=webpack:///./src/graphql/data-sources/knocker-db.js?");

/***/ }),

/***/ "./src/graphql/data-sources/pinball.js":
/*!*********************************************!*\
  !*** ./src/graphql/data-sources/pinball.js ***!
  \*********************************************/
/*! exports provided: PinballMachineAPI */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"PinballMachineAPI\", function() { return PinballMachineAPI; });\n/* harmony import */ var apollo_datasource_rest__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! apollo-datasource-rest */ \"apollo-datasource-rest\");\n/* harmony import */ var apollo_datasource_rest__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(apollo_datasource_rest__WEBPACK_IMPORTED_MODULE_0__);\n\nclass PinballMachineAPI extends apollo_datasource_rest__WEBPACK_IMPORTED_MODULE_0__[\"RESTDataSource\"] {\n  constructor() {\n    super();\n    this.baseURL = \"https://pinballmap.com/api/v1\";\n  } // leaving this inside the class to make the class easier to test\n\n\n  pinballMachineReducer(pin) {\n    return {\n      id: pin.id,\n      name: pin.name,\n      is_active: pin.is_active,\n      created_at: pin.created_at,\n      updated_at: pin.updated_at,\n      ipdb_link: pin.ipdb_link,\n      year: pin.year,\n      manufacturer: pin.manufacturer,\n      machine_group_id: pin.machine_group_id,\n      ipdb_id: pin.ipdb_id,\n      opdb_id: pin.opdb_id\n    };\n  }\n\n  regionReducer(reg) {\n    return {\n      id: reg.id,\n      name: reg.name,\n      created_at: reg.created_at,\n      updated_at: reg.updated_at,\n      full_name: reg.full_name,\n      motd: reg.motd,\n      lat: reg.lat,\n      lon: reg.lon,\n      state: reg.state,\n      effective_radius: reg.effective_radius\n    };\n  }\n\n  locationReducer(loc) {\n    return {\n      id: loc.id,\n      name: loc.name,\n      street: loc.street,\n      city: loc.city,\n      state: loc.state,\n      zip: loc.zip,\n      phone: loc.phone,\n      lat: loc.lat,\n      lon: loc.lon,\n      website: loc.website,\n      created_at: loc.created_at,\n      updated_at: loc.updated_at,\n      zone_id: loc.zone_id,\n      region_id: loc.region_id,\n      location_type_id: loc.location_type_id,\n      description: loc.description,\n      operator_id: loc.operator_id,\n      date_last_updated: loc.date_last_updated,\n      last_updated_by_user_id: loc.last_updated_by_user_id,\n      is_stern_army: loc.is_stern_army,\n      country: loc.country,\n      num_machines: loc.num_machines,\n      location_machine_xrefs: loc.location_machine_xrefs\n    };\n  }\n\n  highestScore(hs) {\n    return {\n      id: hs.id,\n      location_machine_xref_id: hs.location_machine_xref_id,\n      score: hs.score,\n      created_at: hs.created_at,\n      updated_at: hs.updated_at,\n      user_id: hs.user_id,\n      username: hs.username\n    };\n  }\n\n  operatorReducer(op) {\n    return {\n      id: op.id,\n      name: op.name,\n      region_id: op.region_id,\n      email: op.email,\n      website: op.website,\n      phone: op.phone,\n      created_at: op.created_at,\n      updated_at: op.updated_at\n    };\n  }\n\n  async getAllMachines() {\n    const response = await this.get(`/machines.json`); // transform the raw launches to a more friendly\n\n    let returnArray = [];\n\n    if (response) {\n      response[\"machines\"].forEach(element => {\n        //console.log(\"test\", element);\n        returnArray.push(this.pinballMachineReducer(element));\n      });\n      return returnArray;\n    }\n    /*  Array.isArray(response)\n      ? response.map(machine => this.pinballMachineReducer(machine))\n      : []; */\n\n  }\n\n  async getAllOperators() {\n    const response = await this.get(`/machines.json`); // transform the raw launches to a more friendly\n\n    return Array.isArray(response) ? response.map(op => this.operatorReducer(op)) : [];\n  }\n\n  async getAllRegions() {\n    const response = await this.get(`/regions`);\n    let returnArray = [];\n\n    if (response) {\n      response[\"regions\"].forEach(element => {\n        //console.log(\"test\", element);\n        returnArray.push(this.regionReducer(element));\n      });\n      return returnArray;\n    } //https://pinballmap.com/api/v1/regions\n\n  }\n\n  async getLocations({\n    region\n  }) {\n    const response = await this.get(\"/locations\", {\n      region: region\n    });\n    let returnArray = [];\n\n    if (response) {\n      response[\"locations\"].forEach(element => {\n        //console.log(\"test\", element);\n        returnArray.push(this.locationReducer(element));\n      });\n      return returnArray;\n    }\n    /* https://pinballmap.com/api/v1/locations?region=ca-central \n      the region is required: its a string\n      */\n\n  }\n\n  async getLocationsByRegion({\n    region\n  }) {\n    const response = await this.get(\"/region/\" + region + \"/locations\");\n    let returnArray = [];\n\n    if (response) {\n      response[\"locations\"].forEach(element => {\n        //console.log(\"test\", element);\n        returnArray.push(this.locationReducer(element));\n      });\n      return returnArray;\n    } //https://pinballmap.com/api/v1/region/ca-central/locations\n\n  }\n\n  async getLocationsClosestByAddress() {\n    /* http://pinballmap.com/api/v1/locations/closest_by_address.json?send_all_within_distance=true;no_details=1;manufacturer=Stern;address=20009;max_distance=50 */\n    //The Address is a zipcode, the most important field\n  }\n\n  async getMachinesHighestScore() {}\n  /*  https://pinballmap.com/api/v1/machine_score_xrefs/3467\n    id:3467 */\n\n  /*   async getLaunchById({ launchId }) {\n      const res = await this.get(\"launches\", { flight_number: launchId });\n      return this.launchReducer(res[0]);\n    }\n    async getLaunchesByIds({ launchIds }) {\n      return Promise.all(\n        launchIds.map(launchId => this.getLaunchById({ launchId }))\n      );\n    } */\n\n\n}\n\n//# sourceURL=webpack:///./src/graphql/data-sources/pinball.js?");

/***/ }),

/***/ "./src/graphql/resolvers/index.js":
/*!****************************************!*\
  !*** ./src/graphql/resolvers/index.js ***!
  \****************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var merge_graphql_schemas__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! merge-graphql-schemas */ \"merge-graphql-schemas\");\n/* harmony import */ var merge_graphql_schemas__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(merge_graphql_schemas__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _pinball__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./pinball */ \"./src/graphql/resolvers/pinball.js\");\n/* harmony import */ var _player__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./player */ \"./src/graphql/resolvers/player.js\");\n/* harmony import */ var _knocker__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./knocker */ \"./src/graphql/resolvers/knocker.js\");\n\n\nconst GMR = __webpack_require__(/*! graphql-merge-resolvers */ \"graphql-merge-resolvers\"); // Import module\n\n\n\n\n\n/*import scoreResolver from \"./score\"; */\n\n/* import machineResolver from \"./machine\";\nimport machineXrefResolver from \"./machine-xref\";\nimport machineConditionResolver from \"./machine-condition\";\nimport regionResolver from \"./region\";\nimport locationResolver from \"./location\";\nimport operatorResolver from \"./opera\"; */\n\nconst resolvers = [//playerResolver,\n_pinball__WEBPACK_IMPORTED_MODULE_1__[\"default\"]\n/*   playerResolver,\nscoreResolver */\n\n/* machineResolver,\nmachineXrefResolver,\nmachineConditionResolver,\nregionResolver,\nlocationResolver,\noperatorResolver */\n];\n/* harmony default export */ __webpack_exports__[\"default\"] = (_knocker__WEBPACK_IMPORTED_MODULE_3__[\"default\"]);\n/* const mainResolver = GMR.merge([playerResolver, pinballResolver]); \nexport default mainResolver; */\n\n//# sourceURL=webpack:///./src/graphql/resolvers/index.js?");

/***/ }),

/***/ "./src/graphql/resolvers/knocker.js":
/*!******************************************!*\
  !*** ./src/graphql/resolvers/knocker.js ***!
  \******************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony default export */ __webpack_exports__[\"default\"] = ({\n  Query: {\n    players: (_, __, {\n      dataSources\n    }) => dataSources.knockerDB.get(),\n    machines: (_, __, {\n      dataSources\n    }) => dataSources.pinballMachineAPI.getAllMachines()\n    /* \n    allOps: (_, __, { dataSources }) =>\n      dataSources.pinballMachineAPI.getAllOperators(),\n     allRegions: (_, __, { dataSources }) =>\n      dataSources.pinballMachineAPI.getAllRegions(),\n     allLocations: (_, { region }, { dataSources }) =>\n      dataSources.pinballMachineAPI.getLocations({ region: region }),\n     getLocationsByRegion: (_, { region }, { dataSources }) =>\n      dataSources.pinballMachineAPI.getLocationsByRegion({ region: region }) */\n\n  },\n  Mutation: {\n    putPlayer: async (source, args, {\n      dataSources\n    }, state) => {\n      const {\n        data\n      } = args;\n      let result = {};\n\n      try {\n        console.log(dataSources);\n        await dataSources.knockerDB.put(data);\n      } catch (e) {\n        console.error(e);\n        result.error = \"Internal error\";\n      }\n\n      return result;\n    },\n    deletePlayer: async (source, args, {\n      dataSources\n    }, state) => {\n      const {\n        id\n      } = args;\n      let result = {};\n\n      try {\n        await dataSources.knockerDB.delete(id);\n      } catch (e) {\n        console.error(e);\n        result.error = \"Internal error\";\n      }\n\n      return result;\n    }\n  }\n});\n\n//# sourceURL=webpack:///./src/graphql/resolvers/knocker.js?");

/***/ }),

/***/ "./src/graphql/resolvers/pinball.js":
/*!******************************************!*\
  !*** ./src/graphql/resolvers/pinball.js ***!
  \******************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony default export */ __webpack_exports__[\"default\"] = ({\n  Query: {\n    machines: (_, __, {\n      dataSources\n    }) => {\n      console.log(dataSources);\n      dataSources.pinballMachineAPI.getAllMachines();\n    }\n    /* \n    allOps: (_, __, { dataSources }) =>\n      dataSources.pinballMachineAPI.getAllOperators(),\n     allRegions: (_, __, { dataSources }) =>\n      dataSources.pinballMachineAPI.getAllRegions(),\n     allLocations: (_, { region }, { dataSources }) =>\n      dataSources.pinballMachineAPI.getLocations({ region: region }),\n     getLocationsByRegion: (_, { region }, { dataSources }) =>\n      dataSources.pinballMachineAPI.getLocationsByRegion({ region: region }) */\n\n  }\n});\n\n//# sourceURL=webpack:///./src/graphql/resolvers/pinball.js?");

/***/ }),

/***/ "./src/graphql/resolvers/player.js":
/*!*****************************************!*\
  !*** ./src/graphql/resolvers/player.js ***!
  \*****************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony default export */ __webpack_exports__[\"default\"] = ({\n  Query: {\n    players: (_, __, {\n      dataSources\n    }) => dataSources.knockerDB.get(),\n    machines: (_, __, {\n      dataSources\n    }) => dataSources.pinballMachineAPI.getAllMachines()\n  },\n  Mutation: {\n    putPlayer: async (source, args, {\n      dataSources\n    }, state) => {\n      const {\n        data\n      } = args;\n      let result = {};\n\n      try {\n        console.log(dataSources);\n        await dataSources.knockerDB.put(data);\n      } catch (e) {\n        console.error(e);\n        result.error = \"Internal error\";\n      }\n\n      return result;\n    },\n    deletePlayer: async (source, args, {\n      dataSources\n    }, state) => {\n      const {\n        id\n      } = args;\n      let result = {};\n\n      try {\n        await dataSources.knockerDB.delete(id);\n      } catch (e) {\n        console.error(e);\n        result.error = \"Internal error\";\n      }\n\n      return result;\n    }\n  }\n});\n\n//# sourceURL=webpack:///./src/graphql/resolvers/player.js?");

/***/ }),

/***/ "./src/graphql/types/index.js":
/*!************************************!*\
  !*** ./src/graphql/types/index.js ***!
  \************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var merge_graphql_schemas__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! merge-graphql-schemas */ \"merge-graphql-schemas\");\n/* harmony import */ var merge_graphql_schemas__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(merge_graphql_schemas__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _machine_graphql__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./machine.graphql */ \"./src/graphql/types/machine.graphql\");\n/* harmony import */ var _machine_graphql__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_machine_graphql__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _machine_xref_graphql__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./machine-xref.graphql */ \"./src/graphql/types/machine-xref.graphql\");\n/* harmony import */ var _machine_xref_graphql__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_machine_xref_graphql__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _machine_condition_graphql__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./machine-condition.graphql */ \"./src/graphql/types/machine-condition.graphql\");\n/* harmony import */ var _machine_condition_graphql__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_machine_condition_graphql__WEBPACK_IMPORTED_MODULE_3__);\n/* harmony import */ var _region_graphql__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./region.graphql */ \"./src/graphql/types/region.graphql\");\n/* harmony import */ var _region_graphql__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_region_graphql__WEBPACK_IMPORTED_MODULE_4__);\n/* harmony import */ var _location_graphql__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./location.graphql */ \"./src/graphql/types/location.graphql\");\n/* harmony import */ var _location_graphql__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_location_graphql__WEBPACK_IMPORTED_MODULE_5__);\n/* harmony import */ var _operator_graphql__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./operator.graphql */ \"./src/graphql/types/operator.graphql\");\n/* harmony import */ var _operator_graphql__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(_operator_graphql__WEBPACK_IMPORTED_MODULE_6__);\n/* harmony import */ var _util_graphql__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./util.graphql */ \"./src/graphql/types/util.graphql\");\n/* harmony import */ var _util_graphql__WEBPACK_IMPORTED_MODULE_7___default = /*#__PURE__*/__webpack_require__.n(_util_graphql__WEBPACK_IMPORTED_MODULE_7__);\n/* harmony import */ var _player_graphql__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./player.graphql */ \"./src/graphql/types/player.graphql\");\n/* harmony import */ var _player_graphql__WEBPACK_IMPORTED_MODULE_8___default = /*#__PURE__*/__webpack_require__.n(_player_graphql__WEBPACK_IMPORTED_MODULE_8__);\n\n\n\n\n\n\n\n\n\n/* harmony default export */ __webpack_exports__[\"default\"] = (Object(merge_graphql_schemas__WEBPACK_IMPORTED_MODULE_0__[\"mergeTypes\"])([_machine_graphql__WEBPACK_IMPORTED_MODULE_1___default.a, _machine_xref_graphql__WEBPACK_IMPORTED_MODULE_2___default.a, _machine_condition_graphql__WEBPACK_IMPORTED_MODULE_3___default.a, _region_graphql__WEBPACK_IMPORTED_MODULE_4___default.a, _location_graphql__WEBPACK_IMPORTED_MODULE_5___default.a, _operator_graphql__WEBPACK_IMPORTED_MODULE_6___default.a, _util_graphql__WEBPACK_IMPORTED_MODULE_7___default.a, _player_graphql__WEBPACK_IMPORTED_MODULE_8___default.a], {\n  all: true\n}));\n\n//# sourceURL=webpack:///./src/graphql/types/index.js?");

/***/ }),

/***/ "./src/graphql/types/location.graphql":
/*!********************************************!*\
  !*** ./src/graphql/types/location.graphql ***!
  \********************************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("\n    var doc = {\"kind\":\"Document\",\"definitions\":[{\"kind\":\"ObjectTypeDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"Location\"},\"interfaces\":[],\"directives\":[],\"fields\":[{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"id\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Int\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"name\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"street\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"city\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"state\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"zip\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"phone\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"lat\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"lon\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"website\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"created_at\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"updated_at\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"zone_id\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Int\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"region_id\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Int\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"location_type_id\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Int\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"description\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"operator_id\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"date_last_updated\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"last_updated_by_user_id\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Int\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"is_stern_army\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Boolean\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"country\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"distance\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Float\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"bearing\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"num_machines\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Int\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"location_machine_xrefs\"},\"arguments\":[],\"type\":{\"kind\":\"ListType\",\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"MachineXref\"}}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"machine_names\"},\"arguments\":[],\"type\":{\"kind\":\"ListType\",\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}}},\"directives\":[]}]},{\"kind\":\"ObjectTypeDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"Query\"},\"interfaces\":[],\"directives\":[],\"fields\":[{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"locations\"},\"arguments\":[],\"type\":{\"kind\":\"NonNullType\",\"type\":{\"kind\":\"ListType\",\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Location\"}}}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"location\"},\"arguments\":[{\"kind\":\"InputValueDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"id\"},\"type\":{\"kind\":\"NonNullType\",\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}}},\"directives\":[]}],\"type\":{\"kind\":\"NonNullType\",\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Location\"}}},\"directives\":[]}]}],\"loc\":{\"start\":0,\"end\":609}};\n    doc.loc.source = {\"body\":\"type Location {\\n  id: Int\\n  name: String\\n  street: String\\n  city: String\\n  state: String\\n  zip: String\\n  phone: String\\n  lat: String\\n  lon: String\\n  website: String\\n  created_at: String\\n  updated_at: String\\n  zone_id: Int\\n  region_id: Int\\n  location_type_id: Int\\n  description: String\\n  operator_id: String\\n  date_last_updated: String\\n  last_updated_by_user_id: Int\\n  is_stern_army: Boolean\\n  country: String\\n  distance: Float\\n  bearing: String\\n  num_machines: Int\\n  location_machine_xrefs: [MachineXref]\\n  machine_names: [String]\\n}\\n\\ntype Query {\\n  locations: [Location]!\\n  location(id: String!): Location!\\n}\\n\",\"name\":\"GraphQL request\",\"locationOffset\":{\"line\":1,\"column\":1}};\n  \n\n    var names = {};\n    function unique(defs) {\n      return defs.filter(\n        function(def) {\n          if (def.kind !== 'FragmentDefinition') return true;\n          var name = def.name.value\n          if (names[name]) {\n            return false;\n          } else {\n            names[name] = true;\n            return true;\n          }\n        }\n      )\n    }\n  \n\n      module.exports = doc;\n    \n\n\n//# sourceURL=webpack:///./src/graphql/types/location.graphql?");

/***/ }),

/***/ "./src/graphql/types/machine-condition.graphql":
/*!*****************************************************!*\
  !*** ./src/graphql/types/machine-condition.graphql ***!
  \*****************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("\n    var doc = {\"kind\":\"Document\",\"definitions\":[{\"kind\":\"ObjectTypeDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"MachineCondition\"},\"interfaces\":[],\"directives\":[],\"fields\":[{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"id\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Int\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"comment\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"location_machine_xref_id\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Int\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"created_at\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"updated_at\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"user_id\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Int\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"username\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]}]}],\"loc\":{\"start\":0,\"end\":162}};\n    doc.loc.source = {\"body\":\"type MachineCondition {\\n  id: Int\\n  comment: String\\n  location_machine_xref_id: Int\\n  created_at: String\\n  updated_at: String\\n  user_id: Int\\n  username: String\\n}\\n\",\"name\":\"GraphQL request\",\"locationOffset\":{\"line\":1,\"column\":1}};\n  \n\n    var names = {};\n    function unique(defs) {\n      return defs.filter(\n        function(def) {\n          if (def.kind !== 'FragmentDefinition') return true;\n          var name = def.name.value\n          if (names[name]) {\n            return false;\n          } else {\n            names[name] = true;\n            return true;\n          }\n        }\n      )\n    }\n  \n\n      module.exports = doc;\n    \n\n\n//# sourceURL=webpack:///./src/graphql/types/machine-condition.graphql?");

/***/ }),

/***/ "./src/graphql/types/machine-xref.graphql":
/*!************************************************!*\
  !*** ./src/graphql/types/machine-xref.graphql ***!
  \************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("\n    var doc = {\"kind\":\"Document\",\"definitions\":[{\"kind\":\"ObjectTypeDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"MachineXref\"},\"interfaces\":[],\"directives\":[],\"fields\":[{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"id\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Int\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"created_at\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"updated_at\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"location_id\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Int\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"machine_id\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Int\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"condition\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"condition_date\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"user_id\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Int\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"machine_score_xrefs_count\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Int\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"last_updated_by_username\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"machine_conditions\"},\"arguments\":[],\"type\":{\"kind\":\"ListType\",\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"MachineCondition\"}}},\"directives\":[]}]},{\"kind\":\"ObjectTypeDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"Query\"},\"interfaces\":[],\"directives\":[],\"fields\":[{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"machineXrefs\"},\"arguments\":[],\"type\":{\"kind\":\"NonNullType\",\"type\":{\"kind\":\"ListType\",\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"MachineXref\"}}}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"machineXref\"},\"arguments\":[{\"kind\":\"InputValueDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"id\"},\"type\":{\"kind\":\"NonNullType\",\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}}},\"directives\":[]}],\"type\":{\"kind\":\"NonNullType\",\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"MachineXref\"}}},\"directives\":[]}]}],\"loc\":{\"start\":0,\"end\":367}};\n    doc.loc.source = {\"body\":\"type MachineXref {\\n  id: Int\\n  created_at: String\\n  updated_at: String\\n  location_id: Int\\n  machine_id: Int\\n  condition: String\\n  condition_date: String\\n  user_id: Int\\n  machine_score_xrefs_count: Int\\n  last_updated_by_username: String\\n  machine_conditions: [MachineCondition]\\n}\\n\\ntype Query {\\n  machineXrefs: [MachineXref]!\\n  machineXref(id: String!): MachineXref!\\n}\\n\",\"name\":\"GraphQL request\",\"locationOffset\":{\"line\":1,\"column\":1}};\n  \n\n    var names = {};\n    function unique(defs) {\n      return defs.filter(\n        function(def) {\n          if (def.kind !== 'FragmentDefinition') return true;\n          var name = def.name.value\n          if (names[name]) {\n            return false;\n          } else {\n            names[name] = true;\n            return true;\n          }\n        }\n      )\n    }\n  \n\n      module.exports = doc;\n    \n\n\n//# sourceURL=webpack:///./src/graphql/types/machine-xref.graphql?");

/***/ }),

/***/ "./src/graphql/types/machine.graphql":
/*!*******************************************!*\
  !*** ./src/graphql/types/machine.graphql ***!
  \*******************************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("\n    var doc = {\"kind\":\"Document\",\"definitions\":[{\"kind\":\"ObjectTypeDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"Machine\"},\"interfaces\":[],\"directives\":[],\"fields\":[{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"id\"},\"arguments\":[],\"type\":{\"kind\":\"NonNullType\",\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Int\"}}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"name\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"is_active\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"created_at\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"updated_at\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"ipdb_link\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"year\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Int\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"manufacturer\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"machine_group_id\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Int\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"ipdb_id\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Int\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"opdb_id\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]}]},{\"kind\":\"InputObjectTypeDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"MachineInput\"},\"directives\":[],\"fields\":[{\"kind\":\"InputValueDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"id\"},\"type\":{\"kind\":\"NonNullType\",\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Int\"}}},\"directives\":[]},{\"kind\":\"InputValueDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"name\"},\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"InputValueDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"is_active\"},\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"InputValueDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"created_at\"},\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"InputValueDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"updated_at\"},\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"InputValueDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"ipdb_link\"},\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"InputValueDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"year\"},\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Int\"}},\"directives\":[]},{\"kind\":\"InputValueDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"manufacturer\"},\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"InputValueDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"machine_group_id\"},\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Int\"}},\"directives\":[]},{\"kind\":\"InputValueDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"ipdb_id\"},\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Int\"}},\"directives\":[]},{\"kind\":\"InputValueDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"opdb_id\"},\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]}]},{\"kind\":\"ObjectTypeDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"Query\"},\"interfaces\":[],\"directives\":[],\"fields\":[{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"machines\"},\"arguments\":[],\"type\":{\"kind\":\"NonNullType\",\"type\":{\"kind\":\"ListType\",\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Machine\"}}}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"machineById\"},\"arguments\":[{\"kind\":\"InputValueDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"id\"},\"type\":{\"kind\":\"NonNullType\",\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}}},\"directives\":[]}],\"type\":{\"kind\":\"NonNullType\",\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Machine\"}}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"machineByName\"},\"arguments\":[{\"kind\":\"InputValueDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"name\"},\"type\":{\"kind\":\"NonNullType\",\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}}},\"directives\":[]}],\"type\":{\"kind\":\"NonNullType\",\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Machine\"}}},\"directives\":[]}]}],\"loc\":{\"start\":0,\"end\":634}};\n    doc.loc.source = {\"body\":\"#These are the canonical machine descriptions, not the location-centric ones\\ntype Machine {\\n  id: Int!\\n  name: String\\n  is_active: String\\n  created_at: String\\n  updated_at: String\\n  ipdb_link: String\\n  year: Int\\n  manufacturer: String\\n  machine_group_id: Int\\n  ipdb_id: Int\\n  opdb_id: String\\n}\\ninput MachineInput {\\n  id: Int!\\n  name: String\\n  is_active: String\\n  created_at: String\\n  updated_at: String\\n  ipdb_link: String\\n  year: Int\\n  manufacturer: String\\n  machine_group_id: Int\\n  ipdb_id: Int\\n  opdb_id: String\\n}\\n\\ntype Query {\\n  machines: [Machine]!\\n  machineById(id: String!): Machine!\\n  machineByName(name: String!): Machine!\\n}\\n\",\"name\":\"GraphQL request\",\"locationOffset\":{\"line\":1,\"column\":1}};\n  \n\n    var names = {};\n    function unique(defs) {\n      return defs.filter(\n        function(def) {\n          if (def.kind !== 'FragmentDefinition') return true;\n          var name = def.name.value\n          if (names[name]) {\n            return false;\n          } else {\n            names[name] = true;\n            return true;\n          }\n        }\n      )\n    }\n  \n\n      module.exports = doc;\n    \n\n\n//# sourceURL=webpack:///./src/graphql/types/machine.graphql?");

/***/ }),

/***/ "./src/graphql/types/operator.graphql":
/*!********************************************!*\
  !*** ./src/graphql/types/operator.graphql ***!
  \********************************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("\n    var doc = {\"kind\":\"Document\",\"definitions\":[{\"kind\":\"ObjectTypeDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"Operator\"},\"interfaces\":[],\"directives\":[],\"fields\":[{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"id\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Int\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"name\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"region_id\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Int\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"email\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"website\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"phone\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"created_at\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"updated_at\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]}]}],\"loc\":{\"start\":0,\"end\":152}};\n    doc.loc.source = {\"body\":\"type Operator {\\n  id: Int\\n  name: String\\n  region_id: Int\\n  email: String\\n  website: String\\n  phone: String\\n  created_at: String\\n  updated_at: String\\n}\\n\",\"name\":\"GraphQL request\",\"locationOffset\":{\"line\":1,\"column\":1}};\n  \n\n    var names = {};\n    function unique(defs) {\n      return defs.filter(\n        function(def) {\n          if (def.kind !== 'FragmentDefinition') return true;\n          var name = def.name.value\n          if (names[name]) {\n            return false;\n          } else {\n            names[name] = true;\n            return true;\n          }\n        }\n      )\n    }\n  \n\n      module.exports = doc;\n    \n\n\n//# sourceURL=webpack:///./src/graphql/types/operator.graphql?");

/***/ }),

/***/ "./src/graphql/types/player.graphql":
/*!******************************************!*\
  !*** ./src/graphql/types/player.graphql ***!
  \******************************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("\n    var doc = {\"kind\":\"Document\",\"definitions\":[{\"kind\":\"ObjectTypeDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"Player\"},\"interfaces\":[],\"directives\":[],\"fields\":[{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"id\"},\"arguments\":[],\"type\":{\"kind\":\"NonNullType\",\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"ID\"}}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"username\"},\"arguments\":[],\"type\":{\"kind\":\"NonNullType\",\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"name\"},\"arguments\":[],\"type\":{\"kind\":\"NonNullType\",\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"machinesPlayed\"},\"arguments\":[],\"type\":{\"kind\":\"ListType\",\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Machine\"}}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"scores\"},\"arguments\":[],\"type\":{\"kind\":\"ListType\",\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Score\"}}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"locationsVisited\"},\"arguments\":[],\"type\":{\"kind\":\"ListType\",\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Location\"}}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"email\"},\"arguments\":[],\"type\":{\"kind\":\"NonNullType\",\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}}},\"directives\":[]}]},{\"kind\":\"ObjectTypeDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"Score\"},\"interfaces\":[],\"directives\":[],\"fields\":[{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"id\"},\"arguments\":[],\"type\":{\"kind\":\"NonNullType\",\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"ID\"}}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"score\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"machine\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Machine\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"date\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]}]},{\"kind\":\"ObjectTypeDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"ScoreInput\"},\"interfaces\":[],\"directives\":[],\"fields\":[{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"id\"},\"arguments\":[],\"type\":{\"kind\":\"NonNullType\",\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"ID\"}}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"score\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"machine\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Machine\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"date\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]}]},{\"kind\":\"ObjectTypeDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"Query\"},\"interfaces\":[],\"directives\":[],\"fields\":[{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"players\"},\"arguments\":[],\"type\":{\"kind\":\"ListType\",\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Player\"}}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"player\"},\"arguments\":[{\"kind\":\"InputValueDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"id\"},\"type\":{\"kind\":\"NonNullType\",\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}}},\"directives\":[]}],\"type\":{\"kind\":\"NonNullType\",\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Player\"}}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"player\"},\"arguments\":[{\"kind\":\"InputValueDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"username\"},\"type\":{\"kind\":\"NonNullType\",\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}}},\"directives\":[]}],\"type\":{\"kind\":\"NonNullType\",\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Player\"}}},\"directives\":[]}]},{\"kind\":\"InputObjectTypeDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"PlayerInput\"},\"directives\":[],\"fields\":[{\"kind\":\"InputValueDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"username\"},\"type\":{\"kind\":\"NonNullType\",\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}}},\"directives\":[]},{\"kind\":\"InputValueDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"name\"},\"type\":{\"kind\":\"NonNullType\",\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}}},\"directives\":[]},{\"kind\":\"InputValueDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"email\"},\"type\":{\"kind\":\"NonNullType\",\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}}},\"directives\":[]}]},{\"kind\":\"ObjectTypeDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"Mutation\"},\"interfaces\":[],\"directives\":[],\"fields\":[{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"putPlayer\"},\"arguments\":[{\"kind\":\"InputValueDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"data\"},\"type\":{\"kind\":\"NonNullType\",\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"PlayerInput\"}}},\"directives\":[]}],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Result\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"deletePlayer\"},\"arguments\":[{\"kind\":\"InputValueDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"id\"},\"type\":{\"kind\":\"NonNullType\",\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}}},\"directives\":[]}],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Result\"}},\"directives\":[]}]}],\"loc\":{\"start\":0,\"end\":679}};\n    doc.loc.source = {\"body\":\"type Player {\\n  id: ID!\\n  username: String!\\n  name: String!\\n  machinesPlayed: [Machine]\\n  scores: [Score]\\n  locationsVisited: [Location]\\n  email: String!\\n}\\n\\ntype Score {\\n  id: ID!\\n  score: String\\n  machine: Machine\\n  date: String #Should be a Timestramp converted to a String\\n}\\ntype ScoreInput {\\n  id: ID!\\n  score: String\\n  machine: Machine\\n  date: String #Should be a Timestramp converted to a String\\n}\\n\\ntype Query {\\n  players: [Player]\\n  player(id: String!): Player!\\n  player(username: String!): Player!\\n}\\n\\ninput PlayerInput {\\n  username: String!\\n  name: String!\\n  email: String!\\n}\\n\\ntype Mutation {\\n  putPlayer(data: PlayerInput!): Result\\n  deletePlayer(id: String!): Result\\n}\\n\",\"name\":\"GraphQL request\",\"locationOffset\":{\"line\":1,\"column\":1}};\n  \n\n    var names = {};\n    function unique(defs) {\n      return defs.filter(\n        function(def) {\n          if (def.kind !== 'FragmentDefinition') return true;\n          var name = def.name.value\n          if (names[name]) {\n            return false;\n          } else {\n            names[name] = true;\n            return true;\n          }\n        }\n      )\n    }\n  \n\n      module.exports = doc;\n    \n\n\n//# sourceURL=webpack:///./src/graphql/types/player.graphql?");

/***/ }),

/***/ "./src/graphql/types/region.graphql":
/*!******************************************!*\
  !*** ./src/graphql/types/region.graphql ***!
  \******************************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("\n    var doc = {\"kind\":\"Document\",\"definitions\":[{\"kind\":\"ObjectTypeDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"Region\"},\"interfaces\":[],\"directives\":[],\"fields\":[{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"id\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Int\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"name\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"created_at\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"updated_at\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"full_name\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"motd\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"lat\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"lon\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"state\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"effective_radius\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Float\"}},\"directives\":[]}]}],\"loc\":{\"start\":0,\"end\":188}};\n    doc.loc.source = {\"body\":\"type Region {\\n  id: Int\\n  name: String\\n  created_at: String\\n  updated_at: String\\n  full_name: String\\n  motd: String\\n  lat: String\\n  lon: String\\n  state: String\\n  effective_radius: Float\\n}\\n\",\"name\":\"GraphQL request\",\"locationOffset\":{\"line\":1,\"column\":1}};\n  \n\n    var names = {};\n    function unique(defs) {\n      return defs.filter(\n        function(def) {\n          if (def.kind !== 'FragmentDefinition') return true;\n          var name = def.name.value\n          if (names[name]) {\n            return false;\n          } else {\n            names[name] = true;\n            return true;\n          }\n        }\n      )\n    }\n  \n\n      module.exports = doc;\n    \n\n\n//# sourceURL=webpack:///./src/graphql/types/region.graphql?");

/***/ }),

/***/ "./src/graphql/types/util.graphql":
/*!****************************************!*\
  !*** ./src/graphql/types/util.graphql ***!
  \****************************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("\n    var doc = {\"kind\":\"Document\",\"definitions\":[{\"kind\":\"ObjectTypeDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"Result\"},\"interfaces\":[],\"directives\":[],\"fields\":[{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"error\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]}]}],\"loc\":{\"start\":0,\"end\":32}};\n    doc.loc.source = {\"body\":\"type Result {\\n  error: String\\n}\\n\",\"name\":\"GraphQL request\",\"locationOffset\":{\"line\":1,\"column\":1}};\n  \n\n    var names = {};\n    function unique(defs) {\n      return defs.filter(\n        function(def) {\n          if (def.kind !== 'FragmentDefinition') return true;\n          var name = def.name.value\n          if (names[name]) {\n            return false;\n          } else {\n            names[name] = true;\n            return true;\n          }\n        }\n      )\n    }\n  \n\n      module.exports = doc;\n    \n\n\n//# sourceURL=webpack:///./src/graphql/types/util.graphql?");

/***/ }),

/***/ "./src/handler.js":
/*!************************!*\
  !*** ./src/handler.js ***!
  \************************/
/*! exports provided: main */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _index_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./index.js */ \"./src/index.js\");\n/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, \"main\", function() { return _index_js__WEBPACK_IMPORTED_MODULE_0__[\"default\"]; });\n\n\n\n//# sourceURL=webpack:///./src/handler.js?");

/***/ }),

/***/ "./src/index.js":
/*!**********************!*\
  !*** ./src/index.js ***!
  \**********************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var apollo_server_lambda__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! apollo-server-lambda */ \"apollo-server-lambda\");\n/* harmony import */ var apollo_server_lambda__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(apollo_server_lambda__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _graphql_resolvers__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./graphql/resolvers */ \"./src/graphql/resolvers/index.js\");\n/* harmony import */ var _graphql_types__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./graphql/types */ \"./src/graphql/types/index.js\");\n/* harmony import */ var _graphql_data_sources_pinball__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./graphql/data-sources/pinball */ \"./src/graphql/data-sources/pinball.js\");\n/* harmony import */ var _graphql_data_sources_knocker_db__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./graphql/data-sources/knocker-db */ \"./src/graphql/data-sources/knocker-db.js\");\n\n\n\n\n // set up any dataSources our resolvers need\n\nconst dataSources = () => ({\n  pinballMachineAPI: new _graphql_data_sources_pinball__WEBPACK_IMPORTED_MODULE_3__[\"PinballMachineAPI\"](),\n  knockerDB: new _graphql_data_sources_knocker_db__WEBPACK_IMPORTED_MODULE_4__[\"default\"]()\n}); // Set up Apollo Server\n\n\nconst server = new apollo_server_lambda__WEBPACK_IMPORTED_MODULE_0__[\"ApolloServer\"]({\n  typeDefs: _graphql_types__WEBPACK_IMPORTED_MODULE_2__[\"default\"],\n  resolvers: _graphql_resolvers__WEBPACK_IMPORTED_MODULE_1__[\"default\"],\n  dataSources,\n  introspection: true,\n  playground: true\n});\nconst handler = server.createHandler({\n  cors: {\n    origin: \"*\",\n    credentials: true\n  }\n});\n/* const handler = (event, context, callback) => {\n  // tell AWS lambda we do not want to wait for NodeJS event loop\n  // to be empty in order to send the response\n  context.callbackWaitsForEmptyEventLoop = false;\n\n  // process the request\n  return handler(event, context, callback);\n}; */\n\n/* harmony default export */ __webpack_exports__[\"default\"] = (handler);\n\n//# sourceURL=webpack:///./src/index.js?");

/***/ }),

/***/ "apollo-datasource-rest":
/*!*****************************************!*\
  !*** external "apollo-datasource-rest" ***!
  \*****************************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("module.exports = require(\"apollo-datasource-rest\");\n\n//# sourceURL=webpack:///external_%22apollo-datasource-rest%22?");

/***/ }),

/***/ "apollo-server-lambda":
/*!***************************************!*\
  !*** external "apollo-server-lambda" ***!
  \***************************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("module.exports = require(\"apollo-server-lambda\");\n\n//# sourceURL=webpack:///external_%22apollo-server-lambda%22?");

/***/ }),

/***/ "aws-sdk":
/*!**************************!*\
  !*** external "aws-sdk" ***!
  \**************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("module.exports = require(\"aws-sdk\");\n\n//# sourceURL=webpack:///external_%22aws-sdk%22?");

/***/ }),

/***/ "crypto-random-string":
/*!***************************************!*\
  !*** external "crypto-random-string" ***!
  \***************************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("module.exports = require(\"crypto-random-string\");\n\n//# sourceURL=webpack:///external_%22crypto-random-string%22?");

/***/ }),

/***/ "graphql-merge-resolvers":
/*!******************************************!*\
  !*** external "graphql-merge-resolvers" ***!
  \******************************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("module.exports = require(\"graphql-merge-resolvers\");\n\n//# sourceURL=webpack:///external_%22graphql-merge-resolvers%22?");

/***/ }),

/***/ "merge-graphql-schemas":
/*!****************************************!*\
  !*** external "merge-graphql-schemas" ***!
  \****************************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("module.exports = require(\"merge-graphql-schemas\");\n\n//# sourceURL=webpack:///external_%22merge-graphql-schemas%22?");

/***/ })

/******/ })));