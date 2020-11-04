const fs = require('fs');

// We need to move up 1 level in folder using ../ in order to refer the file correctly.
const tours = JSON.parse(fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`));

/* If the middleware function has 4 arguments, then it's considered an error-handling middleware and Express won't call it unless there is an error in an earlier middleware/route handler.
The rule is very simple, so if you're using a param middleware using router.param, you need to specify 4 parameters in the middleware function, where the 4th one will be the value of the parameter. */

exports.checkID = (req, res, next, val) => {
  console.log(val);
  if (val > tours.length) {
    /* Must have RETURN here. If not, Express will send the 404 response and continue the next(). We don't want that happen when the id is invalid. */
    return res.status(404).json({
      status: 'fail',
      message: 'Invalid ID',
    });
  }
  next();
};

exports.checkBody = (req, res, next) => {
  if (!req.body.name || !req.body.price) {
    // 400 means bad request
    return res.status(400).json({
      status: 'fail',
      message: 'Missing name or price',
    });
  }
  next();
};

exports.getAllTours = (req, res) => {
  // Is good practice to always specify the status code.
  res.status(200);
  // Sending json in Express save the work of defining its content-type.
  res.json({
    status: 'success',
    // When we send multiple objects, it's good practice to include array length. This will let the client knows how many piece of data coming in. Though is not a practice from JSend.
    results: tours.length,
    data: {
      //Suppose we need to write as below, but in ES6 if value pairs have the same name, we just need one value.
      // tours (from route resource): tours (from variable)
      tours,
    },
  });
};

exports.getTour = (req, res) => {
  // To convert id from string to number
  const id = req.params.id * 1;
  // To find the match id from tours array
  const tour = tours.find((el) => el.id === id);

  if (tour) {
    res.status(200);
    res.json({
      status: 'success',
      data: {
        tour,
      },
    });
  } else {
    res.status(404).json({
      status: 'fail',
      message: 'Invalid ID',
    });
  }
};

exports.createTour = (req, res) => {
  const newId = tours[tours.length - 1].id + 1;
  // To create new object by merging 2 existing objects together.
  const newTour = Object.assign({ id: newId }, req.body);

  tours.push(newTour);
  // We need to stringify tours into json format because it was parsed into an JS object.
  fs.writeFile(`${__dirname}/../dev-data/data/tours-simple.json`, JSON.stringify(tours), (err) => {
    // status 201 means created
    res.status(201);
    res.json({
      status: 'success',
      data: newTour,
    });
  });
};

exports.updateTour = (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      tour: '<Updated tour here...>',
    },
  });
};

exports.deleteTour = (req, res) => {
  // In Delete, we send 204 because it means no content. We usually don't send any data back. So the data is null.
  res.status(204).json({
    status: 'success',
    data: null,
  });
};
