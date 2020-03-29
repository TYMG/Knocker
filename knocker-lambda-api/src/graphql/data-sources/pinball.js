import { RESTDataSource } from "apollo-datasource-rest";

export class PinballMachineAPI extends RESTDataSource {
  constructor() {
    super();
    this.baseURL = "https://pinballmap.com/api/v1";
  }

  // leaving this inside the class to make the class easier to test
  pinballMachineReducer(pin) {
    return {
      id: pin.id,
      name: pin.name,
      is_active: pin.is_active,
      created_at: pin.created_at,
      updated_at: pin.updated_at,
      ipdb_link: pin.ipdb_link,
      year: pin.year,
      manufacturer: pin.manufacturer,
      machine_group_id: pin.machine_group_id,
      ipdb_id: pin.ipdb_id,
      opdb_id: pin.opdb_id
    };
  }
  regionReducer(reg) {
    return {
      id: reg.id,
      name: reg.name,
      created_at: reg.created_at,
      updated_at: reg.updated_at,
      full_name: reg.full_name,
      motd: reg.motd,
      lat: reg.lat,
      lon: reg.lon,
      state: reg.state,
      effective_radius: reg.effective_radius
    };
  }

  locationReducer(loc) {
    return {
      id: loc.id,
      name: loc.name,
      street: loc.street,
      city: loc.city,
      state: loc.state,
      zip: loc.zip,
      phone: loc.phone,
      lat: loc.lat,
      lon: loc.lon,
      website: loc.website,
      created_at: loc.created_at,
      updated_at: loc.updated_at,
      zone_id: loc.zone_id,
      region_id: loc.region_id,
      location_type_id: loc.location_type_id,
      description: loc.description,
      operator_id: loc.operator_id,
      date_last_updated: loc.date_last_updated,
      last_updated_by_user_id: loc.last_updated_by_user_id,
      is_stern_army: loc.is_stern_army,
      country: loc.country,
      num_machines: loc.num_machines,
      location_machine_xrefs: loc.location_machine_xrefs
    };
  }

  highestScore(hs) {
    return {
      id: hs.id,
      location_machine_xref_id: hs.location_machine_xref_id,
      score: hs.score,
      created_at: hs.created_at,
      updated_at: hs.updated_at,
      user_id: hs.user_id,
      username: hs.username
    };
  }

  operatorReducer(op) {
    return {
      id: op.id,
      name: op.name,
      region_id: op.region_id,
      email: op.email,
      website: op.website,
      phone: op.phone,
      created_at: op.created_at,
      updated_at: op.updated_at
    };
  }

  async getAllMachines() {
    const response = await this.get(`/machines.json`);
    // transform the raw launches to a more friendly
    let returnArray = [];
    if (response) {
      response["machines"].forEach(element => {
        //console.log("test", element);
        returnArray.push(this.pinballMachineReducer(element));
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
      ? response.map(op => this.operatorReducer(op))
      : [];
  }

  async getAllRegions() {
    const response = await this.get(`/regions`);
    let returnArray = [];
    if (response) {
      response["regions"].forEach(element => {
        //console.log("test", element);
        returnArray.push(this.regionReducer(element));
      });
      return returnArray;
    }
    //https://pinballmap.com/api/v1/regions
  }

  async getLocations({ region }) {
    const response = await this.get("/locations", { region: region });
    let returnArray = [];
    if (response) {
      response["locations"].forEach(element => {
        //console.log("test", element);
        returnArray.push(this.locationReducer(element));
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
      response["locations"].forEach(element => {
        //console.log("test", element);
        returnArray.push(this.locationReducer(element));
      });
      return returnArray;
    }

    //https://pinballmap.com/api/v1/region/ca-central/locations
  }

  async getLocationsClosestByAddress() {
    /* http://pinballmap.com/api/v1/locations/closest_by_address.json?send_all_within_distance=true;no_details=1;manufacturer=Stern;address=20009;max_distance=50 */
    //The Address is a zipcode, the most important field
  }

  async getMachinesHighestScore() {
    /*  https://pinballmap.com/api/v1/machine_score_xrefs/3467
      id:3467 */
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
