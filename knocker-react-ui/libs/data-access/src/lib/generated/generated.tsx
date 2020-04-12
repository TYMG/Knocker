import gql from 'graphql-tag';
import * as ApolloReactCommon from '@apollo/react-common';
import * as ApolloReactHooks from '@apollo/react-hooks';
export type Maybe<T> = T | null;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
};

export type Location = {
   __typename?: 'Location';
  id?: Maybe<Scalars['Int']>;
  name?: Maybe<Scalars['String']>;
  street?: Maybe<Scalars['String']>;
  city?: Maybe<Scalars['String']>;
  state?: Maybe<Scalars['String']>;
  zip?: Maybe<Scalars['String']>;
  phone?: Maybe<Scalars['String']>;
  lat?: Maybe<Scalars['String']>;
  lon?: Maybe<Scalars['String']>;
  website?: Maybe<Scalars['String']>;
  created_at?: Maybe<Scalars['String']>;
  updated_at?: Maybe<Scalars['String']>;
  zone_id?: Maybe<Scalars['Int']>;
  region_id?: Maybe<Scalars['Int']>;
  location_type_id?: Maybe<Scalars['Int']>;
  description?: Maybe<Scalars['String']>;
  operator_id?: Maybe<Scalars['String']>;
  date_last_updated?: Maybe<Scalars['String']>;
  last_updated_by_user_id?: Maybe<Scalars['Int']>;
  is_stern_army?: Maybe<Scalars['Boolean']>;
  country?: Maybe<Scalars['String']>;
  distance?: Maybe<Scalars['Float']>;
  bearing?: Maybe<Scalars['String']>;
  num_machines?: Maybe<Scalars['Int']>;
  location_machine_xrefs?: Maybe<Array<Maybe<MachineXref>>>;
  machine_names?: Maybe<Array<Maybe<Scalars['String']>>>;
};

export type MachineCondition = {
   __typename?: 'MachineCondition';
  id?: Maybe<Scalars['Int']>;
  comment?: Maybe<Scalars['String']>;
  location_machine_xref_id?: Maybe<Scalars['Int']>;
  created_at?: Maybe<Scalars['String']>;
  updated_at?: Maybe<Scalars['String']>;
  user_id?: Maybe<Scalars['Int']>;
  username?: Maybe<Scalars['String']>;
};

export type MachineXref = {
   __typename?: 'MachineXref';
  id?: Maybe<Scalars['Int']>;
  created_at?: Maybe<Scalars['String']>;
  updated_at?: Maybe<Scalars['String']>;
  location_id?: Maybe<Scalars['Int']>;
  machine_id?: Maybe<Scalars['Int']>;
  condition?: Maybe<Scalars['String']>;
  condition_date?: Maybe<Scalars['String']>;
  user_id?: Maybe<Scalars['Int']>;
  machine_score_xrefs_count?: Maybe<Scalars['Int']>;
  last_updated_by_username?: Maybe<Scalars['String']>;
  machine_conditions?: Maybe<Array<Maybe<MachineCondition>>>;
};

export type Machine = {
   __typename?: 'Machine';
  id: Scalars['Int'];
  name?: Maybe<Scalars['String']>;
  is_active?: Maybe<Scalars['String']>;
  created_at?: Maybe<Scalars['String']>;
  updated_at?: Maybe<Scalars['String']>;
  ipdb_link?: Maybe<Scalars['String']>;
  year?: Maybe<Scalars['Int']>;
  manufacturer?: Maybe<Scalars['String']>;
  machine_group_id?: Maybe<Scalars['Int']>;
  ipdb_id?: Maybe<Scalars['Int']>;
  opdb_id?: Maybe<Scalars['String']>;
};

export type Operator = {
   __typename?: 'Operator';
  id?: Maybe<Scalars['Int']>;
  name?: Maybe<Scalars['String']>;
  region_id?: Maybe<Scalars['Int']>;
  email?: Maybe<Scalars['String']>;
  website?: Maybe<Scalars['String']>;
  phone?: Maybe<Scalars['String']>;
  created_at?: Maybe<Scalars['String']>;
  updated_at?: Maybe<Scalars['String']>;
};

export type Region = {
   __typename?: 'Region';
  id?: Maybe<Scalars['Int']>;
  name?: Maybe<Scalars['String']>;
  created_at?: Maybe<Scalars['String']>;
  updated_at?: Maybe<Scalars['String']>;
  full_name?: Maybe<Scalars['String']>;
  motd?: Maybe<Scalars['String']>;
  lat?: Maybe<Scalars['String']>;
  lon?: Maybe<Scalars['String']>;
  state?: Maybe<Scalars['String']>;
  effective_radius?: Maybe<Scalars['Float']>;
};

export type Query = {
   __typename?: 'Query';
  machines: Array<Maybe<Machine>>;
  machineById: Machine;
  machineByName: Machine;
  machineXrefs: Array<Maybe<MachineXref>>;
  machineXref: MachineXref;
  locations: Array<Maybe<Location>>;
  location: Location;
};


export type QueryMachineByIdArgs = {
  id: Scalars['String'];
};


export type QueryMachineByNameArgs = {
  name: Scalars['String'];
};


export type QueryMachineXrefArgs = {
  id: Scalars['String'];
};


export type QueryLocationArgs = {
  id: Scalars['String'];
};

export type AllMachinesQueryVariables = {};


export type AllMachinesQuery = (
  { __typename?: 'Query' }
  & { machines: Array<Maybe<(
    { __typename?: 'Machine' }
    & Pick<Machine, 'id' | 'name' | 'is_active' | 'created_at' | 'updated_at' | 'ipdb_link' | 'year' | 'manufacturer' | 'machine_group_id' | 'ipdb_id' | 'opdb_id'>
  )>> }
);


export const AllMachinesDocument = gql`
    query allMachines {
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

/**
 * __useAllMachinesQuery__
 *
 * To run a query within a React component, call `useAllMachinesQuery` and pass it any options that fit your needs.
 * When your component renders, `useAllMachinesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAllMachinesQuery({
 *   variables: {
 *   },
 * });
 */
export function useAllMachinesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<AllMachinesQuery, AllMachinesQueryVariables>) {
        return ApolloReactHooks.useQuery<AllMachinesQuery, AllMachinesQueryVariables>(AllMachinesDocument, baseOptions);
      }
export function useAllMachinesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<AllMachinesQuery, AllMachinesQueryVariables>) {
          return ApolloReactHooks.useLazyQuery<AllMachinesQuery, AllMachinesQueryVariables>(AllMachinesDocument, baseOptions);
        }
export type AllMachinesQueryHookResult = ReturnType<typeof useAllMachinesQuery>;
export type AllMachinesLazyQueryHookResult = ReturnType<typeof useAllMachinesLazyQuery>;
export type AllMachinesQueryResult = ApolloReactCommon.QueryResult<AllMachinesQuery, AllMachinesQueryVariables>;