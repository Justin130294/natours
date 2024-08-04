const Tour = require('./../models/tourModel');

const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const handlerFactory = require('./handlerFactory');
const multer = require('multer');
// package to resize image
const sharp = require('sharp');

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

// Use upload.array('images', 5) to upload up to 5 files for images field
// Use upload.single('image') to upload 1 file for the image field

// Use upload.fields to upload multiple files for multiple fields
exports.uploadTourImages = upload.fields([
  {
    name: 'imageCover',
    maxCount: 1,
  },
  { name: 'images', maxCount: 3 },
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  // Return next() if there is no image cover or images
  if (!req.files.imageCover || !req.files.images) return next();

  // 1) Process cover image
  // Set the url to the req.body so that the document is updated as well
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // 2) Process images
  req.body.images = [];

  // Use Promise.all to make sure that all the filenames are added to req.body before next()
  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;
      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);
      // Push the image filename to the request body so that the document can be updated.
      req.body.images.push(filename);
    }),
  );
  next();
});

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = 5;
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.getAllTours = handlerFactory.getAll(Tour);
exports.getTour = handlerFactory.getOne(Tour, { path: 'reviews' });
exports.createTour = handlerFactory.createOne(Tour);
exports.updateTour = handlerFactory.updateOne(Tour);
exports.deleteTour = handlerFactory.deleteOne(Tour);

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        // get count of tour documents
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxprice: { $max: '$price' },
      },
    },
    // set 1 to sort avgPrice in ascending order
    { $sort: { avgPrice: 1 } },
    { $match: { _id: { $ne: 'EASY' } } },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;
  const plan = await Tour.aggregate([
    {
      // create new document for each start date in array
      $unwind: '$startDates',
    },
    {
      $match: {
        // filter only the start dates in the year
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        // group according to the month of start dates
        _id: { $month: '$startDates' },
        // add the number of tours for each month
        numTourStarts: { $sum: 1 },
        // add the tour names for each month
        tours: { $push: '$name' },
      },
    },
    {
      // add the month field whose value is _id
      $addFields: { month: '$_id' },
    },
    {
      // remove the _id field
      $project: { _id: 0 },
    },
    {
      // sort according to numTourStarts (descending)
      $sort: { numTourStarts: -1 },
    },
    {
      $limit: 12, // set limit on number of results
    },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});

exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  // Convert the radius from the center in radians by dividing by the radius of the Earth
  // 3963.2 = Earth's radius in miles, 6378.1 = Earth's radius in km
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;
  // Check that the latitude and longitude were provided
  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat, lng.',
        400,
      ),
    );
  }
  // Get the tours within the specified distance from the center (in radians)
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });
  console.log(tours);
  // Send response to the client
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  // Set the distance multiplier for conversion to miles or km
  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;
  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat, lng.',
        400,
      ),
    );
  }
  // Get the distances from the center using geoNear
  const distances = await Tour.aggregate([
    // geoNear must be the first operation in the aggregation pipeline for GeoJSON data
    {
      $geoNear: {
        // Location from which to calculate the distances
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        // Name of the distance field
        distanceField: 'distance',
        // Multipliers to the distance field
        distanceMultiplier: multiplier,
      },
    },
    // Select the fields to output
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      data: distances,
    },
  });
});
