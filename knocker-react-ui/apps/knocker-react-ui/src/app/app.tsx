import React from 'react';
import { ApolloProvider } from '@apollo/react-hooks';
import { MachineList } from '@knocker-react-ui/feature-sets';

import ApolloClient from 'apollo-boost';
import './app.scss';

import { ReactComponent as Logo } from './logo.svg';
import star from './star.svg';

const client = new ApolloClient({
  uri: 'http://0.0.0.0:3000/dev/knocker-api'
});

export const App = () => {
  /*
   * Replace the elements below with your own.
   *
   * Note: The corresponding styles are in the ./app.scss file.
   */
  return (
    <ApolloProvider client={client}>
      <div className="flex">
        <h1>KNOCKER</h1>
        <MachineList />
      </div>
    </ApolloProvider>
  );
};

export default App;
