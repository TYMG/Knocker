import { RESTDataSource } from "apollo-datasource-rest";
const reducers = require("../reducers");

export class PinballMachineAPI extends RESTDataSource {
  constructor() {
    super();
    this.baseURL = "https://pinballmap.com/api/v1";
  }

  // leaving this inside the class to make the class easier to test

  /**
   *
   * Note: getMachineById is not neccessary if the whole list is loaded into the app
   */
  async getAllMachines() {
    const response = await this.get(`/machines.json`);
    // transform the raw launches to a more friendly
    let returnArray = [];
    if (response) {
      response["machines"].forEach((element) => {
        ////console.log("test", element);
        returnArray.push(reducers.machineReducer(element));
      });
      return returnArray;
    } /*  Array.isArray(response)
        ? response.map(machine => this.pinballMachineReducer(machine))
        : []; */
  }

  async getAllOperators() {
    const response = await this.get(`/machines.json`);
    // transform the raw launches to a more friendly
    return Array.isArray(response)
      ? response.map((op) => reducers.operatorReducer(op))
      : [];
  }

  async getAllRegions() {
    const response = await this.get(`/regions`);
    let returnArray = [];
    if (response) {
      response["regions"].forEach((element) => {
        ////console.log("test", element);
        returnArray.push(reducers.regionReducer(element));
      });
      return returnArray;
    }
    //https://pinballmap.com/api/v1/regions
  }

  async getLocations({ region }) {
    const response = await this.get("/locations", { region: region });
    let returnArray = [];
    if (response) {
      response["locations"].forEach((element) => {
        ////console.log("test", element);
        returnArray.push(reducers.locationReducer(element));
      });
      return returnArray;
    }
    /* https://pinballmap.com/api/v1/locations?region=ca-central 
      the region is required: its a string
      */
  }

  async getLocationsByRegion({ region }) {
    const response = await this.get("/region/" + region + "/locations");

    let returnArray = [];
    if (response) {
      response["locations"].forEach((element) => {
        ////console.log("test", element);
        returnArray.push(reducers.locationReducer(element));
      });
      return returnArray;
    }

    //https://pinballmap.com/api/v1/region/ca-central/locations
  }

  async getLocationsClosestByAddress() {
    /* http://pinballmap.com/api/v1/locations/closest_by_address.json?send_all_within_distance=true;no_details=1;manufacturer=Stern;address=20009;max_distance=50 */
    //The Address is a zipcode, the most important field
  }

  async getPMScoresByLocationMachineId(locMachId) {
    /*  https://pinballmap.com/api/v1/machine_score_xrefs/3467
      id:3467 */
    console.log("getPMScoresByLocationMachineId:locMachId", locMachId);
    const response = await this.get("/machine_score_xrefs/" + locMachId);

    let returnArray = [];
    if (response) {
      response["machine_scores"].forEach((element) => {
        ////console.log("test", element);
        returnArray.push(reducers.pinballAPIScoreReducer(element));
      });
      return returnArray;
    }
  }

  async getMachineXrefByRegion({ region }) {
    const response = await this.get(
      "/region/" + region + "/location_machine_xrefs"
    );
    let returnArray = [];
    if (response) {
      response["location_machine_xrefs"].forEach((element) => {
        ////console.log("test", element);
        returnArray.push(reducers.machineXrefsReducer(element));
      });
      return returnArray;
    }
  }

  /*   async getLaunchById({ launchId }) {
      const res = await this.get("launches", { flight_number: launchId });
      return this.launchReducer(res[0]);
    }
    async getLaunchesByIds({ launchIds }) {
      return Promise.all(
        launchIds.map(launchId => this.getLaunchById({ launchId }))
      );
    } */
}
