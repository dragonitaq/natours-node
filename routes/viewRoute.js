const express = require('express');
const viewController = require('../controllers/viewController');
const authController = require('../controllers/authController');
const bookingController = require('../controllers/bookingController');

const router = express.Router();

/* we put a middleware here to check if there is query string with field of "alert". */
router.use(viewController.alerts);

router.get('/', authController.isLoggedIn, viewController.getOverview);
router.get('/login', authController.isLoggedIn, viewController.getLoginForm);
router.get('/tour/:slug', authController.isLoggedIn, viewController.getTour);
router.get('/me', authController.protect, viewController.getAccount);
router.get('/my-tours', authController.protect, viewController.getMyTours);

router.post('/submit-user-data', authController.protect, viewController.updateUserData);

module.exports = router;
