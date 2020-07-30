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
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/functions/user-confirm.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/functions/user-confirm.js":
/*!***************************************!*\
  !*** ./src/functions/user-confirm.js ***!
  \***************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\n\nconst AWS = __webpack_require__(/*! aws-sdk */ \"aws-sdk\");\n\nconst Joi = __webpack_require__(/*! joi */ \"joi\");\n\nconst {\n  v4\n} = __webpack_require__(/*! uuid */ \"uuid\");\n\nconst dynamoDb = new AWS.DynamoDB.DocumentClient();\nconst dbParams = {\n  TableName: process.env.KNOCKER_TABLE,\n  ProjectionExpression: \"id, email,  name, scores, usernames\"\n};\nconst postSchema = Joi.object({\n  id: Joi.number().required(),\n  username: Joi.string().required(),\n  email: Joi.string().required(),\n  name: Joi.string().required()\n});\n/**\nSample Post Confirmation Payload \n\n2020-07-03T20:02:03.294Z\t87bb6d1c-6baf-4925-9712-76cfff1235ad\tINFO\t{\n  version: '1',\n  region: 'us-east-1',\n  userPoolId: 'us-east-1_95kfEXpVN',\n  userName: 'tymg',\n  callerContext: { awsSdkVersion: 'aws-sdk-unknown-unknown', clientId: null },\n  triggerSource: 'PostConfirmation_ConfirmSignUp',\n  request: {\n    userAttributes: {\n      sub: '22ef8af6-8c9a-4505-8506-e5f20a97a887',\n      'cognito:user_status': 'CONFIRMED',\n      email_verified: 'false',\n      name: 'Jane',\n      email: 'verde.mateo.a@gmail.com'\n    }\n  },\n  response: {}\n}\n\n **/\n\nmodule.exports.main = (event, context, callback) => {\n  //console.log(\"EVENT: \", event);\n  //console.log(\"Username: \", event.userName);\n  //const requestBody = JSON.parse(event.body);\n  ////console.log(requestBody);\n  //event.request.userAttributes.email\n  const id = event.request.userAttributes.sub;\n  const username = event.userName;\n  const email = event.request.userAttributes.email;\n  const name = event.request.userAttributes.name; //const { error } = postSchema.validate(requestBody);\n\n  /*  //console.log(error);\n  if (error) return callback(error); */\n\n  addUser(createUser(id, username, email, name), (err, res) => {\n    if (err) return callback(err); //console.log(\"Succesful Player Creation:\", username);\n\n    callback(null, event);\n  });\n};\n\nconst addUser = (user, callback) => {\n  const userData = {\n    TableName: process.env.KNOCKER_TABLE,\n    Item: user\n  };\n  return dynamoDb.put(userData, callback);\n};\n\nconst createUser = (id, username, email, name) => {\n  const timestamp = new Date().getTime();\n  return {\n    id: v4(),\n    createdAt: timestamp,\n    id,\n    username,\n    email,\n    name,\n    locationsVisited: [],\n    machinesPlayed: [],\n    scores: []\n  };\n};\n\nconst makeSuccessResponse = data => ({\n  statusCode: 200,\n  body: JSON.stringify({\n    data\n  })\n});\n\n//# sourceURL=webpack:///./src/functions/user-confirm.js?");

/***/ }),

/***/ "aws-sdk":
/*!**************************!*\
  !*** external "aws-sdk" ***!
  \**************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("module.exports = require(\"aws-sdk\");\n\n//# sourceURL=webpack:///external_%22aws-sdk%22?");

/***/ }),

/***/ "joi":
/*!**********************!*\
  !*** external "joi" ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("module.exports = require(\"joi\");\n\n//# sourceURL=webpack:///external_%22joi%22?");

/***/ }),

/***/ "uuid":
/*!***********************!*\
  !*** external "uuid" ***!
  \***********************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("module.exports = require(\"uuid\");\n\n//# sourceURL=webpack:///external_%22uuid%22?");

/***/ })

/******/ })));