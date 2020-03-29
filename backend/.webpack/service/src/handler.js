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
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var merge_graphql_schemas__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! merge-graphql-schemas */ \"merge-graphql-schemas\");\n/* harmony import */ var merge_graphql_schemas__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(merge_graphql_schemas__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _pinball__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./pinball */ \"./src/graphql/resolvers/pinball.js\");\n\n\n/* import machineResolver from \"./machine\";\nimport machineXrefResolver from \"./machine-xref\";\nimport machineConditionResolver from \"./machine-condition\";\nimport regionResolver from \"./region\";\nimport locationResolver from \"./location\";\nimport operatorResolver from \"./opera\"; */\n\nconst resolvers = [_pinball__WEBPACK_IMPORTED_MODULE_1__[\"default\"]\n/* machineResolver,\nmachineXrefResolver,\nmachineConditionResolver,\nregionResolver,\nlocationResolver,\noperatorResolver */\n];\n/* harmony default export */ __webpack_exports__[\"default\"] = (Object(merge_graphql_schemas__WEBPACK_IMPORTED_MODULE_0__[\"mergeResolvers\"])(resolvers));\n\n//# sourceURL=webpack:///./src/graphql/resolvers/index.js?");

/***/ }),

/***/ "./src/graphql/resolvers/pinball.js":
/*!******************************************!*\
  !*** ./src/graphql/resolvers/pinball.js ***!
  \******************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony default export */ __webpack_exports__[\"default\"] = ({\n  Query: {\n    machines: (_, __, {\n      dataSources\n    }) => dataSources.pinballMachineAPI.getAllMachines()\n    /* \n    allOps: (_, __, { dataSources }) =>\n      dataSources.pinballMachineAPI.getAllOperators(),\n     allRegions: (_, __, { dataSources }) =>\n      dataSources.pinballMachineAPI.getAllRegions(),\n     allLocations: (_, { region }, { dataSources }) =>\n      dataSources.pinballMachineAPI.getLocations({ region: region }),\n     getLocationsByRegion: (_, { region }, { dataSources }) =>\n      dataSources.pinballMachineAPI.getLocationsByRegion({ region: region }) */\n\n  }\n});\n\n//# sourceURL=webpack:///./src/graphql/resolvers/pinball.js?");

/***/ }),

/***/ "./src/graphql/types/index.js":
/*!************************************!*\
  !*** ./src/graphql/types/index.js ***!
  \************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var merge_graphql_schemas__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! merge-graphql-schemas */ \"merge-graphql-schemas\");\n/* harmony import */ var merge_graphql_schemas__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(merge_graphql_schemas__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _machine_graphql__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./machine.graphql */ \"./src/graphql/types/machine.graphql\");\n/* harmony import */ var _machine_graphql__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_machine_graphql__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _machine_xref_graphql__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./machine-xref.graphql */ \"./src/graphql/types/machine-xref.graphql\");\n/* harmony import */ var _machine_xref_graphql__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_machine_xref_graphql__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _machine_condition_graphql__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./machine-condition.graphql */ \"./src/graphql/types/machine-condition.graphql\");\n/* harmony import */ var _machine_condition_graphql__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_machine_condition_graphql__WEBPACK_IMPORTED_MODULE_3__);\n/* harmony import */ var _region_graphql__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./region.graphql */ \"./src/graphql/types/region.graphql\");\n/* harmony import */ var _region_graphql__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_region_graphql__WEBPACK_IMPORTED_MODULE_4__);\n/* harmony import */ var _location_graphql__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./location.graphql */ \"./src/graphql/types/location.graphql\");\n/* harmony import */ var _location_graphql__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_location_graphql__WEBPACK_IMPORTED_MODULE_5__);\n/* harmony import */ var _operator_graphql__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./operator.graphql */ \"./src/graphql/types/operator.graphql\");\n/* harmony import */ var _operator_graphql__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(_operator_graphql__WEBPACK_IMPORTED_MODULE_6__);\n\n\n\n\n\n\n\n/* harmony default export */ __webpack_exports__[\"default\"] = (Object(merge_graphql_schemas__WEBPACK_IMPORTED_MODULE_0__[\"mergeTypes\"])([_machine_graphql__WEBPACK_IMPORTED_MODULE_1___default.a, _machine_xref_graphql__WEBPACK_IMPORTED_MODULE_2___default.a, _machine_condition_graphql__WEBPACK_IMPORTED_MODULE_3___default.a, _region_graphql__WEBPACK_IMPORTED_MODULE_4___default.a, _location_graphql__WEBPACK_IMPORTED_MODULE_5___default.a, _operator_graphql__WEBPACK_IMPORTED_MODULE_6___default.a], {\n  all: true\n}));\n\n//# sourceURL=webpack:///./src/graphql/types/index.js?");

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

