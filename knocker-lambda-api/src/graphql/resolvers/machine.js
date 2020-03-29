export default {
  Query: {
    machines: (_, __, { dataSources }) =>
      dataSources.pinballMachineAPI.getAllMachines()
  }
};
