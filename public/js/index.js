/* We do not save it into any variable, because that's not necessary at all. All we want this to do is to basically be included into our final bundle to polyfill some of the features of JavaScript. */
import '@babel/polyfill';
import { login, logout } from './login';
import { displayMap } from './mapbox';
import { updateSettings } from './updateSettings';
import { bookTour } from './stripe';
import { showAlert } from './alerts';

/* ######################### DOM elements ######################### */

const loginForm = document.querySelector('.form--login');
/* Whatever value (string) we put in data-attribute in HTML will store in dataset property. So in JS, in this case, it's dataset.locations that we can access from the DOM.
HTML only can store string value, we need to convert back to JS types (object or array & etc) in order to use it.
Because only tour detail pages has map element, so we need to check first before running the code. */
const mapBox = document.getElementById('map');
const logOutBtn = document.querySelector('.nav__el--logout');
/* For a form, we should place the selector on the <form> tag, not inside of it. Because we need to listen to the event of "submit". And when that event fires up, we need those details inside the whole form. */
const userDataForm = document.querySelector('.form-user-data');
const userPasswordForm = document.querySelector('.form-user-password');
const bookBtn = document.getElementById('book-tour');

// If we are in /tour route, then only execute these lines.
if (mapBox) {
  const locations = JSON.parse(mapBox.dataset.locations);
  displayMap(locations);
}

// If we are in /login route, then only execute these lines.
if (loginForm) {
  loginForm.addEventListener('submit', (event) => {
    // Prevent the form submitted and page reload.
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    login(email, password);
  });
}

if (logOutBtn) logOutBtn.addEventListener('click', logout);

if (userDataForm)
  userDataForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    document.querySelector('.btn--save-settings').textContent = 'Updating...';
    /* To submit file(photos), we need to use a new form data object because it needs to be in a multipart type. Then we append property to it when we need. */
    const form = new FormData();
    form.append('email', document.getElementById('email').value);
    form.append('name', document.getElementById('name').value);
    /* These files are actually in array, since there's only one, we choose the first one. */
    form.append('photo', document.getElementById('photo').files[0]);
    /* Axios can handle the form data object, we can pass it in directly. */
    await updateSettings(form, 'data');
    document.querySelector('.btn--save-settings').textContent = 'Save settings';
  });

/* We can notice that changing password operation is slow because of encryption. So on user interface, we should give some kind of signal that the process is going on. */
if (userPasswordForm)
  userPasswordForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    document.querySelector('.btn--save-password').textContent = 'Updating...';
    const passwordCurrent = document.getElementById('password-current').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;
    await updateSettings({ passwordCurrent, password, passwordConfirm }, 'password');

    document.querySelector('.btn--save-password').textContent = 'Save password';
    document.getElementById('password-current').value = '';
    document.getElementById('password').value = '';
    document.getElementById('password-confirm').value = '';
  });

if (bookBtn) {
  bookBtn.addEventListener('click', (event) => {
    // event.preventDefault();
    event.target.textContent = 'Processing...';
    // const tourId = event.target.dataset.tourId;
    // JS desctructing method since both tourId have exact variable name. Is the same as written as line above
    const { tourId } = event.target.dataset;
    bookTour(tourId);
  });
}

const alertMessage = document.querySelector('body').dataset.alert;
if (alertMessage) showAlert('success', alertMessage, 12);
