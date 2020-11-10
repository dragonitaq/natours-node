const { query } = require('express');
const Tour = require('../models/tourModel');
const APIFeatures = require('../utils/apiFeatures');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

/* We make use of middleware to change the URL resource(slug) from '/top-5-cheap' to query '/top-5-cheap/?limit=5&sort=-ratingsAverage,price&fields=name,price,ratingsAverage,duration,summary,difficulty'
We don't want to send any request here, we just want to modify the URL. So we use next() to direct the flow to the next process of middleware. We don't use async here because we don't expect a promise return. */
exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,duration,summary,difficulty';
  next();
};

exports.getAllTours = catchAsync(async (req, res, next) => {
  /* ######################### API features ######################### */

  const features = new APIFeatures(Tour.find(), req.query).filter().sort().limitFields().paginate();

  /* ######################### Execute query ######################## */

  // Query middleware executes here before await query.
  const tours = await features.query;

  /* ########################### Response ########################### */

  // Is good practice to always specify the status code.
  res.status(200);
  // Sending data in JSON format in Express save the work of defining its content-type.
  res.json({
    status: 'success',
    // When we send multiple objects, it's good practice to include array length. This will let the client knows how many piece of data coming in. Though is not a practice from JSend.
    results: tours.length,
    data: {
      //Suppose we need to write as below, but in ES6 if value pairs have the same name, we just need one value.
      // tours: tours
      tours,
    },
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  // Here we check and validate id format.

  // if (!mongoose.Types.ObjectId.isValid(req.params.id)) {} has loophole & won't work because it always returns True if string contains 12 letters.

  // This is the official way.
  // if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
  //   return next(new AppError('Invalid ID', 400));
  // }

  // Another method is to use npm packaged called mongoose-id-validator

  // Yet another method is to catch error come from findById()
  // const tour = await Tour.findById(req.params.id, (err) => {
  //   if (err) {
  //     return next(new AppError(`${req.params.id} is an invalid ID`, 400));
  //   }
  // });

  const tour = await Tour.findById(req.params.id);
  // The above will do the same thing as below.
  // Tour.findOne({ _id: req.params.id });

  // If req.params.id is a valid id format that mongo can cast to ObjectId, then it will execute findById() EVEN if that id doesn't exist. In this case, it will return null instead of error. So we have to handle it manually.

  if (!tour) {
    return next(new AppError('No tour found with that ID', 404));
    /* We have the option to redirect user to home route if the request params are not valid. */
    // return res.redirect('/');
  }

  res.status(200);
  res.json({
    status: 'success',
    data: {
      tour,
    },
  });
});

exports.createTour = catchAsync(async (req, res, next) => {
  // Method 2 below directly call its method without forming document.
  const newTour = await Tour.create(req.body);
  res.status(201); // 201 Created
  res.json({
    status: 'success',
    data: newTour,
  });

  // try {
  //   // Method 1 below creates a document, then use the document to call its save() method.
  //   // const newTours = new Tour (req.body)
  //   // newTours.save();
  // } catch (err) {
  //   res.status(400).json({
  //     // 400 Bad request
  //     status: 'Fail',
  //     message: 'Invalid data sent',
  //   });
  // }
});

exports.updateTour = catchAsync(async (req, res, next) => {
  // if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
  //   return next(new AppError('Invalid ID', 400));
  // }
  // We have to set the body as in JSON, not text format in Postman for it to work. Don't know why.
  const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
    // By setting true to 'new', we ask mongoose to send back the newly updated document.
    new: true,
    runValidators: true,
  });

  if (!tour) {
    return next(new AppError('No tour found with that ID', 404));
  }

  res.status(200);
  res.json({
    status: 'success',
    tour,
  });
});

exports.deleteTour = catchAsync(async (req, res, next) => {
  // if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
  //   return next(new AppError('Invalid ID', 400));
  // }
  const tour = await Tour.findByIdAndDelete(req.params.id);

  if (!tour) {
    return next(new AppError('No tour found with that ID', 404));
  }

  res.status(204);
  res.json({
    status: 'success',
    // Common practice is not to send anything back when perform delete.
    data: null,
  });
});

/* @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ */
/*                      Aggregation pipeline                        */
/* @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ */

/* Aggregation pipeline is from Mongoose, NOT Mongo */

exports.getTourStats = catchAsync(async (req, res, next) => {
  /* If we don't await, we will get an aggregate object. Inside the pipeline, all key values will be manipulated & replaced with new ones. */
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        /* The _id here is NOT the _id of the document. It's a field for us to specify the grouping criteria. We can see in the grouping result, the _id will have the grouping criteria field attached. */
        _id: { $toUpper: '$difficulty' },
        // _id: '$ratingsAverage',
        // Because every document will go through this pipeline, each document will add number 1 and increment accordingly.
        numTour: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: {
        // 1 means ascending
        avgPrice: 1,
      },
    },
    // {
    //   $match: {
    //     // We exclude tours with difficulty: easy
    //     _id: { $ne: 'EASY' },
    //   },
    // },
  ]);
  res.status(200);
  res.json({
    status: 'success',
    stats,
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1; // year = 2021
  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates',
    },
    {
      $match: {
        startDates: {
          // We create new data format for mongo find match. Mongo will do date operation by itself.
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        // Each doc will pass through this pipeline to be grouped according to month. When each doc pass into that group, we add number 1 into that group and this number increment for every operation in every group.
        numTourStarts: { $sum: 1 },
        // We want all the name of the tours in that month group. We store them in an new array using $push.
        tours: { $push: '$name' },
      },
    },
    {
      $addFields: {
        month: '$_id',
      },
    },
    {
      $project: {
        // Using project stage, we remove certain fields by setting that field to 0. Or 1 to make it appears.
        _id: 0,
      },
    },
    {
      $sort: {
        // Use -1 specify descending order.
        numTourStarts: -1,
      },
    },
    {
      $limit: 12, //Limit to 12 output results. This just to show another stage, not useful in this case.
    },
  ]);
  res.status(200);
  res.json({
    status: 'success',
    plan,
  });
});
