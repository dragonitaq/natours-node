const mongoose = require('mongoose');
const Tour = require('../models/tourModel');

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

/* By setting this compound index with unique:true, each pair of combination must always be unique. This enable us to prevent user from writing duplicated reviews on the same tour.
Jonas said it might take a day for it into effect. But I think because MongoDB takes time to set up the indexes. */
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

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

/* #################### Mongoose Statics Method ################### */

/* Statics method add method to the Model. */

/* Calculate the average ratings every time review is updated, created or deleted. */
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  /* this keyword point to the model, that is why we can use aggregate.
  It will return an array. */
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  /* If all reviews are deleted, means the return stats array is empty, then we go back to default values. */
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

/* We do post middleware because we only want the statistic after the review is created/updated in the DB.
Notice post middleware doesn't have next() method. */
reviewSchema.post('save', async function () {
  /* Because we need to call aggregate on a Model but not on document, so use this.constructor to point to its model.
  this.tour point to document which field has tour id value with it. */
  this.constructor.calcAverageRatings(this.tour);
});

/* #################### COMPLICATED VERSION!!! #################### */

/* Jonas showed us how to pass data from pre to post middleware by attach a new property of "rvw" (review) to "this" keyword. */

/* findByIdAndUpdate & findByIdAndDelete both will perform "findOneAnd" behind the scene. So in here, we can't trace the shorthand method, instead we need to trace the behind-the-scene method. */
// reviewSchema.pre(/^findOneAnd/, async function (next) {
//   /* Since this is a query, this keyword points to query object. But we need to use the return doc object. So we instantly do another query of findOne() right in this middleware and get that returned doc. I'm surprised that we can do another query right in this middleware. Is like middleware inside a middleware. Confused as heck.

//   Keep in mind that returned document is yet to be deleted nor updated, is the old version of it. But it doesn't matter since we just want to get its tour id. Then we attach this doc into a variable (rvw) attached to "this" keyword which is the query object. */
//   this.rvw = await this.findOne();
//   next();
// });

// /* IT'S SURPRISED TO SEE "THIS" KEYWORD PRESERVES THE VALUE OF rvw FROM QUERY OBJECT TO DOCUMENT OBJECT. */

// reviewSchema.post(/^findOneAnd/, async function () {
//   /* await this.findOne(); does NOT work here since query has already executed.
//   We retrieve the rvw property from "this" keyword from the return process then point to its constructor (model) and call our statics calcAverageRatings function. */
//   await this.rvw.constructor.calcAverageRatings(this.rvw.tour);
// });

/* ####################### SIMPLE VERSION!!! ###################### */

/* We can have this simple version because both delete & update returned the doc that system found! */
reviewSchema.post(/^findOneAnd/, async function (doc) {
  if (doc) {
    await doc.constructor.calcAverageRatings(doc.tour);
  }
});

/* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
