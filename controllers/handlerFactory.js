const catchAsync = require('./../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('./../utils/apiFeatures');

// Factory method for deletion
exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }
    res.status(204).json({
      status: 'success',
      data: null,
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    // Patch the field in the specified tour object with the
    // updated values in res.body (only the relevant fields will be
    // patched)
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      // return the updated instead of the original object
      new: true,
      // check the updated object meets the model's schema rules
      runValidators: true,
    });
    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }
    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    // Create new tour object using the body of the request.
    const doc = await Model.create(req.body);
    // Return response
    res.status(201).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

// Include both the model and the populate options as input
exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    // Create query
    let query = Model.findById(req.params.id);
    // Populate the query if there are populate options
    if (popOptions) query = query.populate(popOptions);
    // Retrieve the document from the database
    doc = await query;

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    // Set filter for finding reviews associated with a specific tour id with nested routes (hack to include filter)
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };
    // Execute query to retrieve documents from the collection using the await keyword
    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const doc = await features.query;

    res.status(200).json({
      status: 'success',
      results: doc.length,
      data: {
        data: doc,
      },
    });
  });
