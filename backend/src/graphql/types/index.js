import { mergeTypes } from "merge-graphql-schemas";

import machine from "./machine.graphql";
import machineXref from "./machine-xref.graphql";
import machineCondition from "./machine-condition.graphql";
import region from "./machine-condition.graphql";
import location from "./machine-condition.graphql";
import operator from "./machine-condition.graphql";

export default mergeTypes(
  [machine, machineXref, machineCondition, region, location, operator],
  { all: true }
);
