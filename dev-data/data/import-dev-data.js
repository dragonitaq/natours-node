const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Tour = require('../../models/tourModel');
const User = require('../../models/userModel');
const Review = require('../../models/reviewModel');

dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then((con) => console.log('DB connection successful'));

// We need to convert JSON to JS object.
// __dirname is an environment variable that tells you the absolute path of the directory containing the currently executing file.
const tour = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf-8'));
const user = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8'));
const review = JSON.parse(fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8'));

/* ############################### import data ############################## */

const importData = async () => {
  try {
    // If it accept an array of JS objects, then it will auto create each document for each object in that array.
    await Tour.create(tour);
    /* This will turn off all validations we have in the model. We also need to turn of middleware for .pre('save') in user model because we have already encrypted password as well as the passwordChangedAt. */
    await User.create(user, {validateBeforeSave: false});
    await Review.create(review);
    console.log('Data imported');
  } catch (err) {
    console.log(err);
  }
  // This method is force to stop node. We should not use it. But this is just script to handle data in the initial stage and we won't use this anymore in production, so that is ok.
  process.exit();
};

/* ################### Delete all data from db collection ################### */

const DeleteData = async () => {
  try {
    // If we pass nothing in, it will simply delete ALL document in that collection.
    await Tour.deleteMany();
    await User.deleteMany();
    await Review.deleteMany();
    console.log('All data deleted');
  } catch (err) {
    console.log(err);
  }
  // This method is force to stop node. We should not use it. But this is just script to handle data in the initial stage and we won't use this anymore in production, so that is ok.
  process.exit();
};

if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  DeleteData();
}

/*
Use the following text input to the command line to execute delete or import function.
node ./dev-data/data/import-dev-data.js --delete
node ./dev-data/data/import-dev-data.js --import
*/

// This will print out an array of data including file path & other commands we type in. The individual data is separated into array items based on whitespace separation.
console.log(process.argv);
