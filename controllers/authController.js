const { promisify } = require('util'); // We just want 1 method which is promisify, so we deconstruct it here.
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/appError');
const Email = require('../utils/email');
const crypto = require('crypto');

const createSendToken = async (user, statusCode, res) => {
  try {
    const token = await signToken(user.id);

    const cookieOptions = {
      // We convert into milliseconds.
      expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),

      /* When set to true, the cookie cannot be accessed or modified in anyway by the browser. */
      httpOnly: true,

      /* ONLY SET secure:true IN PRODUCTION. Because we cannot send HTTPS in local connection.
      When set to true, the cookie will only get sent on a encrypted connection (HTTPS). */
      // secure: true,
    };

    /* ANCHOR Remember remove comment for real production mode.
    If we test run in production mode, we have to manually comment line below out. */
    // if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

    /* One domain can only have one unique cookie name on a browser, for us is "jwt". So every time we send a new one, the old one get replace, which is exactly what we wanted. */
    res.cookie('jwt', token, cookieOptions);

    /* This is to remove the password from the output.
    Encrypted password is sent over because it is created during creating new doc. But why??? */
    user.password = undefined;

    res.status(statusCode).json({
      status: 'success',
      token,
      data: {
        user,
      },
    });
  } catch (err) {
    throw err;
  }
};

/* We can't use factory function here because this is unique one that require authentication. */
exports.signup = catchAsync(async (req, res, next) => {
  /*  We specify ONLY there fields are to be taken and store in our DB. The reason here is because tricky user can manually insert data like req.body.role=admin and if our data schema accidentally has key value of "role" that match it, then it will have "admin" value with it. If our app uses role to specify admin privilege, then our system is compromised. */
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    // We need to enter the following code for it to work, why Jonas version has non of these by still work?
    passwordChangedAt: req.body.passwordChangedAt,
    /* REVIEW We said don't want to import role data from user to prevent they manually set to admin. But with this code, how can we actually set it to admin when real admin user signup???
    After proceed further into the course, I understand is Jonas' intention not to provide the option to let use specify their role during signing up. We default every user role to "user". On our end, we manually set the user role to admin or lead-guide or guide in DB. */
    role: req.body.role,
  });

  /* We make it dynamic here because we need to suit it for both dev and prod environment. protocol either http or https. req.get('host') will return our domain name.  */
  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();

  // Sync version
  // const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

  // Async version
  // const token = await signToken(newUser._id);

  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  // STEP 1: Check if there is email & password
  if (!email || !password) {
    // Remember to return if there's error to prevent user accidentally login.
    return next(new AppError('Please provide email & password', 400));
  }

  // STEP 2: Check if user exists & password is correct
  /* In ES6 writing {email} equals to {email: email}.
  Remember the password is set to select:false. But we can explicitly select it here with +sign prefix. */
  const user = await User.findOne({ email }).select('+password');
  /* We must test "!user" first because if only user has valid return doc, which means the user exits, then only we run password compare function. For security reason, we don't even want to response whether is user exists. */
  if (!user || !(await user.correctPassword(password))) {
    return next(new AppError('Incorrect email or password'), 401); // 401 means unauthorized.
  }
  createSendToken(user, 200, res);
});

/* Since we can't temper cookie on browser, so we send a new token with dummy text instead of real token. This will replace the cookie on the client side.
I found out a TRICK by setting expires: new Date(Date.now()) which means immediate expiry will make browser delete cookie immediately!!! */
exports.logout = (req, res) => {
  /* Student proposed method below. We specify the name & the path of the cookie we want to delete. If we don't specify the path, it will default to { path: '/' } */
  res.clearCookie('jwt', { path: '/' });
  /* Jonas' method */
  // res.cookie('jwt', 'logged out', {
  //   expires: new Date(Date.now()),
  //   httpOnly: true,
  // });
  res.status(200).json({
    status: 'success',
  });
};

