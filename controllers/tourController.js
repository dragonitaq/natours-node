const { query } = require('express');
const Tour = require('../models/tourModel');
const APIFeatures = require('../utils/apiFeatures');

/* We make use of middleware to change the URL resource(slug) from '/top-5-cheap' to query '/top-5-cheap/?limit=5&sort=-ratingsAverage,price&fields=name,price,ratingsAverage,duration,summary,difficulty'
We don't want to send any request here, we just want to modify the URL. So we use next() to direct the flow to the next process of middleware. We don't use async here because we don't expect a promise return. */
exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,duration,summary,difficulty';
  next();
};

exports.getAllTours = async (req, res) => {
  try {
    /* @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ */
    /*                            Build query                           */
    /* @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ */

    /* ######################### 1A) Filtering ######################## */

    /* Here we use spread operator to construct object. Basically we take all properties & methods from req.query and construct a brand new object based on these. Because if we create new variable object, it will simply serve as reference to the original object. But we want a new object here for us to query the filtered result. */
    // const queryObj = { ...req.query };
    // const excludedFields = ['page', 'sort', 'limit', 'fields'];
    /* We loop each field and delete that field detail from queryObj object. The syntax "delete" is JS operation.
    Refer here: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/delete */
    // excludedFields.forEach((el) => delete queryObj[el]);

    /* Student proposed this solution without needing to loop. */
    // const { page, sort, limit, fields, ...queryObj } = req.query;

    /* #################### 1B) Advanced filtering #################### */

    // let queryStr = JSON.stringify(queryObj);
    // queryStr = queryStr.replace(/\b(gt|gte|lt|lte)\b/g, (match) => `$${match}`);

    /* Why can't we directly specify the [$gte] in the url?
    Yes that will work just fine too, but it's not common to see it this way. That's why I(Jonas) showed the more common way of doing it, which gives us some additional work to set it up in the code, but what matters is the better user experience.*/

    /* ###################### 2) Get query object ##################### */

    // Method 1
    /* When you call Tour.find(queryObj) without await, this only returns a Query object, but it does not execute the query itself.
    This is the reason why we can attach different mongoose methods like .where().equals() after that first .find() call. If it would execute the query right away, we could then not sort it or not filter it.
    So, again, the query is actually only executed once we await it. */
    // let query = Tour.find(JSON.parse(queryStr));

    // Method 2
    // We can continue use method like .where because find() will return a document which has prototype methods. Other than equals, we can use lt, lte, gt, gte etc
    // const query = await Tour.find().where('duration').equals(5).where('difficulty').equals('easy');

    /* ############################ 3) Sort ########################### */

    // if (req.query.sort) {
    //   /* req.query.sort represent the property we specify in URL like domain.com/?sort=-price,ratingsAverage denotes price,ratingsAverage and is a string type.
    //   If the first sort has conflict, it will continue solve by second. */
    //   // Here to modify them into '-price ratingsAverage'.
    //   const sortBy = req.query.sort.split(',').join(' ');
    //   query = query.sort(sortBy);
    //   // This format is accepted: query.sort('-price ratingsAverage')
    // } else {
    //   // In case user doesn't specify the sort field, we do a default one.
    //   query = query.sort('-createdAt');
    // }

    // SIDE NOT:
    /* In the URL you can escape the blank space by using the '%20' encoding. With that you can pass multiple filter arguments without having to manually mutate the string.
    We can add + in between the parameters instead of comma, it'll automatically change to whitespace by Express. */

    /* ####################### 4) Field limiting ###################### */

    // if (req.query.fields) {
    //   const fields = req.query.fields.split(',').join(' ');
    //   // In case we want to prevent user accessing our price
    //   // if (fields.includes('price')) throw new Error('Accessing price is prohibited');
    //   // Remember we cannot mix params with - and with no - like this: ?fields=-name,-duration,difficulty,price
    //   query = query.select(fields);
    // } else {
    //   // In select() method, we are including fields. When we put - to the params, we are excluding it.
    //   query = query.select('-__v');
    // }

    /* ######################### 5) Pagination ######################## */

    // /* Because it'll always be string for number in URL so we have to convert to number type by multiple to 1.
    // If page is not available, we use value 1 */
    // const page = req.query.page * 1 || 1;
    // /* We set default limit to 100 because not every time user will set limit value. */
    // const limit = req.query.limit * 1 || 100;
    // /* Formula to calculate skip number. Eg. if is page 3, then (3-1)*100 = 200, we will skip 200 result and start search for the 201th result. We then get result between 201 to 300 at page 3. */
    // const skip = (page - 1) * limit;
    // query = query.skip(skip).limit(limit);

    // if (req.query.page) {
    //   const numTours = await Tour.countDocuments(query);
    // //   console.log('numTours', numTours);
    //   // If after all the filtering & fields limiting and we get zero result, throw error and end process.
    //   if (numTours === 0) throw new Error('This page does not exist');
    // }

    /* @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ */
    /*                           API features                           */
    /* @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ */

    const features = new APIFeatures(Tour.find(), req.query).filter().sort().limitFields().paginate();

    /* @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ */
    /*                           Execute query                          */
    /* @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ */

    /* Query middleware executes here before await query. */

    const tours = await features.query;

    /* @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ */
    /*                             Response                             */
    /* @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ */

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
  } catch (err) {
    res.status(404).json({
      status: 'Failed',
      message: 'There is an error',
    });
  }
};

