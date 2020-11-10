const express = require('express');
const router = express.Router();
const tourController = require('../controllers/tourController');
const authController = require('../controllers/authController');

/* We cannot put this route below '/:id' route because Express will think that 'top-5-cheap' is the value of ':id' parameter. Must be CAREFUL!
When we have 2 callbacks, it will execute in order. */
router.route('/top-5-cheap').get(tourController.aliasTopTours, tourController.getAllTours);

router.route('/tour-stats').get(tourController.getTourStats);
router.route('/monthly-plan/:year').get(tourController.getMonthlyPlan);

router.route('/').post(tourController.createTour).get(authController.protect, tourController.getAllTours);

router.route('/:id').get(tourController.getTour).patch(tourController.updateTour).delete(authController.protect, authController.restrictTo('admin', 'lead-guide'), tourController.deleteTour);

module.exports = router;
