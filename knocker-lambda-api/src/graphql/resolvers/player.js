export default {
  Query: {
    players: (_, __, { dataSources }) => dataSources.knockerDB.get(),
    machines: (_, __, { dataSources }) =>
      dataSources.pinballMachineAPI.getAllMachines(),
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
        result.error = e;
      }
      console.log("FINAL RESULT: " + result);
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
