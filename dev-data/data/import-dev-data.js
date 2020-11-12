const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Tour = require('../../models/tourModel');

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
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf-8'));

/* ############################### import data ############################## */

const importData = async () => {
  try {
    // If it accept an array of JS objects, then it will auto create each document for each object in that array.
    await Tour.create(tours);
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

// This will print out an array of data including file path & other commands we type in. The individual data is separated into array items based on whitespace separation.
console.log(process.argv);
