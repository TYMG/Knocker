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
    addScore: async (source, args, { dataSources }, state) => {
      const { data } = args;

      let result = {};
      try {
        console.log(dataSources);
        await dataSources.knockerDB.createScore(data);
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
  },
};
