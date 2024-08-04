const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('../utils/appError');
const handlerFactory = require('./handlerFactory');
const multer = require('multer');
// package to resize image
const sharp = require('sharp');

// // Configure the multer file storage
// const multerStorage = multer.diskStorage({
//   // Specify the destination (cb is a callback function with access to the req and file)
//   destination: (req, file, cb) => {
//     // Set the file directory
//     // First argument is the error output, second argument is the filepath
//     cb(null, 'public/img/users');
//   },
//   // Specify the filename
//   filename: (req, file, cb) => {
//     // Get the file extension
//     const ext = file.mimetype.split('/')[1];
//     // Set the filename
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   },
// });

// Set the multerStorage to the memory in order to have access to the image in the buffer
// Image will be available in req.file.buffer
const multerStorage = multer.memoryStorage();

// Configure the multerFilter to ensure only images are uploaded
const multerFilter = (req, file, cb) => {
  // accept if file type is image
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

// Pass in the configuration for the multer object
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();
  // Set the filename so that the next middleware (updateMe) has access to the filename
  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;
  // Set up sharp object to resize the image to 500px by 500px with 90% quality
  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);
  next();
});

const filterObj = (obj, ...allowedFields) => {
  const newObject = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObject[el] = obj[el];
  });
  return newObject;
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // Middleware for user to update his personal data
  // 1) Create error if user POSTS password data
  console.log(req.file);
  console.log(req.body);
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This is not for password updates. Please use /updatePassword.',
        400,
      ),
    );
  }
  // 2) Filter out the fields that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'name', 'email');
  if (req.file) filteredBody.photo = req.file.filename;
  // 3) Update the user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });
  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  // Find the user based on the id and update the active property to false
  console.log(req.user);
  await User.findByIdAndUpdate(req.user._id, { active: false });
  // Send no content response
  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.getMe = (req, res, next) => {
  // Set the params id to the logged in user's id
  req.params.id = req.user.id;
  console.log(req.params.id);
  next();
};

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'Incomplete',
    message: 'This route is not yet defined! Please use /signup instead',
  });
};

exports.getAllUsers = handlerFactory.getAll(User);
exports.getUser = handlerFactory.getOne(User);
// Do NOT update passwords with this
exports.updateUser = handlerFactory.updateOne(User);
exports.deleteUser = handlerFactory.deleteOne(User);
