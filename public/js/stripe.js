import { showAlert } from './alerts';
import axios from 'axios';


export const bookTour = async (tourId) => {
  /* IMPORTANT: We must put this inside this function scope because when other page load (aside from tour details page), the bundler.js is also load as well, but Stripe CDN is only requested on tour details page, thus it will cause an error of "Stripe Is not defined" and make website broken. */
  const stripe = Stripe('pk_test_51HoUFKK8GOwFHUeJoXmWJgcGPfyLitqW9gzahgjG3bg1O2TnyLKlkb91vNDHB0vsVjh2N5mCUfvUN4xC7ckt2YSC00yJOEquYU');
  
  try {
    // STEP 1: Get checkout session from our server
    /* Notice if we just do axios http request, it will default to "GET" request. We made our API call to our server to generate a session object. */
    const session = await axios(`http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`);

    // STEP 2: Create checkout form & charge credit card
    /* We use the session object received from axios to ask Stripe to proceed checkout. */
    await stripe.redirectToCheckout({
      // The session id is embedded inside data property of axios returned object. 
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
