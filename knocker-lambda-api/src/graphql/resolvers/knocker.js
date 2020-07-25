const { v4 } = require("uuid");

/**
 *
 *
 * Queries
 * ------- User ---------
 * - getUserById
 *   - In the GQL the user can specify: Favorite Games, IN
 * - getUserByUsername
 * - getAllUsers
 * - getPermissionsById
 * - getUsersByPermissions
 *
 * ------ Scores --------
 * - getScoresByGameId
 * - getScoresByXrefId
 *
 * ------- Dates --------
 * - getEventsByDate
 *
 * ----- Favorites ------
 * - getFavoritedMachinesByPinId
 * - getFavoritedGamesByGameId
 *
 * ------ Machines ------
 * - getPinsPlayedByXref
 */

/**
 *
 * Writes
 * ------- User ---------
 * - createUser
 * - addUserPermission
 * - addFavoriteGame
 * - addFavoriteMachine
 * - addFriend(s)
 * - addPlayedMachine
 *
 * ------ Scores --------
 * - addScore
 *
 */
export default {
  Query: {
    players: (_, __, { dataSources }) => dataSources.knockerDB.get(),
    machines: (_, __, { dataSources }) =>
      dataSources.pinballMachineAPI.getAllMachines(),
    locations: (_, { region }, { dataSources }) =>
      dataSources.pinballMachineAPI.getLocations({ region: region }),
    locationsByRegion: (_, { region }, { dataSources }) =>
      dataSources.pinballMachineAPI.getLocationsByRegion({ region: region }),
    regions: (_, __, { dataSources }) =>
      dataSources.pinballMachineAPI.getAllRegions(),
    /* 
    allOps: (_, __, { dataSources }) =>
      dataSources.pinballMachineAPI.getAllOperators(),

    allRegions: (_, __, { dataSources }) =>
      dataSources.pinballMachineAPI.getAllRegions(),

    allLocations: (_, { region }, { dataSources }) =>
      dataSources.pinballMachineAPI.getLocations({ region: region }),

    getLocationsByRegion: (_, { region }, { dataSources }) =>
      dataSources.pinballMachineAPI.getLocationsByRegion({ region: region }) */
  },
  Mutation: {
    putPlayer: async (source, args, { dataSources }, state) => {
      const { data } = args;

      let result = {};
      try {
        //console.log(dataSources);
        result = await dataSources.knockerDB.put(data);
      } catch (e) {
        console.error(e);
        result.error = "Internal error";
      }

      return result;
    },
    /**
     * 
     * 
     *   id: '2',
  machineId: 642,
  machineName: 'Medieval Madness',
  locationId: 10426 }
     */
    addScore: async (source, args, { dataSources }, state) => {
      const { data } = args;
      //console.log("args:", args);
      let result = {};
      try {
        //console.log(dataSources);
        result = await dataSources.knockerDB.createScore(
          args.data,
          args.userId
        );
      } catch (e) {
        console.error(e);
        result.error = "Internal error";
      }
      //console.log("addScore() - result", result);
      return result;
    },
    addScores: async (source, args, { dataSources }, state) => {
      const { data } = args;
      let result = {};
      try {
        //console.log(dataSources);
        result = await args.data.map((score) => {
          //console.log(score);
          dataSources.knockerDB.createScore(score, args.userId);
        });
      } catch (e) {
        console.error(e);
        result.error = "Internal error";
      }
      //console.log("addScores() - result", args.data);
      return args.data;
    },
    addPlayedMachine: async (source, args, { dataSources }, state) => {
      const { data } = args;
      let result = {};
      try {
        //console.log(dataSources);
        result = await dataSources.knockerDB.createMachinePlayed(
          args.data,
          args.userId
        );
      } catch (e) {
        console.error(e);
        result.error = "Internal error";
      }
      //console.log("addScore() - result", result);
      return result;
    },
    addPlayedMachines: async (source, args, { dataSources }, state) => {},
    addLocationVisited: async (source, args, { dataSources }, state) => {},
    addLocationsVisited: async (source, args, { dataSources }, state) => {},
    deletePlayer: async (source, args, { dataSources }, state) => {
      const { id } = args;

      let result = {};
      try {
        await dataSources.knockerDB.delete(id);
      } catch (e) {
        console.error(e);
        result.error = "Internal error";
      }

      return result;
    },
  },
};
