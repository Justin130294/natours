const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name!'],
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true, // convert to lowercase
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  role: {
    type: String,
    enum: ['admin', 'guide', 'lead-guide', 'user'],
    default: 'user',
  },
  photo: {
    type: String,
    // Specify the path to the default photo within /img/users/
    default: 'default.jpg',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please provide the same password'],
    validate: {
      // This only works on the User.create and User.save methods
      validator: function (el) {
        return this.password === el;
      },
      message: 'Passwords must be the same',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    // Property to indicate if user is active
    type: Boolean,
    default: true,
    select: false,
  },
});

// Middleware to hash the password before it is saved to the database
userSchema.pre('save', async function (next) {
  // Only run this function if the password was modified
  if (!this.isModified('password')) return next();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // Delete field
  this.passwordConfirm = undefined;
  next();
});

// Middleware to set the passwordChangedAt date before the document is saved to the database
userSchema.pre('save', async function (next) {
  // Only run this function if the password was modified and it is not because the document was newly created
  if (!this.isModified('password') || this.isNew) return next();
  // Minus 1s i.e. 1000ms to make sure that the jwt token is created definitely after the password was changed.
  // Any jwt token created before the password was changed is invalid.
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Query middleware to filter out inactive accounts
userSchema.pre(/^find/, async function (next) {
  // Only find documents equal to false
  this.find({ active: { $ne: false } });
  next();
});

// Add instance method to compare passwords
userSchema.methods.checkPassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Add instance method to check that password was not changed after jwt issued.
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    // Get the timestamp of the password change, divide by 1000 to get units in seconds
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    console.log(JWTTimestamp);
    console.log(changedTimestamp);
    return JWTTimestamp < changedTimestamp;
  }

  // Password was not changed
  return false;
};

// Add instance method to generate reset token
userSchema.methods.createPasswordResetToken = function () {
  // Generate the reset token string in hexadecimal format
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Encrypt the reset token string in hexadecimal format
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set the user reset token expiry time to 10 minutes (convert to milliseconds)
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  // Return the unencrypted token string to the user's email
  return resetToken;
};

// Create user model from schema
const User = mongoose.model('User', userSchema);

module.exports = User;
