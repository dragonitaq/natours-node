const morgan = require('morgan');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');

// First we store the express into const express.
const express = require('express');
// Then we execute the express function which in return starts our application.
const app = express();
// The shorthand is as below:
// const app = require('express')();

/* REMEMBER: When we want middleware to run for EVERY request (no matter what route), we use app.use() and put it into this app.js file. */

/* This is third party middleware.
morgan doesn't log to the console until the response is sent back to the client. That is why we see it log at last in console even it runs first. We can change that in morgan's settings though.
We only want to use morgan in development, not in production. */
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

/* This is built-in middleware.
In this step, we convert the data from the body (JSON) to JS object. In another word, the express.json() middleware parses the JSON into a JavaScript object and puts it on req.body.
Express.json() and body-parser are the same. */
app.use(express.json());

/* Method to serve static folder which is not from a route. */
app.use(express.static(`${__dirname}/public`));

/* This is our own middleware.
MUST use next() in all the middleware. If not, the middleware will stuck in process. */
// app.use((req, res, next) => {
//   console.log('Hello from middleware!');
//   next();
// });

// Here we just inject extra info which is the request time into req object in middleware.
// app.use((req, res, next) => {
//   req.requestTime = new Date().toISOString();
//   console.log(req.requestTime);
//   next();
// });

/* ########################## HTTP routes / methods ######################### */

/* Here tourRouter is the router object that we exported from the tourRoutes.js file. Same goes to userRouter. We are mounting a new router, Router() on a route, '/api/v1/tours'
Another words, we "mounted" the tourRouter onto the '/api/v1/tours route' */
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);

/* We MUST place these code at the last order of our routes. Because this is where we accept all unhandled URL. */
app.all('*', (req, res, next) => {
  // const err = new Error(`Can't find ${req.originalUrl}`); // This become the err.message
  // err.statusCode = 404;
  // err.status = 'fail';

  /* If a next function receive any argument, Express will immediate knows and treats it as an error for any subsequent next(). Thus it will skip all the next() and send the error to our global error handling middleware. */
  next(new AppError(`Can't find ${req.originalUrl}`, 404));
});

/* ##################### Global error handler ##################### */

app.use(globalErrorHandler);

module.exports = app;
