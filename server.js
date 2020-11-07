/* ################### Handle uncaughtException ################### */

/* All errors/bugs for synchronous code that are not handled anywhere are called uncaught exceptions.
This should be at top here in order to catch all synchronous code errors. */
process.on('uncaughtException', (err) => {
  console.error(`Error occurred at ${new Date()}`);
  console.error(err);
  console.log('UNCAUGHT EXCEPTION! Shutting down...');
  /* We need to crash our node app because uncaughtException will make entire node process in a so-called unclean state. */
  process.exit(1);
});
// console.log(x);

const mongoose = require('mongoose');
const dotenv = require('dotenv');

/* Method to link config.env into node. We pass in an object which has property of path. This will make dotenv to read our data in config.env and save it into node environmental variables.
REMEMBER: Always to config right after defining dotenv. */
dotenv.config({ path: './config.env' });
// console.log(process.env);

// Require app ONLY AFTER config our environmental variables.
const app = require('./app');

const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);

// Connect to mongo server. We don't use async/await because it only runs once time during initialization.
mongoose
  .connect(DB, {
    // These are to deal with deprecation warning
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    // mongoose connect will return an promise object.
  })
  .then((con) => console.log('Database connected'));
/* We should catch the error here instead of catching in process.on('unhandledRejection'). But in this case, we just demo how to catch it in there. */

/* ############################## Start server ############################## */

// We run nodemon server.js for this file because this is where the app.listen is.

const port = 3000 || process.env.PORT; // FIXME Why the OR logic doesn't work?
const server = app.listen(port, () => {
  console.log('Server is live at port 3000');
});

/* ################### Handle unhandledRejection ################## */

/* All unhandled promise rejections are handled here. This means any other promise rejection that we might not catch somewhere in the app will be handled here. This is the safety net. */
process.on('unhandledRejection', (err) => {
  /* Just a personal preference how you want to log the error. */
  console.error(`Error occurred at ${new Date()}`);
  // console.log(err.name, err.message);
  console.error(err);
  /* We give server time to finish all requests that are still pending or handling at thattime. Only after that, the server is killed.
  Notice we don't use async/await here because this will be the last process on the app, we don't worry about blocking any code. */
  console.log('UNHANDLED REJECTION! Shutting down...');
  server.close(() => {
    // Code 0 stands for success, code 1 stands for uncaught exception.
    process.exit(1); // This will terminate app abruptly if we don't first do server.close().
  });
});
