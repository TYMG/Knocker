import React, { Component, Fragment } from "react";

import "./App.css";

import { Link, withRouter } from "react-router-dom";
import Routes from "./Routes";

import { Nav, Navbar } from "react-bootstrap";
import { Auth } from "aws-amplify";

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isAuthenticated: false,
      isAuthenticating: true,
    };
  }

  async componentDidMount() {
    try {
      if (await Auth.currentSession()) {
        this.userHasAuthenticated(true);
      }
    } catch (e) {
      if (e !== "No current user") {
        alert(e);
      }
    }

    this.setState({ isAuthenticating: false });
  }

  userHasAuthenticated = (authenticated) => {
    this.setState({ isAuthenticated: authenticated });
  };

  handleLogout = async (event) => {
    await Auth.signOut();

    this.userHasAuthenticated(false);
    this.props.history.push("/login");
  };

  render() {
    const childProps = {
      isAuthenticated: this.state.isAuthenticated,
      userHasAuthenticated: this.userHasAuthenticated,
    };
    return (
      <div className="App container">
        <Navbar fixed="top" bg="dark" expand="xl">
          <Navbar.Brand href="#home">Knocker</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="mr-auto">
              <Nav.Link href="#home">Home</Nav.Link>
              <Nav.Link href="/machines">Machines</Nav.Link>
            </Nav>
            <Nav pullright>
              {this.state.isAuthenticated ? (
                <Nav.Link onClick={this.handleLogout}>Logout</Nav.Link>
              ) : (
                <Fragment>
                  <Nav.Link href="/sign-up">Sign Up</Nav.Link>
                  <Nav.Link href="/login">Login</Nav.Link>
                </Fragment>
              )}
            </Nav>
          </Navbar.Collapse>
        </Navbar>
        <Routes childProps={childProps} />
      </div>
    );
  }
}

export default withRouter(App);
