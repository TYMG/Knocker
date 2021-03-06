import React, { Component } from "react";
import { Form, FormGroup, FormControl, FormLabel } from "react-bootstrap";
import LoaderButton from "../components/LoaderButton";
import { Auth } from "aws-amplify";

import "./Signup.css";

export default class Signup extends Component {
  constructor(props) {
    super(props);
  }

  state = {
    isLoading: false,
    username: "",
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    confirmationCode: "",
    newUser: null,
    confirm: false,
  };

  validateForm() {
    return (
      this.state.email.length > 0 &&
      this.state.username.length > 0 &&
      this.state.name.length > 0 &&
      this.state.password.length > 0 &&
      this.state.password === this.state.confirmPassword
    );
  }

  validateConfirmationForm() {
    return this.state.confirmationCode.length > 0;
  }

  handleChange = (event) => {
    this.setState({
      [event.target.id]: event.target.value,
    });
  };

  handleSubmit = async (event) => {
    event.preventDefault();

    this.setState({ isLoading: true });
    const { username, password, email, name } = this.state;
    try {
      const newUser = await Auth.signUp({
        username,
        password,
        attributes: { email: email, name: name },
      });
      this.setState({
        newUser,
        confirm: true,
      });
    } catch (e) {
      alert(e.message);
    }

    this.setState({ isLoading: false });
  };

  handleConfirmationSubmit = async (event) => {
    event.preventDefault();

    this.setState({ isLoading: true });

    try {
      await Auth.confirmSignUp(this.state.email, this.state.confirmationCode);
      await Auth.signIn(this.state.email, this.state.password);

      this.props.userHasAuthenticated(true);
      this.props.history.push("/");
    } catch (e) {
      alert(e.message);
      this.setState({ isLoading: false });
    }
  };

  confirmUser = async (event) => {
    event.preventDefault();
    this.setState({ confirm: true });
  };
  createUser = async (event) => {
    event.preventDefault();
    this.setState({ confirm: false });
  };

  renderConfirmationForm() {
    return (
      <div>
        <form onSubmit={this.handleConfirmationSubmit}>
          <FormGroup controlId="confirmationCode" bsSize="large">
            <FormLabel>Confirmation Code</FormLabel>
            <FormControl
              autoFocus
              type="tel"
              value={this.state.confirmationCode}
              onChange={this.handleChange}
            />
            <Form.Text>Please check your email for the code.</Form.Text>
          </FormGroup>
          <LoaderButton
            block
            bsSize="large"
            disabled={!this.validateConfirmationForm()}
            type="submit"
            isLoading={this.state.isLoading}
            text="Verify"
            loadingText="Verifying…"
          />
        </form>
        <div>
          <a href="#" onClick={this.createUser}>
            Need to create a user? Click Here
          </a>
        </div>
      </div>
    );
  }

  renderForm() {
    return (
      <div>
        <form onSubmit={this.handleSubmit}>
          <FormGroup controlId="username" bsSize="large">
            <FormLabel>Username</FormLabel>
            <FormControl
              autoFocus
              type="text"
              value={this.state.username}
              onChange={this.handleChange}
            />
          </FormGroup>
          <FormGroup controlId="name" bsSize="large">
            <FormLabel>Name</FormLabel>
            <FormControl
              autoFocus
              type="text"
              value={this.state.name}
              onChange={this.handleChange}
            />
          </FormGroup>
          <FormGroup controlId="email" bsSize="large">
            <FormLabel>Email</FormLabel>
            <FormControl
              autoFocus
              type="email"
              value={this.state.email}
              onChange={this.handleChange}
            />
          </FormGroup>
          <FormGroup controlId="password" bsSize="large">
            <FormLabel>Password</FormLabel>
            <FormControl
              value={this.state.password}
              onChange={this.handleChange}
              type="password"
            />
          </FormGroup>
          <FormGroup controlId="confirmPassword" bsSize="large">
            <FormLabel>Confirm Password</FormLabel>
            <FormControl
              value={this.state.confirmPassword}
              onChange={this.handleChange}
              type="password"
            />
          </FormGroup>
          <LoaderButton
            block
            bsSize="large"
            disabled={!this.validateForm()}
            type="submit"
            isLoading={this.state.isLoading}
            text="Signup"
            loadingText="Signing up…"
          />
        </form>
        <div>
          <a href="#" onClick={this.confirmUser}>
            Already created user? Confirm Here
          </a>
        </div>
      </div>
    );
  }

  render() {
    return (
      <div className="Signup">
        {!this.state.confirm
          ? this.renderForm()
          : this.renderConfirmationForm()}
      </div>
    );
  }
}
