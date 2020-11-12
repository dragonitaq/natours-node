const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');

/* By default, each router can only access the parameters values of their specified route. By setting mergeParams: true, we preserve the parameters values from their parent router to current routers. */
const router = express.Router({ mergeParams: true });

router.route('/').get(reviewController.getAllReviews).post(authController.protect, authController.restrictTo('user'), reviewController.createReview);

module.exports = router;
