import { mergeTypes } from "merge-graphql-schemas";

import machine from "./machine.graphql";
import machineXref from "./machine-xref.graphql";
import machineCondition from "./machine-condition.graphql";
import region from "./region.graphql";
import location from "./location.graphql";
import operator from "./operator.graphql";
import player from "./player.graphql";
import score from "./db/score.graphql";

export default mergeTypes(
  [
    machine,
    machineXref,
    machineCondition,
    region,
    location,
    operator,
    player,
    score,
    util
  ],
  { all: true }
);
