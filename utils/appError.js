class AppError extends Error {
  constructor(message, statusCode) {
    super(message); // In this case message is the only argument for the build in Error class to accept.

    this.statusCode = statusCode;
    // We don't pass in status here because we want to self-generate it base on statusCode.
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    // We do this because we only want to send error back to client ONLY when it's operational. We might get unexpected error or weird error and in that case, we don't want to send to client side.
    this.isOperational = true;

    /* When a new object is created & when constructor function is called, this to prevent the constructor method from appearing in the stack trace. That is because we want to add a bit of extra security through obscurity. If a malicious end user can see what technology the site is running on they can select attacks specifically for that. If they can't see the stack then there are many more vectors that they would need to consider/attempt. */
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
