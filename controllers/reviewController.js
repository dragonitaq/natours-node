const Review = require('../models/reviewModel');
const AppError = require('../utils/appError');
// const AppError = require('../utils/appError');
// const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

exports.getAllReviews = factory.getAll(Review);

// exports.getAllReviews = catchAsync(async (req, res, next) => {
//   // Check if req is for particular tour or all reviews in general.
//   let filter = {};
//   if (req.params.tourId) filter = { tour: req.params.tourId };
//   /* If there is tourId in params, then in the find() we specify to find that one tour & its all reviews. */
//   const reviews = await Review.find();

//   res.status(200).json({
//     status: 'success',
//     results: reviews.length,
//     data: {
//       reviews,
//     },
//   });
// });

// NESTED ROUTE. This is to handle POST request when user doesn't specify tour id & user id.
exports.setTourUserIds = (req, res, next) => {
  if (!req.body.tour) req.body.tour = req.params.tourId;
  // We want to avoid user to manually input their user id which can be potentially faking as role:user. So we get req.user from authController.protect
  req.body.user = req.user.id;
  next();
};

exports.createReview = factory.createOne(Review);

// exports.createReview = catchAsync(async (req, res, next) => {
//   const newReview = await Review.create(req.body);
//   res.status(201).json({
//     status: 'success',
//     data: {
//       review: newReview,
//     },
//   });
// });

/* This solution is proposed by student, Mimas. This is to prevent users to edit/delete other users' review. */
exports.checkIfAuthor = async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    return next(new AppError('There is no such review', 404));
  }
  if (req.user.role !== 'admin') {
    if (review.user.id !== req.user.id) {
      return next(new AppError(`You cannot edit someone else's review.`, 403));
    }
  }
  next();
};

exports.getReview = factory.getOne(Review);

exports.updateReview = factory.updateOne(Review);

exports.deleteReview = factory.deleteOne(Review);
