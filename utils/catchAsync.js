/* This is brilliant implementation by Joans using JS closures.
This function can wrap all async/await function and catch its error here without rely on try/catch block */

module.exports = (fn) => {
  // We return a new anonymous function which then be assigned to createTour. Because we want to leave the calling to our router.
  return (req, res, next) => {
    // catch(next) is the same as writing .catch(err => next(err)) in JS.
    fn(req, res, next).catch(next);
  };
};

/* ################## General catchAsync version ################## */

/* This version is for wrapping general async function to catch error, not Express in particular. */
/*
module.exports = (fn) => {
  fn(arg1, arg2, arg3).catch((err) => {
    // The callback here to handle err
  });
};

const catchAsync = require('./<filepath>/catchAsync');

catchAsync(async (arg1, arg2, arg3) => {
  // The core function here with await
});
*/
