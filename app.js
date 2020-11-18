const path = require('path');
const morgan = require('morgan');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoute');
const viewRouter = require('./routes/viewRoute');
const bookingRouter = require('./routes/bookingRoute');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');

// First we store the express into const express.
const express = require('express');
// Then we execute the express function which in return starts our application.
const app = express();
// The shorthand is as below:
// const app = require('express')();

/* Because heroku redirect all request using proxy and modify them before reaching our server, so we need to enable 'trust proxy' which is a feature that Express offer. */
app.enable('trust proxy');

/* Setting/telling Express which templating engine we are using in this project. Express supports many common engines. */
app.set('view engine', 'pug');
/* This is a weird way to combine string. Jonas said because we don't know the path we receive from somewhere consists of slash or not. This way we no need think of it because Node will automatically create the path. */
app.set('views', path.join(__dirname, 'views'));

/* @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ */
/*                         Global middleware                        */
/* @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ */

/* REMEMBER: When we want middleware to run for EVERY request (no matter what route), we use app.use() and put it into this app.js file. */

/* ################### Set security HTTP headers ################## */

/* In app.use(), we should only put in function but not executing it. In this case, helmet() will return a function that will be waiting to be called.
Use helmet as early as possible in middle to ensure secure headers to be set. */
app.use(helmet());

/* We have to set manually customize as below for mapbox to work. This is because browsers use strict content security policies and not allowing external requests to endpoints other than specified in headers of the response. I have no idea what settings are done here exactly. */
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'", 'https:', 'http:', 'data:', 'ws:'],
      baseUri: ["'self'"],
      fontSrc: ["'self'", 'https:', 'http:', 'data:'],
      scriptSrc: ["'self'", 'https:', 'http:', 'blob:'],
      styleSrc: ["'self'", 'https:', 'http:', 'unsafe-inline'],
    },
  })
);

/* ###################### Development logging ##################### */

/* This is third party middleware.
morgan doesn't log to the console until the response is sent back to the client. That is why we see it log at last in console even it runs first. We can change that in morgan's settings though.
We only want to use morgan in development, not in production. */
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

/* ####################### Limiting request ####################### */

/* This is to prevent DOS attack. In reality, we need to play around with these number to adapt to our app's nature.
IMPORTANT: Whenever we reboot the app, these counters will reset! */
const limiter = rateLimit({
  max: 100,
  windowMS: 60 * 60 * 1000,
  message: 'Too many request from this IP',
});
/* We have the option to specify which route has the limiter in place. */
app.use('/api', limiter);

/* ########################## Body parser ######################### */

/* This is built-in middleware.
In this step, we convert the data from the body (JSON) to JS object. In another word, the express.json() middleware parses the JSON into a JavaScript object and puts it on req.body. Express.json() and body-parser are the same thing.
We set the limit of data from the body only can have max of 10kb. */
app.use(express.json({ limit: '10kb' }));

/* ########################## URL encoded ######################### */

/* Because browser will always send encoded URL to our server, we need to decode it in order to ready the body. */
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

/* ######################## Cookies parser ######################## */
/* We use third party package to parse data from the cookies. This way we can access cookies via req.cookies. */
app.use(cookieParser());

// We start sanitization only after we parse into JS object.

/* ############## Sanitize for NoSQL query injection ############## */

/* It will read request body, request query string, request params and filter out all dollar and dot signs. */

app.use(mongoSanitize());

/* ####################### Sanitize for XSS ####################### */

/* This will prevent user input malicious HTML code with some JS script inside and later inject into our HTML site, which can cause damage. It prevents by convert html symbols into non-HTML symbols.
It will convert from this "<div id='bad-code'>Name</div>" to this "&lt;div id='bad-code'>Name&lt;/div>" */

app.use(xss());

/* ################# Prevent parameters pollution ################# */

/* We should use this by the end because it is to clear up query string. */

app.use(
  hpp({
    whitelist: ['duration', 'ratingsQuantity', 'ratingsAverage', 'maxGroupSize', 'difficulty', 'price'],
  })
);

/* ###################### Serve static files ###################### */

/* Method to serve static folder which is not from a route. */
app.use(express.static(path.join(__dirname, 'public')));

/* ####################### Text compression ####################### */

/* This will return a middleware function which will compress all text ONLY file before sending out. */
app.use(compression());

/* ###################### Testing middleware ###################### */

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

/* @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ */
/*                       HTTP routes / methods                      */
/* @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ */

/* Here tourRouter is the router object that we exported from the tourRoutes.js file. Same goes to userRouter. We are mounting a new router, Router() on a route, '/api/v1/tours'
Another words, we "mounted" the tourRouter (they call mini app) onto the '/api/v1/tours route' */
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

/* We MUST place these code at the last order of our routes. Because this is where we accept all unhandled URL. */
app.all('*', (req, res, next) => {
  // const err = new Error(`Can't find ${req.originalUrl}`); // This become the err.message
  // err.statusCode = 404;
  // err.status = 'fail';

  /* If a next function receive any argument, Express will immediate knows and treats it as an error for any subsequent next(). Thus it will skip all the next() and send the error to our global error handling middleware. */
  next(new AppError(`Can't find ${req.originalUrl}`, 404));
});

/* @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ */
/*                       Global error handler                       */
/* @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ */

app.use(globalErrorHandler);

module.exports = app;
