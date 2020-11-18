const express = require('express');
const router = express.Router();
const tourController = require('../controllers/tourController');
const authController = require('../controllers/authController');
const reviewRouter = require('./reviewRoute');

/* We cannot put this route below '/:id' route because Express will think that 'top-5-cheap' is the value of ':id' parameter. Must be CAREFUL!
When we have multiple callbacks, it will execute in order. */
router.route('/top-5-cheap').get(tourController.aliasTopTours, tourController.getAllTours);

router.route('/tour-stats').get(tourController.getTourStats);
router.route('/monthly-plan/:year').get(authController.protect, authController.restrictTo('admin', 'lead-guide', 'guide'), tourController.getMonthlyPlan);

/* When dealing with complex URL, we can use query style URL like:
/tours-within?distance=233&center=-40,45&unit=mi
BUt we it's better to use a more standard & cleaner URL style like this:
/tours-within/500/center/34.111745,-118.113491/unit/mi */
router.route('/tours-within/:distance/center/:latlng/unit/:unit').get(tourController.getToursWithin);

router.route('/:distances/:latlng/unit/:unit').get(tourController.getDistances);

/* Here we mount a router on top of another router. It's necessary if we have long complex URL. */
router.use('/:tourId/reviews', reviewRouter);

router.route('/').post(authController.protect, authController.restrictTo('admin', 'lead-guide'), tourController.createTour).get(tourController.getAllTours);

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(authController.protect, authController.restrictTo('admin', 'lead-guide'), tourController.uploadTourImages, tourController.resizeTourImages, tourController.updateTour)
  .delete(authController.protect, authController.restrictTo('admin', 'lead-guide'), tourController.deleteTour);

module.exports = router;
