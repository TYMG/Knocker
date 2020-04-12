import React from 'react';

import './machine-list.scss';
import { useAllMachinesQuery } from '@knocker-react-ui/data-access';

/* eslint-disable-next-line */
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
          opdb_id
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
