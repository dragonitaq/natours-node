const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('../models/tourModel');
const User = require('../models/userModel');
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
    // Upon successful payment, we direct them to their booked tours page.
    success_url: `${req.protocol}://${req.get('host')}/my-tours?alert=booking`,
    // Upon payment cancellation, we redirect them to the current tour page that they've cancelled. Default is GET method.
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    // This will have Stripe auto fill in customer email in the checkout page
    customer_email: req.user.email,
    /* We create our own custom field onto session object (Yes we can do that!). We need it to specify tour ID because after payment success, stripe will return us the same session object and this information that we attached to this session object will get back as well. Then we need to use this information(tour ID & user email) to create a new booking in our DB. */
    client_reference_id: req.params.tourId,

    // DETAILS ABOUT THE PRODUCT

    line_items: [
      {
        name: `${tour.name} Tour`,
        description: tour.summary,
        /* This must be live images which the images must be hosted on a real website for public to gain access. */
        images: [`${req.protocol}://${req.get('host')}/img/tours/${tour.imageCover}`],
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

const createBookingCheckout = catchAsync(async (session) => {
  /* We then extract all the data we need from the session object that we configured earlier. */
  const tourId = session.client_reference_id;
  // We wrap await function because we just want the id property of the returned user doc.
  const userId = (await User.findOne({ email: session.customer_email })).id;
  // No idea why line_items changed to display_items after session object returned.
  const price = session.amount_total / 100;
  await Booking.create({ tour: tourId, user: userId, price });
});

exports.webhookCheckout = (req, res, next) => {
  const signature = req.headers['stripe-signature'];
  let event;
  try {
    /* This is to use the signature from Stripe and combine with our webhook secret key to create an event which contains our session object which we will use to create new booking. */
    event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }
  /* event.data.object is the same exact session object that we created in getCheckoutSession() function. */
  if (event.type === 'checkout.session.completed') createBookingCheckout(event.data.object);

  res.status(200).json({ received: true });
};

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBooking = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
