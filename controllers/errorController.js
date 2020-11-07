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

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    error: err,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  // For operational & trusted error, wend to client side.
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
    // For programming & unexpected error, we don't leak error details
  } else {
    // 1) Log the error
    console.error('Non-operational error!', err);
    // 2) Send only generic message to client side.
    res.status(err.statusCode).json({
      status: 'Error',
      message: 'Something went wrong.',
    });
  }
};

/* When we pass 4 argument in this function, Express immediately know is the global error handling middleware. */
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    /* Handle value with wrong format (CastError).
    It is good practice to not mutate original error from mongoose, so we create a hardcopy of it. */
    let error = { ...err };
    /* We lost error.name property once we clone this object. This is because mongoose's changes from v5.6 and later. However, since we just use the name value only once to do logical operation, we can use err.name instead of error.name
    Mega thread discussion about this issue here: https://www.udemy.com/course/nodejs-express-mongodb-bootcamp/learn/lecture/15065218#questions/11651594 */
    if (err.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error._message === 'Validation failed') error = handleValidationErrorDB(error);
    sendErrorProd(error, res);
  }
};