exports.protect = catchAsync(async (req, res, next) => {
  // STEP 1: Check if token is there
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError('You are not logged in', 401));
  }

  // STEP 2: Verify the token
  /* promisify the function, and then execute right away with arguments. Return value is the decoded data (AKA payload) from jwt. If the verification fails, jwt will throw error which will be catch my errorController. */
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // STEP 3: Check if the user still exists
  /* The IMPORTANT reason we must perform this check is if the user has the valid logged in token on device A, but they delete their account on device B. They can still access via './' route using device A because they have valid token! */
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('The user belong to this token does not exist', 401));
  }
  // STEP 4: Check if the user change password
  /* If someone stole the JSON web token from a user. But then, in order to protect against that, the user changes his password. But that old token was issued before the password change should no longer be valid. So it should not be accepted to access protected routes. */
  // If return true means the password has changed after token created. Otherwise return false.
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(new AppError('User password changed. Please login again.', 401));
  }

  // STEP 5: Grant access to the protected route.
  req.user = currentUser;
  // Because our view routes require to pass through this middleware, we need the local for pug to work.
  res.locals.user = currentUser;
  next();
});

/* This is a middle to check if the user is logged-in. There will be no error. Because we just want to render pages accordingly to user logging status. In here, we take cookie and verify and then get the user doc(if any) then pass long to middleware so that when we render pages, we can use the user doc data from DB query.
Notice we don't use catchAsync here because even when there is error(from jwt.verify), it is just because the user is not logged in. Then we don't get user doc data and just move on. */
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      const decoded = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET);
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      /* If user reaches this line, the user is a logged-in user. We then define locals here named "user". Each of pug template will gain access to this. Is a way to pass data into template. We pass current user document into it. */
      res.locals.user = currentUser;
      /* So we pass the locals data into the next middleware then it reaches our function to render pages accordingly. */
      return next();
    } catch (err) {
      return next();
    }
  }
  /* If there is no cookie in req, means there is no logged-in user. So just pass to next middleware. */
  next();
};

/* We restrict only specified user roles can pass this middleware. */
exports.restrictTo = (...roles) => {
  // roles = ['admin', 'lead-guide']
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403)); // 403 Forbidden
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // STEP 1: Get user based on email via POST method
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with this email', 404));
  }

  // STEP 2: Generate random token
  const resetToken = user.createPasswordResetToken();
  /* IMPORTANT to set validation to false, if not we cannot save into db. Because in reset password, we only save the password key value whereas many other key values are set to mandatory in validation. So we need to temporary pause the validation in this process. */
  await user.save({ validateBeforeSave: false });

  // STEP 3: Send it to user's email inbox

  /* We use another try/catch here because we want to manually handle passwordResetToken and passwordResetExpires variables in the database */
  try {
    // req.get('host') instead of req.headers.host?
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;

    // This is for testing email password reset
    // const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to ${resetURL}\nIf you didn't forget your password, please ignore this email.`;
    // await Email({
    //   email: user.email,
    //   subject: 'Your password reset token (valid for 10 minutes)',
    //   message,
    // });

    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token is sent to email',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError('There was an error sending the email. Try again later.'), 500);
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // STEP 1: Get user based on token and compare it
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  // Mongo will convert all date format and compare it using gte. If it return a user, it means the token hasn't expired.
  const user = await User.findOne({ passwordResetToken: hashedToken, passwordResetExpires: { $gt: Date.now() } });

  // STEP 2: If token has not expired and there's returned user, reset the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  /* Unlike updating tours, we use findOneAndUpdate() because here we no need to do strict validation. However, for password, we need the validation function to run which is only possible when using create() or save(). */
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  // REVIEW why we no need use { validateBeforeSave: false }
  await user.save();

  // STEP 3: Update changePasswordAt key value

  // STEP 4: Log in the user, send JWT
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // STEP 1: Check user from collection
  const user = await User.findById(req.user.id).select('+password');

  // STEP 2: Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent))) {
    return next(new AppError('Current password incorrect', 401));
  }

  // STEP 3: If correct, change to new password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  // STEP 4: Log user in, send JWT
  createSendToken(user, 200, res);
});
/* ############## Async version to generate JWT token ############# */

/* We cannot use await because jwt.sign() doesn't return a promise. We can however use good old javascript Promise. */

function signToken(id) {
  return new Promise((resolve, reject) => {
    jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN }, function (err, token) {
      if (err) reject(err);
      else resolve(token);
    });
  });
}
