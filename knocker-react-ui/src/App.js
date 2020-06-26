import React from "react";
import "./App.css";
import Machines from "./Machines/Machines";
import CreateUser from "./components/users/CreateUsers";
import Signup from "./Auth/Signup";
import { BrowserRouter as Router, Switch, Route, Link } from "react-router-dom";
import {
  Nav,
  Navbar,
  NavItem,
  NavDropdown,
  Form,
  FormControl,
  Button,
} from "react-bootstrap";
import { LinkContainer } from "react-router-bootstrap";

import Header from "./components/header/header";
export default function App() {
  return (
    <Router>
      <div>
        <Navbar fixed="top" bg="dark" expand="xl">
          <Navbar.Brand href="#home">Knocker</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="mr-auto">
              <Nav.Link href="#home">Home</Nav.Link>
              <Nav.Link href="#link">Link</Nav.Link>
            </Nav>
            <Nav pullRight>
              <Nav.Link href="/sign-up">Sign Up</Nav.Link>
              <Nav.Link href="/login">Login</Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Navbar>

        {/* A <Switch> looks through its children <Route>s and
            renders the first one that matches the current URL. */}
        <Switch>
          <Route path="/machines">
            <Machines />
          </Route>
          <Route path="/sign-up">
            <Signup />
          </Route>
          <Route path="/">
            <Home />
          </Route>
        </Switch>
      </div>
    </Router>
  );
}

function Home() {
  return <h2>Home</h2>;
}

function About() {
  return <h2>About</h2>;
}

function Users() {
  return <h2>Users</h2>;
}
