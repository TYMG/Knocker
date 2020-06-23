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
    };
  }

  render() {
    return (
      <div>
        <Select
          options={this.state.selectList}
          formatGroupLabel={formatGroupLabel}
        />
      </div>
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
