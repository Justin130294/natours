/* eslint-disable */

export const hideAlert = () => {
  // Find the alert element
  const el = document.querySelector('.alert');
  // Remove the alert element
  if (el) el.parentElement.removeChild(el);
};

// type is 'success' or 'error'
export const showAlert = (type, message) => {
  // Define alert markup
  const markup = `<div class="alert alert--${type}">${message}</div>`;
  // Insert markup immediately after the body tag.
  document.querySelector('body').insertAdjacentHTML('afterbegin', markup);
  // Hide the alert after 5 seconds
  window.setTimeout(hideAlert, 5000);
};
