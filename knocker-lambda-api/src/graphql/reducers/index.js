const ROLES = require("../index");
const references = require("../../graphql");

/**
 * Converts records into users
 *
 * @param {*} data
 */
userReducer = (data) => {
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
          locationMachineXrefId: +element.SK.split("FAVORITE#MACHINE#")[1],
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

roleReducer = (role) => {
  return { username: role.Data, dateAdded: role.Date };
};

friendReducer = (friend) => {
  return {
    username: friend.Username,
    uid: friend.Uid,
    dateAdded: friend.DateAdded,
  };
};

machineReducer = (pin) => {
  return {
    id: pin.id,
    name: pin.name,
    is_active: pin.is_active,
    created_at: pin.created_at,
    updated_at: pin.updated_at,
    ipdb_link: pin.ipdb_link,
    year: pin.year,
    manufacturer: pin.manufacturer,
    machine_group_id: pin.machine_group_id,
    ipdb_id: pin.ipdb_id,
    opdb_id: pin.opdb_id,
  };
};

favoriteGame = (game) => {
  return {
    gameId: game.split("FAVORITE#GAME#")[1],
    dateAdded: element.Date,
  };
};

machineXrefsReducer = (machineXref) => {
  machineConditions = [];
  machineXref.machine_conditions.forEach((machineCondition) =>
    machineConditions.push(this.machineConditionsReducer(machineCondition))
  );
  console.log(machineConditions);
  return {
    id: machineXref.id,
    created_at: machineXref.created_at,
    updated_at: machineXref.updated_at,
    location_id: machineXref.location_id,
    machine_id: machineXref.machine_id,
    condition: machineXref.condition,
    condition_date: machineXref.condition_date,
    ip: machineXref.ip,
    user_id: machineXref.user_id,
    machine_score_xrefs_count: machineXref.machine_score_xrefs_count,
    location: this.locationReducer(machineXref.location),
    machine: this.machineReducer(machineXref.machine),
    machine_conditions: machineConditions,
  };
};

machineConditionsReducer = (machineCondition) => {
  return {
    id: machineCondition.id,
    comment: machineCondition.comment,
    location_machine_xref_Id: machineCondition.location_machine_xref_id,
    created_at: machineCondition.created_at,
    updated_at: machineCondition.updated_at,
  };
};

regionReducer = (reg) => {
  return {
    id: reg.id,
    name: reg.name,
    created_at: reg.created_at,
    updated_at: reg.updated_at,
    full_name: reg.full_name,
    motd: reg.motd,
    lat: reg.lat,
    lon: reg.lon,
    state: reg.state,
    effective_radius: reg.effective_radius,
  };
};

locationReducer = (loc) => {
  return {
    id: loc.id,
    name: loc.name,
    street: loc.street,
    city: loc.city,
    state: loc.state,
    zip: loc.zip,
    phone: loc.phone,
    lat: loc.lat,
    lon: loc.lon,
    website: loc.website,
    created_at: loc.created_at,
    updated_at: loc.updated_at,
    zone_id: loc.zone_id,
    region_id: loc.region_id,
    location_type_id: loc.location_type_id,
    description: loc.description,
    operator_id: loc.operator_id,
    date_last_updated: loc.date_last_updated,
    last_updated_by_user_id: loc.last_updated_by_user_id,
    is_stern_army: loc.is_stern_army,
    country: loc.country,
    num_machines: loc.num_machines,
    location_machine_xrefs: loc.location_machine_xrefs,
  };
};

knockerScoreReducer = (score) => {
  console.log("Score Reducer", score);
  return {
    username: score.Data,
    score: score.Score,
    pinId: score.PinId,
    locationId: score.LocationId,
    locationMachineXrefId: score.LocationMachineXrefId,
    date: score.Date,
    s3RefId: score.S3RefId,
    isVerified: score.IsVerified,
  };
};

pinballAPIScoreReducer = (hs) => {
  return {
    id: hs.id,
    locationMachineXrefId: hs.location_machine_xref_id,
    score: hs.score,
    createdAt: hs.created_at,
    updatedAt: hs.updated_at,
    userId: hs.user_id,
    username: hs.username,
  };
};

operatorReducer = (op) => {
  return {
    id: op.id,
    name: op.name,
    region_id: op.region_id,
    email: op.email,
    website: op.website,
    phone: op.phone,
    created_at: op.created_at,
    updated_at: op.updated_at,
  };
};

visitedLocationReducer = (vl) => {
  console.log("Visited Location", vl);

  return {
    locationId: vl.SK.split("#")[1],
    dateVisted: vl.Data,
  };
};

playedMachinesReducer = (pm) => {
  return {
    locationMachineXrefId: pm.SK.split("#")[1],
    datePlayed: pm.Date,
  };
};

exports.userReducer = userReducer;
exports.roleReducer = roleReducer;
exports.friendReducer = friendReducer;
exports.machineReducer = machineReducer;
exports.favoriteGame = favoriteGame;
exports.machineXrefsReducer = machineXrefsReducer;
exports.machineConditionsReducer = machineConditionsReducer;
exports.regionReducer = regionReducer;
exports.locationReducer = locationReducer;
exports.knockerScoreReducer = knockerScoreReducer;
exports.pinballAPIScoreReducer = pinballAPIScoreReducer;
exports.operatorReducer = operatorReducer;
exports.visitedLocationReducer = visitedLocationReducer;
exports.playedMachinesReducer = playedMachinesReducer;
