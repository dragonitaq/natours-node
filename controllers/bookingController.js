const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('../models/tourModel');
const Booking = require('../models/bookingModel');
const APIFeatures = require('../utils/apiFeatures');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // const stripe = Stripe(process.env.STRIPE_SECRET_KEY)
  // STEP 1: Get current booked tour details
  const tour = await Tour.findById(req.params.tourId);

  // STEP 2: Create checkout session
  const session = await stripe.checkout.sessions.create({
    // DETAILS ABOUT THE SESSION

    /* There are 3 mandatory fields which are payment method types, success & cancel url.
    Payment type is in an array because in future stripe will implement more methods. */
    payment_method_types: ['card'],
    /* Upon payment success, we redirect them to our home route. Default is GET method so we can't set body details. For temporary solution before deploy website to public, we user query string to pass back data into our server.
    BEWARE: This temporary method is NOT SECURE because any user who knows this url can inject their booking details without going through payment. */
    success_url: `${req.protocol}://${req.get('host')}/?tour=${req.params.tourId}&user=${req.user.id}&price=${tour.price}`,
    // Upon payment cancellation, we redirect them to the current tour page that they've cancelled. Default is GET method.
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    // This will have Stripe auto fill in customer email in the checkout page
    customer_email: req.user.email,
    /* We create our custom field (we can do that?!). We need it to specify tour ID because after payment success, stripe will return us the session object and this information that we attached to this session object will get back as well. Then we need to use this information(tour ID & user email) to create a new booking in our DB. */
    client_reference_id: req.params.tourId,

    // DETAILS ABOUT THE PRODUCT

    line_items: [
      {
        name: `${tour.name} Tour`,
        description: tour.summary,
        /* This must be live images which the images must be hosted on a real website for public to gain access. */
        images: [`https://www.natours.dev/img/tours/${tour.imageCover}`],
        // Stripe expect amount to be in cent unit base on your currently. They called it as zero-decimal currency.
        amount: tour.price * 100,
        currency: 'myr',
        quantity: 1,
      },
    ],
  });

  // STEP 3: Create session as response
  res.status(200).json({
    status: 'success',
    session,
  });
});

/* REVIEW Temporary NOT SECURE solution. */
/* After payment, we direct user to success_url in which we all query string in place. Then we extract the query info and create a booking into DB. Then we redirect them to home route where there is not query string present. This function will check that there's no query string, then call next() and in the end, viewController.getOverview will render home page. */
exports.createBookingCheckout = catchAsync(async (req, res, next) => {
  const { tour, user, price } = req.query;
  /* Any of the data is not present we call next() because our DB needs all of these. */
  if (!tour || !user || !price) return next();
  await Booking.create({ tour, user, price });

  /* The whole success_url won't show up in user URL bar because we catch the request using this middleware then redirect into our home route using code below. What user actually only see is the response-redirected address in URL bar. */
  res.redirect(req.originalUrl.split('?')[0]);
});

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBooking = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
