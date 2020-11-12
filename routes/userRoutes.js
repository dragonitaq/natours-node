const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const { route } = require('./reviewRoute');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);

router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

/* ################## Route middleware protector ################## */
// AKA: AUTHENTICATION

/* All routes that pass to the following middleware will get protected. */
router.use(authController.protect);

router.get('/me', userController.getMe, userController.getUser);
router.patch('/updateMyPassword', authController.updatePassword);

router.patch('/updateMe', userController.updateMe);
router.delete('/deleteMe', userController.deleteMe);

/* ############ Route middleware allowed for admin only ########### */
// AKA: AUTHENTICATION

/* All routes that pass to the following will restricted to admin role user only. */
router.use(authController.restrictTo('admin'));

/* Why we attach POST method if we don't use it and use /signup instead??? */
router.route('/').get(userController.getAllUsers).post(userController.createUser);

router.route('/:id').get(userController.getUser).patch(userController.updateUser).delete(userController.deleteUser);

module.exports = router;
