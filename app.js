// const { json } = require('express');
const morgan = require('morgan');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');

// First we store the express into const express.
const express = require('express');
// Then we execute the express function which in return starts our application.
const app = express();
// The shorthand is as below:
// const app = require('express')();

/* ############################### Middleware ############################### */

/* This is the middleware where all the requests will go through for processing. The order of code matters! */

/* This is third party middleware.
morgan doesn't log to the console until the response is sent back to the client. That is why we see it log at last in console even it runs first. We can change that in morgan's settings though.
We only want to use morgan in development, not in production. */
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

/* This is built-in middleware.
In this step, we add the data from the body to the request object. In another word, the express.json() middleware parses the JSON into a JavaScript object and puts it on req.body.
Express.json() and body-parser are the same. */
app.use(express.json());

/* Method to serve static folder which is not from a route. */
app.use(express.static(`${__dirname}/public`));

/* This is our own middleware.
MUST use next() in all the middleware. If not, the middleware will stuck in process. */
app.use((req, res, next) => {
  console.log('Hello from middleware!');
  next();
});

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  console.log(req.requestTime);
  next();
});

/* ########################## HTTP routes / methods ######################### */

// z is optional in this case: '/api/v1/tours/:x/:y/:z?'

// app.get('/api/v1/tours', getAllTours);
// app.get('/api/v1/tours/:id', getTour);
// app.post('/api/v1/tours', createTour);
// app.patch('/api/v1/tours/:id', updateTour);
// app.delete('/api/v1/tours/:id', deleteTour);

// app.route('/api/v1/tours').get(getAllTours).post(createTour);
// app.route('/api/v1/tours/:id').get(getTour).patch(updateTour).delete(deleteTour);
// app.route('/api/v1/users').get(getAllUsers).post(createUser);
// app.route('/api/v1/users/:id').get(getUser).patch(updateUser).delete(deleteUser);

/* We perform something here call Mounting Router. This is also called sub application.
This is indeed a middleware to handle routing.
In my own words, route, just like the one we have at home, is routing route to the direction we specify. In this case, when the req hit the specify route we specify in app.use(), then we route it to our desire route. */

/* Here tourRouter is the router object that we exported from the tourRoutes.js file. Same goes to userRouter. We are mounting a new router, Router() on a route, '/api/v1/tours'
Another words, we "mounted" the tourRouter onto the '/api/v1/tours route' */
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);

module.exports = app;

/* ################################## Note ################################## */

/*
Middleware allows you to call a function for each request that comes in. The alternative would be to call the function in a controller, but then you have to repeat it in every controller. Middleware lets you define it in a single place and have all the requests pass through it.

req-res cycle ends immediately right after whenever we send something with res. Any code down the line to handle that req-res will not apply.

*/
