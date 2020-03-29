import { mergeResolvers } from "merge-graphql-schemas";

import pinballResolver from "./pinball";
/* import machineResolver from "./machine";
import machineXrefResolver from "./machine-xref";
import machineConditionResolver from "./machine-condition";
import regionResolver from "./region";
import locationResolver from "./location";
import operatorResolver from "./opera"; */

const resolvers = [
  pinballResolver
  /* machineResolver,
  machineXrefResolver,
  machineConditionResolver,
  regionResolver,
  locationResolver,
  operatorResolver */
];

export default mergeResolvers(resolvers);
