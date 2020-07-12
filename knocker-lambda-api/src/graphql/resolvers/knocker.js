const { v4 } = require("uuid");

export default {
  Query: {
    players: (_, __, { dataSources }) => dataSources.knockerDB.get(),
    machines: (_, __, { dataSources }) =>
      dataSources.pinballMachineAPI.getAllMachines(),
    locations: (_, { region }, { dataSources }) =>
      dataSources.pinballMachineAPI.getLocations({ region: region }),
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
        console.log(dataSources);
        await dataSources.knockerDB.put(data);
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
      console.log("args:", args);
      let result = {};
      try {
        console.log(dataSources);
        result = await dataSources.knockerDB.createScore(
          {
            id: v4(),
            score: args.data.score,
            machineId: args.data.machineId,
            machineName: args.data.machineName,
            locationId: args.data.locationId,
            createdAt: new Date().getTime(),
          },
          args.data.userId
        );
      } catch (e) {
        console.error(e);
        result.error = "Internal error";
      }
      console.log("addScore() - result", result);
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
  },
};
