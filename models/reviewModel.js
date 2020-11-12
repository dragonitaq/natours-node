const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'A review must have content'],
    },
    rating: {
      type: Number,
      required: [true, 'A review must have rating'],
      min: [1, 'A rating must have minimum of 1'],
      max: [5, 'A rating must have maximum of 5'],
    },
    createAt: {
      type: Date,
      default: Date.now(),
    },

    /* ###################### Parent referencing ###################### */

    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  /* We comment out code below to avoid chain of populating. Refer lecture 156 @ 8:08*/
  // this.populate({
  //   path: 'tour',
  //   select: 'name',
  // }).populate({
  //   path: 'user',
  //   select: 'name photo',
  // });

  /* Because tour middleware, we always see the full guides' details. We can hide the them like below. Be sure to put "-guides" at first, otherwise you get an error (Projection cannot have a mix of inclusion and exclusion). */
  // this.populate({ path: 'tour', select: '-guides _id name' }).populate({ path: 'reviewBy', select: '_id username' });

  /* I discovered that we can input 2 different schema into the path string value to query together in on shot. However, using this method you are restricted to apply your selected field to both the query. */
  // this.populate({
  //   path: 'tour user',
  //   select: '-__v -passwordChangedAt',
  // });
  next();
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
