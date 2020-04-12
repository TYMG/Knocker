import { mergeTypes } from "merge-graphql-schemas";

import machine from "./machine.graphql";
import machineXref from "./machine-xref.graphql";
import machineCondition from "./machine-condition.graphql";
import region from "./region.graphql";
import location from "./location.graphql";
import operator from "./operator.graphql";
import util from "./util.graphql";
import player from "./player.graphql";

export default mergeTypes(
  [
    machine,
    machineXref,
    machineCondition,
    region,
    location,
    operator,
    util,
    player,
  ],
  { all: true }
);
