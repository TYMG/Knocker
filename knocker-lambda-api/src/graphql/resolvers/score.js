export default {
  Score: {
    player: async (source, args, { dataSources }, state) => {
      return await dataSources.knockerDB.player(source.username);
    },
    machine: async (source, args, { dataSources }, state) => {
      return await dataSources.pinballMachineAPI.machine(source.id);
    }
  },
  Mutation: {
    putScore: async (source, args, { dataSources }, state) => {
      const { data } = args;

      let result = {};
      try {
        await dataSources.knockerDB.put(data);
      } catch (e) {
        console.error(e);
        result.error = "Internal error";
      }

      return result;
    },
    deleteScore: async (source, args, { dataSources }, state) => {
      const { id } = args;

      let result = {};
      try {
        await dataSources.knockerDB.delete(id);
      } catch (e) {
        console.error(e);
        result.error = "Internal error";
      }

      return result;
    }
  }
};
