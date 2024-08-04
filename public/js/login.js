/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

export const login = async (email, password) => {
  try {
    // Get result of login request
    const res = await axios({
      method: 'POST',
      url: 'http://127.0.0.1:3000/api/v1/users/login',
      data: {
        email,
        password,
      },
    });
    if (res.data.status === 'success') {
      showAlert('success', 'Logged in successfully!');
      // Set timeout
      window.setTimeout(() => {
        // Reroute to the overview page after 1.5s
        location.assign('/');
      }, 1500);
    }
  } catch (err) {
    // Set the error details to the alert
    showAlert('error', err.response.data.message);
  }
};

export const logout = async () => {
  try {
    // Make a get request to the logout route
    const res = await axios({
      method: 'GET',
      url: 'http://127.0.0.1:3000/api/v1/users/logout',
    });
    // Force a reload of the page from the server, and not from the browser cache
    if (res.data.status === 'success') location.reload(true);
  } catch (err) {
    showAlert('error', 'Error logging out! Try againt');
  }
};
