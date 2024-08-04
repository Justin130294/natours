const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/appError');
const { promisify } = require('util');
const crypto = require('crypto');
const Email = require('./../utils/email');

const signToken = (id) => {
  return jwt.sign(
    {
      id,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN,
    },
  );
};

// Function to send the jwt token in the response
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    // Set expiry date of the cookie (convert days to ms)
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true, // Browser can only send and receive cookies and not update them
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true; // Cookie can only be transmitted via https
  // Create cookie
  res.cookie('jwt', token, cookieOptions);
  // Remove password from the output to the client
  user.password = undefined;
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create(req.body);
  // Redirect user to the me page
  const url = `${req.protocol}://${req.get('host')}/me`;
  new Email(newUser, url).sendWelcome();
  // Send jwt token in response
  // create jwt token
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  // Get email and password (login credentials)
  const { email, password } = req.body;

  // 1) Check if email and password provided in input
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  // 2) Check if user exists && password is correct
  // append a '+' in front of the password to retrieve the password, which is unselected in the schema
  // user is a User document
  const user = await User.findOne({ email }).select('+password');

  // Use short-circuit logic to check if the username and passwords are correct.
  if (!user || !(await user.checkPassword(password, user.password))) {
    return next(new AppError('Incorrect password or username!', 401));
  }

  // 3) If everything ok, send token to client
  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  // Set the new cookie for logout
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  // Send the response
  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Check that the jwt token exists (in the authorization field of the request header)
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
    // If no authorization header, check for jwt in the cookies
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  // Raise error if there is no token.
  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401),
    );
  }
  // 2) Verify the jwt token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // 3) Check that the user exists
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return next(
      new AppError('The user belonging to this token does not exist.', 401),
    );
  }
  // 4) Verify that the password has not been changed since the jwt token was issued.
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(new AppError('User recently changed password!', 401));
  }
  // 5) Grant access to the protected route
  req.user = currentUser; // Set the user property of the request to the current user.
  res.locals.user = currentUser;
  next();
});

// Middleware to check if the user is logged in for rendered pages.
// Remove authorization header as they are not sent by rendered pages in the browser.
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1) verify token (in the cookies and not authorization header)
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );
      // 2) Check that the user exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }
      // 3) Verify that the password has not been changed since the jwt token was issued.
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }
      // If this is reached, there is a logged in user.
      // Set the current user to the response.locals so that the template can access the current user.
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

// Middleware to restrict following middleware to to certain user groups
// Middleware function should only have req, res, next as arguments. Thus,
// there is a need for a closure to have access to the specified admin roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      // Status code 403 for forbidden action
      return next(
        new AppError('You do not have permission to perform this action', 403),
      );
    }
    next();
  };
};

// Middleware to generate and return forget password token string to the user.
exports.forgetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    console.log('hello');
    return next(new AppError('There is no user with this email address', 404));
  }
  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  // Save the updated user document
  // Need to set validate before save to false since the password and passwordConfirm no longer match
  await user.save({ validateBeforeSave: false });
  // 3) Send the random reset token to the user's email

  try {
    // Create reset password link to be embedded in the email
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
    // Send password reset email
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token was sent to email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError('There was an error sending the email. Try again', 500),
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get the user based on the password token and check that the password token has not expired
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  // 2) If the token has not expired, and there is a user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  // Perform validation to check that password = passwordConfirm
  await user.save();
  // 3) Update changedPasswordAt property for the user via middleware
  // 4) Log the user in by providing the jwt
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get the user from the database collection
  // Remember to select +password to retrieve the password
  const user = await User.findById(req.user._id).select('+password');

  // 2) Check if the posted current password is correct
  if (!(await user.checkPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong', 401));
  }
  // 3) If the posted current password is correct, update the password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // User.findByIdAndUpdate will not work here as the presave middleware and validators do not work with update

  // 4) Log the user in and send JWT
  createSendToken(user, 200, res);
});
