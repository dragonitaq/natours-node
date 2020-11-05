const mongoose = require('mongoose');

// We can use set timestamps to true which will automatically create 2 fields: createdAt and updatedAt.
// const tourSchema = new mongoose.Schema( {<All value pairs here>}, {timestamps: true})
const tourScheme = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A tour must have a name'],
    unique: [true],
    // This will remove all white space at the beginning & ending of the string.
    trim: true,
  },
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
  },
  ratingsAverage: {
    type: Number,
    default: 4.5,
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
});

/* We use capital T for Tour because that is convention for model in mongoose. I think the reason is because it serves as a document constructor to create document.
  We should use singular name for the first argument for our collection, then mongoose will turn it into a lowercase plural version ("tours", in this case)
  Then it automatically creates a "tours" collection. */
const Tour = mongoose.model('Tour', tourScheme);

module.exports = Tour;

/* ################################## Note ################################## */

/* Sub-documents are documents embedded in other documents. In Mongoose, this means you can nest schemas in other schemas. Mongoose has two distinct notions of sub-documents: arrays of sub-documents and single nested sub-documents. */

// const childSchema = new Schema({ name: 'string' });

// const parentSchema = new Schema({
//   // Array of sub-documents
//   children: [childSchema],
//   // Single nested sub-documents
//   child: childSchema,
// });