exports.getTour = async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.id);
    // We can also do like this. It will do the same thing as above.
    // Tour.findOne({ _id: req.params.id });

    res.status(200);
    res.json({
      status: 'success',
      data: {
        tour,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: 'Failed',
      message: 'Tour not found',
    });
  }
};

exports.createTour = async (req, res) => {
  try {
    // Method 1 below creates a document, then use the document to call its save() method.
    // const newTours = new Tour (req.body)
    // newTours.save();

    // Method 2 below directly call its method without forming document.
    const newTour = await Tour.create(req.body);
    res.status(201); // 201 Created
    res.json({
      status: 'success',
      data: newTour,
    });
  } catch (err) {
    res.status(400).json({
      // 400 Bad request
      status: 'Fail',
      message: 'Invalid data sent',
    });
  }
};

exports.updateTour = async (req, res) => {
  try {
    // We have to set the body as in JSON, not text format in Postman for it to work. Don't know why.
    const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
      // By setting true to 'new', we ask mongoose to send back the newly updated document.
      new: true,
      runValidators: true,
    });
    res.status(200);
    res.json({
      status: 'success',
      tour,
    });
  } catch (err) {
    res.status(404).json({
      status: 'Fail',
      message: 'Tour not exist',
    });
  }
};

/* ~~~Difference between findByIdAndDelete VS findByIdAndRemove~~~
We should use findByIdAndDelete and not findByIdAndRemove unless you have a good reason not to.
findOneAndRemove returns the removed document so if you remove a document that you later decide should not be removed, you can insert it back into the db.
This can be useful too. For example your user wants to delete his account but u need to delete user information too then u can use findOneAndRemove() and then u can delete it on users table and after that u can add to another table as "deletedUser".
If we want to response a delete successful message to the client, then we need to change the status code, because no matter what message you send, status code 204 will hide all of it.
*/

exports.deleteTour = async (req, res) => {
  try {
    // Common practice is not to send anything back when perform delete.
    await Tour.findByIdAndDelete(req.params.id);
    res.status(204);
    res.json({
      status: 'success',
      data: null,
    });
  } catch (err) {
    res.status(404).json({
      status: 'Fail',
      message: 'Tour not exist',
    });
  }
};

/* @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ */
/*                      Aggregation pipeline                        */
/* @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ */

/* Aggregation pipeline is from Mongoose, NOT Mongo */

exports.getTourStats = async (req, res) => {
  try {
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
  } catch (err) {
    res.status(404).json({
      status: 'Fail',
      message: err,
    });
  }
};

exports.getMonthlyPlan = async (req, res) => {
  try {
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
  } catch (err) {
    res.status(404).json({
      status: 'Fail',
      message: err,
    });
  }
};
