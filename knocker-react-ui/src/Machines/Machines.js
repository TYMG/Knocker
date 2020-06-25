import React, { Component } from "react";
import MachinesList from "./Machine-List/MachineList";

class Machines extends Component {
  render() {
    return (
      <div>
        <h1>Machines</h1>
        <MachinesList />
      </div>
    );
  }
}

export default Machines;
