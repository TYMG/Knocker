import { mergeResolvers } from "merge-graphql-schemas";
const GMR = require("graphql-merge-resolvers"); // Import module

import pinballResolver from "./pinball";
import playerResolver from "./player";
import knockerResolver from "./knocker";
/*import scoreResolver from "./score"; */
/* import machineResolver from "./machine";
import machineXrefResolver from "./machine-xref";
import machineConditionResolver from "./machine-condition";
import regionResolver from "./region";
import locationResolver from "./location";
import operatorResolver from "./opera"; */

const resolvers = [
  //playerResolver,
  pinballResolver,
  /*   playerResolver,
  scoreResolver */

  /* machineResolver,
  machineXrefResolver,
  machineConditionResolver,
  regionResolver,
  locationResolver,
  operatorResolver */
];

export default knockerResolver;

/* const mainResolver = GMR.merge([playerResolver, pinballResolver]); 
export default mainResolver; */
