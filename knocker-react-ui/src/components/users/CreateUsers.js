import React, { Component } from "react";
import { Mutation } from "react-apollo";
import gql from "graphql-tag";

const ADD_PLAYER = gql`
  mutation PutPlayer($input: PlayerInput!) {
    putPlayer(data: $input) {
      username
      name
      email
    }
  }
`;

class CreateUser extends Component {
  state = {
    username: "",
    name: "",
    email: "",
  };

  render() {
    const { username, name, email } = this.state;
    return (
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="flex flex-column mt3">
          <input
            className="mb2"
            value={username}
            onChange={(e) => this.setState({ username: e.target.value })}
            type="text"
            placeholder="Username"
          />
          <input
            className="mb2"
            value={name}
            onChange={(e) => this.setState({ name: e.target.value })}
            type="text"
            placeholder="Name"
          />
          <input
            className="mb2"
            value={email}
            onChange={(e) => this.setState({ email: e.target.value })}
            type="text"
            placeholder="Email"
          />
        </div>
        {/* There is a property called refetchQueries that can call queries after post call */}
        <Mutation mutation={ADD_PLAYER}>
          {(mutation) => (
            <button
              onClick={() => mutation({ variables: { input: this.state } })}
            >
              Submit
            </button>
          )}
        </Mutation>{" "}
      </form>
    );
  }
}

export default CreateUser;

/* 

  <Mutation mutation={ADD_PLAYER}>
          {(mutation) => (
            <button onClick={() => mutation({variables:{input:this.state}})}>Submit</button>
          )}
        </Mutation>

*/
