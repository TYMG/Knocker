import React, { Component } from "react";
import Select from "react-select";

const options = [
  { value: "chocolate", label: "Chocolate" },
  { value: "strawberry", label: "Strawberry" },
  { value: "vanilla", label: "Vanilla" },
];

const groupStyles = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};
const groupBadgeStyles = {
  backgroundColor: "#EBECF0",
  borderRadius: "2em",
  color: "#172B4D",
  display: "inline-block",
  fontSize: 12,
  fontWeight: "normal",
  lineHeight: "1",
  minWidth: 1,
  padding: "0.16666666666667em 0.5em",
  textAlign: "center",
};

const formatGroupLabel = (data) => (
  <div style={groupStyles}>
    <span>{data.label}</span>
    <span style={groupBadgeStyles}>{data.options.length}</span>
  </div>
);

class AddMachines extends Component {
  constructor(props) {
    super(props);

    const selectList = this.createSelectList(props.machinesList);
    this.state = {
      selectList: selectList,
      selectedMachine: "",
      datePlayed: "",
      locationPlayed: "",
    };
  }

  handleChange = (name) => (value) => {
    console.log(value);
    this.setState({
      [name]: value,
    });
    console.log(this.state);
  };

  render() {
    const { selectedMachine, datePlayed, locationPlayed } = this.state;
    return (
      <form onSubmit={(e) => e.preventDefault()}>
        <div>
          <h2>Add Machine</h2>
          <Select
            options={this.state.selectList}
            formatGroupLabel={formatGroupLabel}
            value={this.state.selectedMachine}
            onChange={this.handleChange("selectedMachine")}
            placeholder="Select A Machine"
          />
          <input
            className="mb2"
            value={datePlayed}
            onChange={(e) => this.setState({ datePlayed: e.target.value })}
            type="text"
            placeholder="Username"
          />
          <input
            className="mb2"
            value={locationPlayed}
            onChange={(e) => this.setState({ locationPlayed: e.target.value })}
            type="text"
            placeholder="Name"
          />
          <button
            onClick={() => {
              console.log(this.state);
            }}
          >
            Submit
          </button>
        </div>
        {/*   <Mutation mutation={ADD_PLAYER}>
          {(mutation) => (
          )}
        </Mutation>{" "} */}
      </form>
    );
  }

  createSelectList(listOfMachines) {
    let groupedOptions = [];
    listOfMachines.forEach((machine) => {
      const machinemanufacturer = machine.manufacturer;
      if (groupedOptions[machinemanufacturer]) {
        groupedOptions[machinemanufacturer].options.push({
          value: machine,
          label: machine.name,
        });
      } else {
        groupedOptions[machinemanufacturer] = {
          label: machinemanufacturer,
          options: [
            {
              value: machine,
              label: machine.name,
            },
          ],
        };
      }
    });
    //console.log(groupedOptions);
    console.log(Object.values(groupedOptions));
    return Object.values(groupedOptions);
  }
}

export default AddMachines;