eval("\n    var doc = {\"kind\":\"Document\",\"definitions\":[{\"kind\":\"ObjectTypeDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"Machine\"},\"interfaces\":[],\"directives\":[],\"fields\":[{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"id\"},\"arguments\":[],\"type\":{\"kind\":\"NonNullType\",\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Int\"}}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"name\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"is_active\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"created_at\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"updated_at\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"ipdb_link\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"year\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Int\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"manufacturer\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"machine_group_id\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Int\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"ipdb_id\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Int\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"opdb_id\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]}]},{\"kind\":\"ObjectTypeDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"Query\"},\"interfaces\":[],\"directives\":[],\"fields\":[{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"machines\"},\"arguments\":[],\"type\":{\"kind\":\"NonNullType\",\"type\":{\"kind\":\"ListType\",\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Machine\"}}}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"machine\"},\"arguments\":[{\"kind\":\"InputValueDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"id\"},\"type\":{\"kind\":\"NonNullType\",\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}}},\"directives\":[]}],\"type\":{\"kind\":\"NonNullType\",\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Machine\"}}},\"directives\":[]}]}],\"loc\":{\"start\":0,\"end\":366}};\n    doc.loc.source = {\"body\":\"#These are the canonical machine descriptions, not the location-centric ones\\ntype Machine {\\n  id: Int!\\n  name: String\\n  is_active: String\\n  created_at: String\\n  updated_at: String\\n  ipdb_link: String\\n  year: Int\\n  manufacturer: String\\n  machine_group_id: Int\\n  ipdb_id: Int\\n  opdb_id: String\\n}\\n\\ntype Query {\\n  machines: [Machine]!\\n  machine(id: String!): Machine!\\n}\\n\",\"name\":\"GraphQL request\",\"locationOffset\":{\"line\":1,\"column\":1}};\n  \n\n    var names = {};\n    function unique(defs) {\n      return defs.filter(\n        function(def) {\n          if (def.kind !== 'FragmentDefinition') return true;\n          var name = def.name.value\n          if (names[name]) {\n            return false;\n          } else {\n            names[name] = true;\n            return true;\n          }\n        }\n      )\n    }\n  \n\n      module.exports = doc;\n    \n\n\n//# sourceURL=webpack:///./src/graphql/types/machine.graphql?");

/***/ }),

/***/ "./src/graphql/types/operator.graphql":
/*!********************************************!*\
  !*** ./src/graphql/types/operator.graphql ***!
  \********************************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("\n    var doc = {\"kind\":\"Document\",\"definitions\":[{\"kind\":\"ObjectTypeDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"Operator\"},\"interfaces\":[],\"directives\":[],\"fields\":[{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"id\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Int\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"name\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"region_id\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Int\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"email\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"website\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"phone\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"created_at\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"updated_at\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]}]}],\"loc\":{\"start\":0,\"end\":152}};\n    doc.loc.source = {\"body\":\"type Operator {\\n  id: Int\\n  name: String\\n  region_id: Int\\n  email: String\\n  website: String\\n  phone: String\\n  created_at: String\\n  updated_at: String\\n}\\n\",\"name\":\"GraphQL request\",\"locationOffset\":{\"line\":1,\"column\":1}};\n  \n\n    var names = {};\n    function unique(defs) {\n      return defs.filter(\n        function(def) {\n          if (def.kind !== 'FragmentDefinition') return true;\n          var name = def.name.value\n          if (names[name]) {\n            return false;\n          } else {\n            names[name] = true;\n            return true;\n          }\n        }\n      )\n    }\n  \n\n      module.exports = doc;\n    \n\n\n//# sourceURL=webpack:///./src/graphql/types/operator.graphql?");

/***/ }),

