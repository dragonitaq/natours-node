const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');

/* By default, each router can only access the parameters values of their specified route. By setting mergeParams: true, we preserve the parameters values from their parent router to current routers. */
const router = express.Router({ mergeParams: true });

/* ######################## AUTHENTICATION ######################## */

router.use(authController.protect);

/* ######################### AUTHORIZATION ######################## */

router.route('/').get(reviewController.getAllReviews).post(authController.restrictTo('user'), reviewController.setTourUserIds, reviewController.createReview);

router
  .route('/:id')
  .get(reviewController.getReview)
  .delete(authController.restrictTo('user', 'admin'), reviewController.checkIfAuthor, reviewController.deleteReview)
  .patch(authController.restrictTo('user', 'admin'), reviewController.checkIfAuthor, reviewController.updateReview);

module.exports = router;
