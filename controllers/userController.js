const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    /* Once we checked the field is allowed, then we attach that field & value from old obj to newObj */
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find();
  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users,
    },
  });
});

exports.updateMe = catchAsync(async (req, res, next) => {
  // STEP 1: Check if user POSTed password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(new AppError('This route is not for password update.', 400));
  }
  // STEP 2: Filter unwanted fields name
  const filteredBody = filterObj(req.body, 'name', 'email');
  // STEP 3: Update user doc
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, { new: true, runValidators: true });

  /* REVIEW Why don't we send token back? If not I can't proceed as normal user afterward. */
  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });
  // NOTE The user still have valid token on their side.
  // 204 Deleted
  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'err',
    message: 'This route is not yet defined',
  });
};

exports.getUser = catchAsync(async (req, res, next) => {
  const users = await User.find({ email: req.body.email });
  res.status(500).json({
    status: 'err',
    message: 'This route is not yet defined',
  });
});

exports.updateUser = (req, res) => {
  res.status(500).json({
    status: 'err',
    message: 'This route is not yet defined',
  });
};

exports.deleteUser = (req, res) => {
  res.status(500).json({
    status: 'err',
    message: 'This route is not yet defined',
  });
};