/***/ "./src/graphql/types/region.graphql":
/*!******************************************!*\
  !*** ./src/graphql/types/region.graphql ***!
  \******************************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("\n    var doc = {\"kind\":\"Document\",\"definitions\":[{\"kind\":\"ObjectTypeDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"Region\"},\"interfaces\":[],\"directives\":[],\"fields\":[{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"id\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Int\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"name\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"created_at\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"updated_at\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"full_name\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"motd\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"lat\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"lon\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"state\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"String\"}},\"directives\":[]},{\"kind\":\"FieldDefinition\",\"name\":{\"kind\":\"Name\",\"value\":\"effective_radius\"},\"arguments\":[],\"type\":{\"kind\":\"NamedType\",\"name\":{\"kind\":\"Name\",\"value\":\"Float\"}},\"directives\":[]}]}],\"loc\":{\"start\":0,\"end\":188}};\n    doc.loc.source = {\"body\":\"type Region {\\n  id: Int\\n  name: String\\n  created_at: String\\n  updated_at: String\\n  full_name: String\\n  motd: String\\n  lat: String\\n  lon: String\\n  state: String\\n  effective_radius: Float\\n}\\n\",\"name\":\"GraphQL request\",\"locationOffset\":{\"line\":1,\"column\":1}};\n  \n\n    var names = {};\n    function unique(defs) {\n      return defs.filter(\n        function(def) {\n          if (def.kind !== 'FragmentDefinition') return true;\n          var name = def.name.value\n          if (names[name]) {\n            return false;\n          } else {\n            names[name] = true;\n            return true;\n          }\n        }\n      )\n    }\n  \n\n      module.exports = doc;\n    \n\n\n//# sourceURL=webpack:///./src/graphql/types/region.graphql?");

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
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var apollo_server_lambda__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! apollo-server-lambda */ \"apollo-server-lambda\");\n/* harmony import */ var apollo_server_lambda__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(apollo_server_lambda__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _graphql_resolvers__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./graphql/resolvers */ \"./src/graphql/resolvers/index.js\");\n/* harmony import */ var _graphql_types__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./graphql/types */ \"./src/graphql/types/index.js\");\n/* harmony import */ var _graphql_data_sources_pinball__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./graphql/data-sources/pinball */ \"./src/graphql/data-sources/pinball.js\");\n\n\n\n // set up any dataSources our resolvers need\n\nconst dataSources = () => ({\n  pinballMachineAPI: new _graphql_data_sources_pinball__WEBPACK_IMPORTED_MODULE_3__[\"PinballMachineAPI\"]()\n}); // Set up Apollo Server\n\n\nconst server = new apollo_server_lambda__WEBPACK_IMPORTED_MODULE_0__[\"ApolloServer\"]({\n  typeDefs: _graphql_types__WEBPACK_IMPORTED_MODULE_2__[\"default\"],\n  resolvers: _graphql_resolvers__WEBPACK_IMPORTED_MODULE_1__[\"default\"],\n  dataSources,\n  introspection: true,\n  playground: true\n});\nconst handler = server.createHandler({\n  cors: {\n    origin: \"*\",\n    credentials: true\n  }\n});\n/* const handler = (event, context, callback) => {\n\n  // tell AWS lambda we do not want to wait for NodeJS event loop\n  // to be empty in order to send the response\n  context.callbackWaitsForEmptyEventLoop = false;\n\n  // process the request\n  return handler(event, context, callback);\n}; */\n\n/* harmony default export */ __webpack_exports__[\"default\"] = (handler);\n\n//# sourceURL=webpack:///./src/index.js?");

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

/***/ "merge-graphql-schemas":
/*!****************************************!*\
  !*** external "merge-graphql-schemas" ***!
  \****************************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("module.exports = require(\"merge-graphql-schemas\");\n\n//# sourceURL=webpack:///external_%22merge-graphql-schemas%22?");

/***/ })

/******/ })));