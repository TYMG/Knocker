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
      dataSources.knockerDB.getUserById({ id: id }),
    userByUsername: async (source, args, { dataSources }, state) =>
      dataSources.knockerDB.getUserByUsername({ username: username }),
    userRolesById: async (source, { id }, { dataSources }, state) =>
      dataSources.knockerDB.getUserRolesById({ id: id }),
    usersByRoles: async (source, args, { dataSources }, state) => {},
    usersScores: async (source, { username }, { dataSources }, state) =>
      dataSources.knockerDB.getUserScores({ username: username }),
    knockerScoresByGameId: async (source, { gameId }, { dataSources }, state) =>
      dataSources.knockerDB.getScoresByGameId({ gameId: gameId }),
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
      dataSources.pinballMachineAPI.getPMScoresByLocationMachineId({
        locMachId: locMachId,
      }),
    // ------- Dates --------

    eventsByDate: async (source, { date }, { dataSources }, state) =>
      dataSources.knockerDB.getEventsByDate({ date: date }),

    /**
     *
     *
     * PinballAPI
     *
     */
    machines: (_, __, { dataSources }) =>
      dataSources.pinballMachineAPI.getAllMachines(),
    getAllHighScoresForARegion: (_, __, { dataSources }) =>
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
    /**
     *
     * Create a User
     *
     */
    createUser: async (source, args, { dataSources }, state) => {
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
    /**
     *
     * Add a User Permission
     *
     */
    addUserPermission: async (source, args, { dataSources }, state) => {},
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
    addFriend: async (source, args, { dataSources }, state) => {},
    addFriends: async (source, args, { dataSources }, state) => {},
    /**
     *
     */
    /**
     *
     * Add a favorite game
     *
     */
    addFavoriteGame: async (source, args, { dataSources }, state) => {},
    addFavoriteGames: async (source, args, { dataSources }, state) => {},
    /**
     *
     * Add a favorite pin
     *
     */
    addFavoriteMachine: async (source, args, { dataSources }, state) => {},
    addFavoriteMachines: async (source, args, { dataSources }, state) => {},
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
  },
};
