const Tour = require('../models/tourModel');
// const APIFeatures = require('../utils/apiFeatures');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const multer = require('multer');
const sharp = require('sharp');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image. Please only upload image file.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

// Notice this's a middleware but there's not next() available because it's called internally by Multer itself.
exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

// When we upload only 1 image. Then we can access it through "req.file"
// upload.single('image');
// When we upload multiple image with setting maximum of 5. Then we can access it through an array in "req.files"
// upload.array('image', 5);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();

  // STEP 1: Process tour image cover
  /* We have to attach the filename into req.body because in our handlerFactory, the updateOne() takes everything in the rq.body and update it. */
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333) // This is standard to get 3/2 ratio.
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // STEP 2: Process tour images
  /* We create an empty for each resized image to push in because our DB expect an array */
  req.body.images = [];
  /* The issue here is our async/await is inside a callback, thus it is not blocking the code to wait until there are results from the callback. So we have to use old trick that first to catch all Promises with array method of map() and force await until all the Promises have resolved then only proceed the next code. Then we effectively blocking the code. */
  await Promise.all(
    /* ii is the index of the current file start with zero. */
    req.files.images.map(async (file, ii) => {
      /* We have to manipulate the filename in each incrementing iteration. */
      const filename = `tour-${req.params.id}-${Date.now()}-${ii + 1}.jpeg`;
      await sharp(file.buffer)
        .resize(2000, 1333) // This is standard to get 3/2 ratio.
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);
      req.body.images.push(filename);
    })
  );

  next();
});

/* We make use of middleware to change the URL resource(slug) from '/top-5-cheap' to query '/top-5-cheap/?limit=5&sort=-ratingsAverage,price&fields=name,price,ratingsAverage,duration,summary,difficulty'
We don't want to send any request here, we just want to modify the URL. So we use next() to direct the flow to the next process of middleware. We don't use async here because we don't expect a promise return. */
exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,duration,summary,difficulty';
  next();
};

exports.getAllTours = factory.getAll(Tour);

// exports.getAllTours = catchAsync(async (req, res, next) => {
//   /* ######################### API features ######################### */

//   const features = new APIFeatures(Tour.find(), req.query).filter().sort().limitFields().paginate();

//   /* ######################### Execute query ######################## */

//   // Query middleware executes here before await query.
//   const tours = await features.query;

//   /* ########################### Response ########################### */

//   // Is good practice to always specify the status code.
//   res.status(200);
//   // Sending data in JSON format in Express save the work of defining its content-type.
//   res.json({
//     status: 'success',
//     // When we send multiple objects, it's good practice to include array length. This will let the client knows how many piece of data coming in. Though is not a practice from JSend.
//     results: tours.length,
//     data: {
//       //Suppose we need to write as below, but in ES6 if value pairs have the same name, we just need one value.
//       // tours: tours
//       tours,
//     },
//   });
// });

exports.getTour = factory.getOne(Tour, { path: 'reviews' });

/* Code below will default 'reviews' to { path: 'reviews'} */
// exports.getTour = factory.getOne(Tour, 'reviews');

// exports.getTour = catchAsync(async (req, res, next) => {
//   // Here we check and validate id format.

//   // if (!mongoose.Types.ObjectId.isValid(req.params.id)) {} has loophole & won't work because it always returns True if string contains 12 letters.

//   // This is the official way.
//   // if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
//   //   return next(new AppError('Invalid ID', 400));
//   // }

//   // Another method is to use npm packaged called mongoose-id-validator

//   // Yet another method is to catch error come from findById()
//   // const tour = await Tour.findById(req.params.id, (err) => {
//   //   if (err) {
//   //     return next(new AppError(`${req.params.id} is an invalid ID`, 400));
//   //   }
//   // });

//   /* Using .populate() is indeed a new query action on top of any find methods. Beware of its performance.
//   If we want to include every fields we use .populate('guides'); If we want to exclude specified field then:
//   .populate({path: 'guides', select: '-__v -passwordChangedAt'});
//   If we want to exclude specified field then:
//   .populate({path: 'guides', select: 'name email'}); */
//   const tour = await Tour.findById(req.params.id).populate('reviews');

//   // If req.params.id is a valid id format that mongo can cast to ObjectId, then it will execute findById() EVEN if that id doesn't exist. In this case, it will return null instead of error. So we have to handle it manually.

