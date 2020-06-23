import React, { Component } from "react";
import { Query } from "react-apollo";
import gql from "graphql-tag";
import AddMachine from "../Add-Machine/AddMachine";

/* eslint-disable-next-line */

const MACHINES_QUERY = gql`
  {
    machines {
      id
      name
      is_active
      created_at
      updated_at
      ipdb_link
      year
      manufacturer
      machine_group_id
      ipdb_id
      opdb_id
    }
  }
`;

class MachinesList extends Component {
  render() {
    return (
      <Query query={MACHINES_QUERY}>
        {({ loading, error, data }) => {
          if (loading) return <div>Fetching</div>;
          if (error) return <div>Error</div>;

          const machinesList = data.machines;

          return (
            <div>
              <AddMachine machinesList={machinesList} />
              <div>
                {machinesList.map(
                  ({
                    id,
                    name,
                    is_active,
                    created_at,
                    updated_at,
                    ipdb_link,
                    year,
                    manufacturer,
                    machine_group_id,
                    ipdb_id,
                    opdb_id,
                  }) => (
                    <li key={id}>
                      {year} - <strong>{name}</strong> ({manufacturer} )
                      <a href={ipdb_link}>IPDB Link</a>
                    </li>
                  )
                )}
              </div>
            </div>
          );
        }}
      </Query>
    );
  }
}

export default MachinesList;

/* 
export interface MachineListProps {}

export const MachineList = (props: MachineListProps) => {
  const { loading, error, data } = useAllMachinesQuery();

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :(</p>;

  return (
    <ul>
      {data.machines.map(
        ({
          id,
          name,
          is_active,
          created_at,
          updated_at,
          ipdb_link,
          year,
          manufacturer,
          machine_group_id,
          ipdb_id,
          opdb_id,
        }) => (
          <li key={id}>
            {year} - <strong>{name}</strong> ({manufacturer} )
            <a href={ipdb_link}>IPDB Link</a>
          </li>
        )
      )}
    </ul>
  );
};

export default MachineList;
 */
