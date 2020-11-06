const express = require('express');
const router = express.Router();
const tourController = require('../controllers/tourController');

/* We cannot put this route below '/:id' route because Express will think that 'top-5-cheap' is the value of ':id' parameter. Must be CAREFUL!*/
router.route('/top-5-cheap').get(tourController.aliasTopTours, tourController.getAllTours);

router.route('/tour-stats').get(tourController.getTourStats);
router.route('/monthly-plan/:year').get(tourController.getMonthlyPlan);

router.route('/').post(tourController.createTour).get(tourController.getAllTours);

router.route('/:id').get(tourController.getTour).patch(tourController.updateTour).delete(tourController.deleteTour);

module.exports = router;
