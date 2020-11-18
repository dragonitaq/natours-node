const express = require('express');
const bookingController = require('../controllers/bookingController');
const authController = require('../controllers/authController');

const router = express.Router();

/* All routes that pass to the following middleware will get protected. */
router.use(authController.protect);

/* Handle payment route. */
router.get('/checkout-session/:tourId', bookingController.getCheckoutSession);

/* All routes that pass to the following middleware will be restricted to admin and lead-guide only. */
router.use(authController.restrictTo('admin', 'lead-guide'));

router.route('/').get(bookingController.getAllBooking).post(bookingController.createBooking);

router.route('/:id').get(bookingController.getBooking).patch(bookingController.updateBooking).delete(bookingController.deleteBooking);

module.exports = router;
