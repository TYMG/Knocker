export default {
  Query: {
    players: (_, __, { dataSources }) => dataSources.knockerDB.get(),
    machines: (_, __, { dataSources }) =>
      dataSources.pinballMachineAPI.getAllMachines(),
  },
  Mutation: {
    putPlayer: async (source, args, { dataSources }, state) => {
      try {
        const { data } = args;
        console.log(dataSources);
        console.log("FINAL RESULT: " + result);
        return dataSources.knockerDB.put(data);
      } catch (e) {
        console.error("player.js - CAUGHT ERROR " + e);
        throw new Error("Error: " + e);
      }
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
