const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');
const multer = require('multer');
const sharp = require('sharp');

/* We setup where to store and how the filename will be. Bear in mind this is a middleware but works differently. So it can get access to req data. What different is that it can also access the file (picture) that user uploaded. If we don't define the data storing destination, multer will simply store in RAM. */
// const multerStorage = multer.diskStorage({
//   /* The cb acts like next() in Express. We don't use next() because it doesn't come from Express but Multer so we put different name to distinguish it. */
//   destination: (req, file, cb) => {
//     // First argument is the error handler, if there is no error, just put null.
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//     /* If we don't mind about the uniqueness of each photo filename, we can run code below to overwrite previous image every time user uploaded a new photo. */
//     // cb(null, `user-${req.user.id}.${ext}`);
//   },
// });

/* We store in memory RAM first for image manipulation, then only after modification (like resizing) we store in local disk storage. This is the right way to do it. But using this method, we don't set the filename property, so we need to take care of it in our resizeUserPhoto() function. */
const multerStorage = multer.memoryStorage();

/* We setup filter to validate if the uploaded file is a picture format. So in other use case, we might want user to upload csv or xlsx or pptx file, we can specify in here. We return result accordingly. */
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image. Please only upload image file.', 400), false);
  }
};

/* Here we put all configured settings into the multer upload function.  */
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

/* We here call the upload function that we setup. We specify single means to upload one photo at a time. The argument is the name of field in the form that hold the image. */
exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  /* We need to explicitly create this filename because our other middleware (updateMe) needs it to update data. We no need ${.ext} to specify the extension name because we tell sharp to always conver to jpeg format. */
  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  /* We store the file in memory so that we can access it on the buffer. */
  await sharp(req.file.buffer).resize(500, 500).toFormat('jpeg').jpeg({ quality: 90 }).toFile(`public/img/users/${req.file.filename}`);

  next();
});

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    /* Once we checked the field is allowed, then we attach that field & value from old obj to newObj */
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getAllUsers = factory.getAll(User);

// exports.getAllUsers = catchAsync(async (req, res, next) => {
//   const users = await User.find();
//   res.status(200).json({
//     status: 'success',
//     results: users.length,
//     data: {
//       users,
//     },
//   });
// });

/* We need this middleware to set the req.params.id = req.user.id (which came from protected route) because in the getOne factory function, we will use req.params.id to do findById() query. */
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // STEP 1: Check if user POSTed password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(new AppError('This route is not for password update.', 400));
  }
  // STEP 2: Filter unwanted fields name that are not allowed to be uploaded.
  const filteredBody = filterObj(req.body, 'name', 'email');
  /* At this point we already generated unique photo filename in the req.body. We just to attach the filename to the photo field in the filtered req.body. Then we update data accordingly. */
  if (req.file) filteredBody.photo = req.file.filename;
  // STEP 3: Update user doc
  // REVIEW Think we forgot to handle in case of the return doc is null.
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
  /* NOTE The user still have valid token on their side so they can get pass authController.protect. My idea is to purposely generate a fake token and send to client side to replace the valid one. */
  // 204 Deleted
  res.status(204).json({
    status: 'success',
    data: null,
  });
});

/* The reason Jonas' created this is for future if we, ourselves want to implement user signup on rendered page. He didn't want to do that because his project is for demo purpose, so he doesn't want user to signup and then mess with its data in the website.
A student proposed solution for setting up signup code as in this link:
https://www.udemy.com/course/nodejs-express-mongodb-bootcamp/learn/lecture/15087358#questions/11830460 */
exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'err',
    message: 'This route is not yet defined. Please user /signup instead.',
  });
};

exports.getUser = factory.getOne(User);

// exports.getUser = catchAsync(async (req, res, next) => {
//   const users = await User.find({ email: req.body.email });
//   res.status(500).json({
//     status: 'err',
//     message: 'This route is not yet defined',
//   });
// });

/* ###################### For admin user ONLY ##################### */

// NEVER change password with this.
exports.updateUser = factory.updateOne(User);

exports.deleteUser = factory.deleteOne(User);
