const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: {
      values: true,
      message: 'A user must have a name',
    },
  },
  email: {
    type: String,
    unique: true,
    required: {
      values: true,
      message: 'A user must have a email',
    },
    // This is not a validator, it just convert into lower case.
    lowercase: true,
    validate: [validator.isEmail, 'A valid email is required'],
  },
  photo: String,
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'A user must have a password'],
    minlength: [8, 'A password must have more than or equal to 8 characters'],
    select: false, // Prevent sending encrypted password to client for general query.
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      /* This is only work when use .create() OR .save() method. NOT for findByIdAndUpdate, findOneAndUpdate & etc.
      This is because when this validation runs, the this. password hasn't update yet. Reason is behind the scene, Mongoose doesn't keep the current object in memory.
      In nutshell, we cannot use findByIdAndUpdate or findOneAndUpdate on custom-validation field. The way logic applies to pre-save Mongoose middleware */
      validator: function (el) {
        return el === this.password;
      },
      message: 'Passwords are not the same',
    },
  },
  /* This key value exist only when user change password. */
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

/* ###################### Mongoose middleware ##################### */

// Here we encrypt the password before saving into doc.
userSchema.pre('save', async function (next) {
  // If password is not modify, we pass next() to middleware.
  if (!this.isModified('password')) return next();
  // Here we encrypt it using bcrypt with 10 cost factor.
  this.password = await bcrypt.hash(this.password, 10);
  /* passwordConfirm validation done before reaching this middleware. Meaning the validation has passed. In this case, we don't want to encrypt and store it because that is use for validation only. So we just set to undefined */
  this.passwordConfirm = undefined;
  next();
});

/* We do it here because it serves as behind the scene function whenever we reset & update password. */
userSchema.pre('save', function (next) {
  /* isNew check if that document hasn't ever created before. */
  if (!this.isModified('password') || this.isNew) return next();
  /* We minus 1 second because jwt token generation is slow a bit. Nothing much here. */
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

/* We user regular expression to include any method starts with find keyword like findOne or findOneAndUpdate etc.
Middleware query setting will dominate those before entering middleware. */
userSchema.pre(/^find/, function (next) {
  /* All document that has active field now equal to false (which is true) are allowed to query. We do this because not every document has active field set to true. */
  this.find({ active: { $ne: false } });
  next();
});

/* #################### Mongoose Instant Method ################### */

/* We attach method to all the document on a particular collection. So all document can access to this function. */

/* Again we use normal function because we want this keyword which is point to current doc.
CAVEAT: This instant method ony applies to single document. If we use find() to return an array of doc, it won't work. */

// METHOD 1 WITH this.password
// userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
//   // this.password won't work because we have set it select:false. To solve this, we pass in userPassword from login function.
//   return await bcrypt.compare(candidatePassword, userPassword); // Return true or false
// };

// METHOD 2 WITH this.password

userSchema.methods.correctPassword = async function (candidatePassword) {
  // Because in authController, it's the doc(user) which calls this function using arrow function. Therefore, we can access this keyword on that object, thus its password. So no need pass in second argument.
  return await bcrypt.compare(candidatePassword, this.password); // Return true or false
};

userSchema.methods.changedPasswordAfter = function (jwtTimeStamp) {
  if (this.passwordChangedAt) {
    /* The getTime() method returns the number of milliseconds between midnight of January 1, 1970 and the specified date. */
    const changedTimeStamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    /* We compare seconds. If the second of the token creation time is smaller than changed password creation time, means the password has change after the token created. Thus, we don't authorize the user.
    We return true when the password indeed has changed before. */
    return jwtTimeStamp < changedTimeStamp; // 1000ms vs / 5000ms -> return true
  }
  // We return false when the password has never changed.
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 * 60 * 1000ms = 10 minutes
  /* The reason that it's ok to just send random generated string as token to client side because that piece of data will go directly into their inbox. Only they can access. So no extra salting required.  */
  return resetToken;
};

/* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

const User = mongoose.model('User', userSchema);

module.exports = User;
