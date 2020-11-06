const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');

// We can use set timestamps to true which will automatically create 2 fields: createdAt and updatedAt.
// const tourSchema = new mongoose.Schema( {<All value pairs here>}, {timestamps: true})
const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: [true],
      // This will remove all white space at the beginning & ending of the string.
      trim: true,
      maxlength: [40, 'A tour name must have less or equal than 40 characters'],
      minlength: [40, 'A tour name must have more or equal than 10 characters'],
      validate: {
        validator: function (val) {
          return validator.isAlpha(val.split(' ').join(''));
        },
        message: 'Tour name must only contain characters',
      },
    },
    // For testing document middleware purpose
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      lowercase: true,
      enum: {
        // enum only works for string. This is the actual way of writing without shorthand like in 'required'.
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either: easy, medium, difficult',
      },
    },
    ratingsAverage: {
      // Here seems to have issue. When user keys in value not match validator, mongoose will default to 4.5 instead.
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'], // This min & max also work for dates.
      max: [5, 'Rating must be below 5.0'],
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
      // In case we want to prevent user accessing our price
      // select: false,
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          /* validator expects boolean result. val is the value of priceDiscount.
          this keyword ONLY points to NEW document. Thus this function only works when creating, not updating. */
          return val < this.price; // If return true will pass, if return false will trigger validation error.
        },
        message: 'Discount price ({VALUE}) should below regular price', // The ({VALUE}) is the value of price discount. This is Mongoose special way of accessing the value.
      },
    },
    summary: {
      type: String,
      // This will remove all white space at the beginning & ending of the string.
      trim: true,
      required: [true, 'A tour must have a summary'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      // We put string here because it actually a reference text link for us to work with.
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    // Here we want to store multiple image references. So we put type string into array like below. It will have an array with multiple string values in it.
    images: [String],
    createdAt: {
      type: Date,
      /* Mongoose will convert to today's date which is readable. Also Mongoose will automatically parse our input date string into data type. If fail, it will throw error. */
      default: Date.now(),
      // Here we make this field default to be hidden from sending to client. Good for sensitive data. But client still can access by using domain.com/?fields=createdAt. So must be cautious.
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
  },
  {
    //We need to explicitly state that every time we output JSON & object, we want to include the virtual properties.
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    // Way to remove the auto-assign id virtual getter field here. I found solution myself.
    // id: false,
  }
);

/* ###################### Virtual properties ###################### */

/* We cannot use arrow function because it doesn't get its own this keyword. We need this keyword to point to the current document.
Bear in mind we cannot query this virtual property because they are technically not in the db.  */

// tourSchema.virtual('durationWeeks').get(function () {
//   /* If when we query without including duration field, then duration is not available for calculation and it will return null. So we check first if duration is exist in the query the only perform this calculation. */
//   if (this.duration) return this.duration / 7;
// });

/* If we want mongoose manually to output 'id' in JSON, we can utilize virtual property method as below. But remember whenever we use virtual property, mongoose will auto-assign id virtual getter as 'id'. */
// tourSchema.virtual('id').get(function () {
//   return this._id.toHexString();
// });

/* If we want remove _id in JSON. Do as below. */
// tourSchema.set('toJSON', {
//   virtuals: true,
//   versionKey: false,
//   transform: function (doc, ret) {
//     delete ret._id;
//   },
// });

/* ###################### Document middleware ##################### */

/* Using .pre, it runs before .save() & .create(), BUT NOT .insertMany(), findOneAndUpdate(), FindByIDAndUpdate()
We will see the _id value being generated even this is a pre-hook middleware (data not yet save into db) because MongoDB ObjectIDs are generated client-side and not within MongoDB itself.
The 'save' is called hook. We also can call this as pre-save hook middleware. We can have multiple pre & post functions inside the middleware. Just remember to call next() for it to proceed to follow the order of our code. */

// tourSchema.pre('save', function (next) {
//   // this keyword points to the document object
//   this.slug = slugify(this.name, { lower: true });
//   next();
// });

// /* .post will return the newly created/saved document inside "doc". */
// tourSchema.post('save', function (doc, next) {
//   console.log(doc);
//   console.log(this);
//   next();
// });

/* ####################### Query middleware ####################### */

// /^find/ is regex denotes all strings start with 'find'. This will include findOne(), findById(), findOneAndDelete(), findOneAndUpdate().
tourSchema.pre(/^find/, function (next) {
  /* Mongoose will auto set "secretTour": false because this is how it works. It will try to populate all default data when returning resulting document, but in our actual db, there is no secretTour field if we don't set it. */
  this.find({ secretTour: { $ne: true } });
  /* this keyword points to the query object. Unlike document middleware, we cannot simply add property of slug without setting it up in our model because it is an document. However, we can add start property right in here because this points to a query object */
  this.start = Date.now();
  next();
});

tourSchema.post(/^find/, function (doc, next) {
  console.log(doc);
  /* We can access this keyword because it still points to query object. This is special for query middleware. */
  console.log(`Query took ${Date.now() - this.start} milliseconds!`);
  next();
});

/* #################### Aggregation middleware #################### */

tourSchema.pre('aggregate', function (next) {
  this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
  next();
});

/* We use capital T for Tour because that is convention for model in mongoose. I think the reason is because it serves as a document constructor to create document.
  We should use singular name for the first argument for our collection, then mongoose will turn it into a lowercase plural version ("tours", in this case)
  Then it automatically creates a "tours" collection. */
const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
