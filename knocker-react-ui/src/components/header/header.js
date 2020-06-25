import React, { Component } from "react";
import { Link } from "react-router-dom";
import { withRouter } from "react-router";

class Header extends Component {
  render() {
    return (
      <nav>
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/Machines">Machines</Link>
          </li>
          <li>
            <Link to="/users">Users</Link>
          </li>
        </ul>
      </nav>
    );
  }
}

export default withRouter(Header);
