/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

// Middleware to update the password or user data, depending on type
// type is either 'password' or 'data'
export const updateSettings = async (data, type) => {
  try {
    // Get result of updating user data request
    const url =
      type === 'password'
        ? 'http://127.0.0.1:3000/api/v1/users/updatePassword'
        : 'http://127.0.0.1:3000/api/v1/users/updateMe';
    const res = await axios({
      method: 'PATCH',
      url,
      data,
    });
    if (res.data.status === 'success') {
      showAlert('success', `${type.toUpperCase()} updated successfully!`);
    }
  } catch (err) {
    // Set the error details to the alert
    showAlert('error', err.response.data.message);
  }
};
