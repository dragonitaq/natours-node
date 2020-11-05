const mongoose = require('mongoose');
const dotenv = require('dotenv');
/* Method to link config.env into node. We pass in an object which has property of path. This will make dotenv to read our data in config.env and save it into node environmental variables.
REMEMBER: Always to config right after defining dotenv. */
dotenv.config({ path: './config.env' });
// console.log(process.env);

// Require app ONLY AFTER config our environmental variables.
const app = require('./app');

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

/* ############################## Start server ############################## */

// We run nodemon server.js for this file because this is where the app.listen is.

const port = 3000 || process.env.PORT;
app.listen(port, () => {
  console.log(`Server is live on port ${port}`);
});
