import React from "react";
import AppliedRoute from "./components/AppliedRoutes";
import Machines from "./Machines/Machines";
import Signup from "./Auth/Signup";
import Login from "./Auth/Login";
import Home from "./Home/Home";
import { BrowserRouter as Switch } from "react-router-dom";

export default ({ childProps }) => (
  <Switch>
    <AppliedRoute path="/" exact component={Home} props={childProps} />
    <AppliedRoute
      path="/machines"
      exact
      component={Machines}
      props={childProps}
    />
    <AppliedRoute path="/sign-up" exact component={Signup} props={childProps} />
    <AppliedRoute path="/login" exact component={Login} props={childProps} />
  </Switch>
);
