export default {
  Query: {
    machines: (_, __, { dataSources }) => {
      console.log(dataSources);
      dataSources.pinballMachineAPI.getAllMachines();
    },
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
};
