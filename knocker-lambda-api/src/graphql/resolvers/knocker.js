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
 * - getRolesById
 * - getUsersByRoles
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
    /**
     *
     * KnockerDB
     *
     */
    // ------- User ---------
    users: (_, __, { dataSources }) => dataSources.knockerDB.get(),
    userById: async (source, { id }, { dataSources }, state) =>
      dataSources.knockerDB.getUserById(id),
    userByUsername: async (source, { username }, { dataSources }, state) =>
      dataSources.knockerDB.getUserByUsername(username),
    usersByRoles: async (source, { role }, { dataSources }, state) =>
      dataSources.knockerDB.getUsersByRole(role),
    knockerScoresByGameId: async (source, { gameId }, { dataSources }, state) =>
      dataSources.knockerDB.getScoresByGameId(gameId),
    knockerScoresByXrefId: async (
      source,
      { locMachId },
      { dataSources },
      state
    ) =>
      dataSources.knockerDB.getKnockerScoresByLocationMachineId({
        locMachId: locMachId,
      }),
    pmScoresByXrefId: async (source, { locMachId }, { dataSources }, state) =>
      dataSources.pinballMachineAPI.getPMScoresByLocationMachineId(locMachId),
    // ------- Dates --------

    /* eventsByDate: async (source, { date }, { dataSources }, state) =>
      dataSources.knockerDB.getEventsByDate({ date: date }),
 */
    /**
     *
     *
     * PinballAPI
     *
     */
    machines: (_, __, { dataSources }) =>
      dataSources.pinballMachineAPI.getAllMachines(),
    /* getAllHighScoresForARegion: (_, __, { dataSources }) =>
      dataSources.pinballMachineAPI.getAllMachines(), */

    locations: (_, { region }, { dataSources }) =>
      dataSources.pinballMachineAPI.getLocations({ region: region }),
    locationsByRegion: (_, { region }, { dataSources }) =>
      dataSources.pinballMachineAPI.getLocationsByRegion({ region: region }),
    regions: (_, { region }, { dataSources }) =>
      dataSources.pinballMachineAPI.getAllRegions(),
    machineXrefs: (_, { region }, { dataSources }) =>
      dataSources.pinballMachineAPI.getMachineXrefByRegion({ region: region }),
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
    deleteUser: async (source, args, { dataSources }, state) => {
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
    /**
     *
     * Add a User Permission
     *
     */
    addRole: async (source, args, { dataSources }, state) => {
      try {
        //console.log(dataSources);
        result = await dataSources.knockerDB.addRole(
          args.role,
          args.username,
          args.userId
        );
      } catch (e) {
        console.error(e);
        result.error = "Internal error";
      }
      //console.log("addScore() - result", result);
      return result;
    },
    /***
     * Add a recorded score
     *
     * @param {}
     *
     *
     */
    addScore: async (source, args, { dataSources }, state) => {
      const { data } = args;
      //console.log("args:", args);
      let result = {};
      try {
        //console.log(dataSources);
        result = await dataSources.knockerDB.createScore(
          args.data.score,
          args.data.gameId,
          args.data.locationId,
          args.data.locationMachineXrefId,
          args.username,
          args.userId
        );
      } catch (e) {
        console.error(e);
        result.error = "Internal error";
      }
      //console.log("addScore() - result", result);
      return result;
    },

    addFriend: async (source, args, { dataSources }, state) => {
      let result = {};
      try {
        //console.log(dataSources);
        result = await dataSources.knockerDB.createScore(
          args.data.username,
          args.data.uid,
          args.userId
        );
      } catch (e) {
        console.error(e);
        result.error = "Internal error";
      }
      //console.log("addScore() - result", result);
      return result;
    },
    /**
     *
     * Add a favorite game
     *
     */
    addFavoriteGame: async (source, args, { dataSources }, state) => {
      let result = {};
      try {
        //console.log(dataSources);
        result = await dataSources.knockerDB.createScore(
          args.data.gameId,
          args.username,
          args.userId
        );
      } catch (e) {
        console.error(e);
        result.error = "Internal error";
      }
      //console.log("addScore() - result", result);
      return result;
    },
    /**
     *
     * Add a favorite Machine
     *
     */
    addFavoriteMachine: async (source, args, { dataSources }, state) => {
      let result = {};
      try {
        //console.log(dataSources);
        result = await dataSources.knockerDB.createScore(
          args.data.locationMachineXrefId,
          args.username,
          args.userId
        );
      } catch (e) {
        console.error(e);
        result.error = "Internal error";
      }
      //console.log("addScore() - result", result);
      return result;
    },
    /**
     *
     *
     *
     */
    addPlayedMachine: async (source, args, { dataSources }, state) => {
      const { data } = args;
      let result = {};
      try {
        //console.log(dataSources);
        result = await dataSources.knockerDB.addPlayedMachine(
          args.data.locationMachineXrefId,
          args.userId
        );
      } catch (e) {
        console.error(e);
        result.error = "Internal error";
      }
      //console.log("addScore() - result", result);
      return result;
    },
    addVisitedLocation: async (source, args, { dataSources }, state) => {
      const { data } = args;
      let result = {};
      try {
        //console.log(dataSources);
        result = await dataSources.knockerDB.addVisitedLocation(
          args.data.locationId,
          args.username,
          args.userId
        );
      } catch (e) {
        console.error(e);
        result.error = "Internal error";
      }
      //console.log("addScore() - result", result);
      return result;
    },
  },
};
