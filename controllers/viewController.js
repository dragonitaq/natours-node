const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.alerts = (req, res, next) => {
  // const alert = req.query.alert;
  // Code below is same as above
  const { alert } = req.query;
  /* The reason we ask user to check back later because Stripe stated in their doc that webhook is called a little bit after the success URL is called. */
  if (alert === 'booking') res.locals.alert = "Your booking was successful! Please check your email for confirmation. If your booking doesn't show up immediately, please check back later.";
  next();
};

exports.getOverview = catchAsync(async (req, res) => {
  // STEP 1: Get tours
  const tours = await Tour.find(); // tours is an array containing multiple doc.

  // STEP 2: Build template
  // We did in pug files

  // STEP 3: Render template
  // The data we pass in for render is called "Local".
  res.status(200).render('overview', {
    title: 'All Tours',
    tours,
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  // STEP 1: Get specified tour data
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    select: 'review rating user',
  });
  if (!tour) {
    return next(new AppError('No tour found with that name', 404));
    /* We have the option to redirect user to home route if the request params are not valid. */
    // return res.redirect('/');
  }

  // STEP 2: Build template
  // We did in pug files

  // STEP 3: Render template
  res.status(200).render('tour', {
    title: `${tour.name} Tour`,
    tour,
  });
});

exports.getLoginForm = (req, res) => {
  res.status(200).render('login', {
    title: 'Log into your account',
  });
};

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your account',
  });
};

exports.getMyTours = catchAsync(async (req, res) => {
  // STEP 1: Find all bookings belong to that user.
  const bookings = await Booking.find({ user: req.user.id });

  // STEP 2: Form an array with only all returned tour ids
  const tourIds = bookings.map((booking) => booking.tour);

  // STEP 3: Query all tours doc based on all id in tourIds
  /* We user $in to query for each element in an array (tourIds). This is how we pass in an array for query searching. */
  const tours = await Tour.find({ _id: { $in: tourIds } });

  res.status(200).render('overview', {
    title: 'My Tours',
    tours,
  });
});

exports.updateUserData = catchAsync(async (req, res, next) => {
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      name: req.body.name,
      email: req.body.email,
    },
    {
      new: true,
      runValidators: true,
    }
  );
  res.status(200).render('account', {
    title: 'Your account',
    user: updatedUser,
  });
});
