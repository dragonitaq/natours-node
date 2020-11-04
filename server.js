const mongoose = require('mongoose');
const dotenv = require('dotenv');
const app = require('./app');

/* Method to link config.env into node. We pass in an object which has property of path. This will make dotenv to read our data in config.env and save it into node environmental variables. */
dotenv.config({ path: './config.env' });
// console.log(process.env);

const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);

mongoose
  .connect(DB, {
    // These are to deal with deprecation warning
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    // mongoose connect will return an promise object.
  })
  .then((con) => console.log('DB connection successful'));

const tourScheme = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A tour must have a name'],
    unique: [true],
  },
  rating: {
    type: Number,
    default: 4.5,
  },
  price: {
    type: Number,
    required: [true, 'A tour must have a name'],
  },
});

/* We use capital T for Tour because that is convention for model in mongoose. I think the reason is because it serves as a document constructor to create document.
  We should use singular name for the first argument for our collection, then mongoose will turn it into a lowercase plural version ("tours", in this case)
  Then it automatically creates a "tours" collection. */
const Tour = mongoose.model('Tour', tourScheme);

module.exports = Tour;

/* In case of mongoose auto-generate weird plural name, then we can manually pass in our defined collection name.
  const Tour = new mongoose.model('Tour', tourSchema, 'tourMany'); // <-- passed in collection name 'tourMany' */

// Here we create a document instance
const testTour = new Tour({
  name: 'The Forest Hiker',
  rating: 4.7,
  price: 500,
});

// Here we save the document instance into database. This save will return a promise which is the final document as in the database.
testTour
  .save()
  .then((doc) => {
    console.log(doc);
  })
  .catch((err) => {
    console.log(err);
  });

/* The Schema is how the data is going to look, what properties are going to be on it and their types for validation checking. 
  The model is the constructor that let's use create new documents, and these new documents will be checked if they match our schema.
  You can think of it as the schema is the blueprint of how to make something, the model is the machine that makes it. */

/* ############################## Start server ############################## */

// We run nodemon server.js for this file because this is where the app.listen is.

const port = 3000 || process.env.PORT;
app.listen(port, () => {
  console.log(`Server is live on port ${port}`);
});
