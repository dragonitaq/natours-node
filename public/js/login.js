import axios from 'axios';
import { showAlert } from './alerts';

export const login = async (email, password) => {
  try {
    /* res will store the data response from server once the http request is successful. */
    const res = await axios({
      method: 'POST',
      // I think we can set ENV variable to insert domain name depends on the working ENV.
      url: 'http://127.0.0.1:3000/api/v1/users/login',
      data: {
        email,
        password,
      },
    });

    // If the http request is successful, we will get the data in the form that we respond normally in server.
    if (res.data.status === 'success') {
      showAlert('success', 'Logged in successfully!');
      window.setTimeout(() => {
        // We redirect user to home page after logging in successfully.
        location.assign('/');
      }, 1500);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};

export const logout = async () => {
  try {
    const res = await axios({
      method: 'GET',
      url: 'http://127.0.0.1:3000/api/v1/users/logout',
    });
    /* Setting true for reload will force reload from server, not browser cache. This is important because by default browser will reload using the available cache within the browser, this will result in rendering user menu details from the cache even when user already logged out.
    I found out without setting to true also work properly. I think because it is deprecated. */
    if (res.data.status === 'success')
      window.setTimeout(() => {
        // We redirect user to home page after logging out successfully.
        location.assign('/');
      }, 1000);
  } catch (err) {
    showAlert('error', 'Error logging out. Try again.');
  }
};
