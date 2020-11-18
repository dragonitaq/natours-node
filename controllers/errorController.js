const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}:${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  /* Because we have "KeyValue" : {"name" : "The Forest Hiker"} in err object. And the "name" field can be other field in our schema with unique:true that we specify in the future.
  So we use Object.values to convert the object properties' value into an array. This way regardless if the unique field is name or email or whatever, we can always extract its value.
  They say error object will only send the first error it finds so the array will only have 1 item. */
  const value = Object.values(err.keyValue)[0];
  const message = `Duplicate field value: ${value}. Please use other value.`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () => new AppError('Invalid token. Please log in again.', 401);

const handleJWTExpiredError = () => new AppError('Your token has expired! Please log in again.', 401);

const sendErrorDev = (err, req, res) => {
  /* OriginalURL is the url without the domain(host). */
  // Check if error come from api requesting.
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      error: err,
      stack: err.stack,
    });
  }
  console.error('Error.', err);
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong.',
    msg: err.message,
  });
};

const sendErrorProd = (err, req, res) => {
  // Check if error come from api requesting.
  if (req.originalUrl.startsWith('/api')) {
    // For operational & trusted error, wend to client side.
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
      // For programming & unexpected error, we don't leak error details
    }
    // 1) Log the error
    console.error('Non-operational error!', err);
    // 2) Send only generic message to client side.
    return res.status(err.statusCode).json({
      status: 'Error',
      message: 'Something went wrong.',
    });
  }
  // check if error come from rendered pages.
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong.',
      msg: err.message,
    });
  }
  // 1) Log the error
  console.error('Non-operational error!', err);
  // 2) Send only generic message to client side.
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong.',
    msg: 'Please try again later.',
  });
};

/* When we pass 4 argument in this function, Express immediately know is the global error handling middleware. */
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    /* It is good practice to not mutate original error from mongoose, so we create a hardcopy of it.
    But this creates a lot of issue down the road. Because some properties is not on the err object itself but on the parent class. I'm not 100% sure what is going on. */
    let error = { ...err };
    /* They said because the message property are on the parent err object (inherent?), so we have to manually assign. */
    error.message = err.message;
    /* We lost error.name property once we clone this object. This is because mongoose's changes from v5.6 and later. However, since we just use the name value only once to do logical operation, we can use err.name instead of error.name
    Mega thread discussion about this issue here: https://www.udemy.com/course/nodejs-express-mongodb-bootcamp/learn/lecture/15065218#questions/11651594 */
    if (err.name === 'CastError') error = handleCastErrorDB(error);

    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error._message === 'Validation failed') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

    sendErrorProd(error, req, res);
  }
};