//   if (!tour) {
//     return next(new AppError('No tour found with that ID', 404));
//     /* We have the option to redirect user to home route if the request params are not valid. */
//     // return res.redirect('/');
//   }

//   res.status(200);
//   res.json({
//     status: 'success',
//     data: {
//       tour,
//     },
//   });
// });

exports.createTour = factory.createOne(Tour);

// exports.createTour = catchAsync(async (req, res, next) => {
//   // Method 2 below directly call its method without forming document.
//   const newTour = await Tour.create(req.body);
//   res.status(201); // 201 Created
//   res.json({
//     status: 'success',
//     data: newTour,
//   });

//   // try {
//   //   // Method 1 below creates a document, then use the document to call its save() method.
//   //   // const newTours = new Tour (req.body)
//   //   // newTours.save();
//   // } catch (err) {
//   //   res.status(400).json({
//   //     // 400 Bad request
//   //     status: 'Fail',
//   //     message: 'Invalid data sent',
//   //   });
//   // }
// });

exports.updateTour = factory.updateOne(Tour);

// exports.updateTour = catchAsync(async (req, res, next) => {
//   // if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
//   //   return next(new AppError('Invalid ID', 400));
//   // }
//   // We have to set the body as in JSON, not text format in Postman for it to work. Don't know why.
//   const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
//     // By setting true to 'new', we ask mongoose to send back the newly updated document.
//     new: true,
//     runValidators: true,
//   });

//   if (!tour) {
//     return next(new AppError('No tour found with that ID', 404));
//   }

//   res.status(200);
//   res.json({
//     status: 'success',
//     tour,
//   });
// });

/* We call this function here then this function will return another function which will sit here and wait to be called. We can access to previous variable (model/Tour) because of closures; that is the returned inner function will get access to the variables of the outer function even outer function has returned. */
exports.deleteTour = factory.deleteOne(Tour);

// exports.deleteTour = catchAsync(async (req, res, next) => {
//   // if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
//   //   return next(new AppError('Invalid ID', 400));
//   // }
//   const tour = await Tour.findByIdAndDelete(req.params.id);

//   if (!tour) {
//     return next(new AppError('No tour found with that ID', 404));
//   }

//   res.status(204);
//   res.json({
//     status: 'success',
//     // Common practice is not to send anything back when perform delete.
//     data: null,
//   });
// });

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

exports.getToursWithin = catchAsync(async (req, res, next) => {
  /* we destruct an object into variables */
  const { distance, latlng, unit } = req.params;
  /* we destruct an array into variables */
  const [lat, lng] = latlng.split(',');
  if (!lat || !lng) {
    next(new AppError('Please provide coordinate with format of lat,long', 400));
  }

  /* Because Mongo only accept radian unit, so we need to divide our specified radius to the radius of the Earth according to the unit used. */
  const radian = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  /* Here we do geospatial query. Remember Mongo accept long first then lat.
  IMPORTANT: We also need create a index in DB for the field (startLocation) that the geolocation is stored. */
  const tours = await Tour.find({ startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radian] } } });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

/* This function is for users to calculate how long the distance from the their input-ed coordinate compare to all the starting location of all the tours */
exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  /* we destruct an array into variables */
  const [lat, lng] = latlng.split(',');
  if (!lat || !lng) {
    next(new AppError('Please provide coordinate with format of lat,long', 400));
  }

  /* This variable will then multiply the distance value return from aggregation pipeline. This will convert unit according to unit user specified. */
  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  const distances = await Tour.aggregate([
    {
      /* This is the only geospatial aggregation pipeline available & MUST be at the first one in pipeline.
      Another requirement is that one of the fields in schema must have geospatial indexed.
      But if you have multiple fields with geospatial indexes then you need to use the keys parameter in order to define the field that you want to use for calculations. In this case, the field (startLocation) indexed is also the field we are going to use, so no keys parameter needed. */
      $geoNear: {
        /* Near is the distance point to calculate from. AKA The starting point. Then we specify as geojson like we did in the model. */
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1], // Convert string to number.
        },
        // The value('distance') is the field will be created and all calculated distances will be stored.
        distanceField: 'distance', // Return in unit meter by default.
        /* We specify the value that will be multiplied with all the calculated distances. */
        distanceMultiplier: multiplier,
      },
    },
    {
      /* Here we select the fields that we want to keep for. */
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    results: distances.length,
    data: {
      data: distances,
    },
  });
});
