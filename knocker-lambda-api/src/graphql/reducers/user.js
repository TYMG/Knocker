const ROLES = require("../index");
const references = require("../../graphql");

/**
 * Converts records into users
 *
 * @param {*} data
 */
reduce = (data) => {
  const items = data.Items;
  var user = {};
  items.forEach((element) => {
    if (element.SK.startsWith("USER")) {
      user.username = element.Data;
      user.name = element.Name;
      user.location = element.Location;
      user.email = element.Email;
      user.id = element.PK;
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
            locationMachineXrefId: +element.SK.split("#")[1],
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
    } else if (element.SK.startsWith("SCORE")) {
      if (user.scores === undefined) {
        user.scores = [];
      }
      user.scores = [
        ...user.scores,
        {
          score: element.Score,
          locationId: element.LocationId,
          locationMachineXrefId: element.LocationMachineXrefId,
          pinId: element.PinId,
          date: element.Date,
          s3RefId: element.S3RefId,
          isVerified: element.IsVerified,
        },
      ];
    } else if (references.ROLES.find((role) => role === element.SK)) {
      if (user.roles === undefined) {
        user.roles = [];
      }
      user.roles = [
        ...user.roles,
        { role: element.SK, dateAdded: element.Date },
      ];
    } else {
    }
  });
  console.log("Built User:", user);
  return user;
};

roleReducer = (data) => {
  const items = data.Items;
  var roleUsers = [];
  items.forEach((item) => {
    roleUsers = [...roleUsers, { username: item.Data, dateAdded: item.Date }];
  });
  console.log(roleUsers);
  return roleUsers;
};

exports.reduce = reduce;
exports.roleReducer = roleReducer;
