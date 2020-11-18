export const hideAlert = () => {
  const el = document.querySelector('.alert');
  if (el) el.parentElement.removeChild(el);
};

/* Type is either 'success' or 'error' is the status string text that will be produced from our server when responding.
We default time to 7 seconds. If any other fn wants to call this fn, they can specify their time here. */
export const showAlert = (type, msg, time = 5) => {
  hideAlert();
  const markup = `<div class="alert alert--${type}">${msg}</div>`;
  document.querySelector('body').insertAdjacentHTML('afterbegin', markup);
  window.setTimeout(hideAlert, time * 1000);
};
