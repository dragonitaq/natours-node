const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const APIFeatures = require('../utils/apiFeatures');

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    // if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
    //   return next(new AppError('Invalid ID', 400));
    // }
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(204);
    res.json({
      status: 'success',
      // Common practice is not to send anything back when perform delete.
      data: null,
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    // if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
    //   return next(new AppError('Invalid ID', 400));
    // }
    // We have to set the body as in JSON, not text format in Postman for it to work. Don't know why.
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      // By setting true to 'new', we ask mongoose to send back the newly updated document. If not, the returned doc is old version.
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200);
    res.json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const newDoc = await Model.create(req.body);
    res.status(201);
    res.json({
      status: 'success',
      data: newDoc,
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOptions) query = query.populate(popOptions);
    const doc = await query;

    // If req.params.id is a valid id format that mongo can cast to ObjectId, then it will execute findById() EVEN if that id doesn't exist. In this case, it will return null instead of error. So we have to handle it manually.

    if (!doc) {
      return next(new AppError('No tour found with that ID', 404));
      /* We have the option to redirect user to home route if the request params are not valid. */
      // return res.redirect('/');
    }

    res.status(200);
    res.json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

// REVIEW Currently when this method applies to review, it will get all the reviews regardless of the specified tour.
exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    /* ############### Allow getReview on specific tour ############### */

    // Check if req is for particular tour or all reviews in general.
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };
    /* If there is tourId in params, then in the find() we specify to find that one tour & its all reviews. */

    /* ######################### API features ######################### */

    const features = new APIFeatures(Model.find(filter), req.query).filter().sort().limitFields().paginate();

    /* ######################### Execute query ######################## */

    // Query middleware executes here before await query.
    const doc = await features.query;

    /* We can user .explain() to have MongoDB to return statistical result for analysis. */
    // const doc = await features.query.explain();

    /* ########################### Response ########################### */

    // Is good practice to always specify the status code.
    res.status(200);
    // Sending data in JSON format in Express save the work of defining its content-type.
    res.json({
      status: 'success',
      // When we send multiple objects, it's good practice to include array length. This will let the client knows how many piece of data coming in. Though is not a practice from JSend.
      results: doc.length,
      data: {
        data: doc,
      },
    });
  });
