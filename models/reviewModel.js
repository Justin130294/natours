const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review cannot be empty!'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour.'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must be written by a user.'],
    },
  },
  {
    // Ensure that derived (virtual) properties that are not stored
    // in the database are shown when the document is retrieved from database
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Set index to prevent duplication of tour and user
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
  // Populate the user and tour fields
  //   this.populate({ path: 'tour', select: 'name' }).populate({
  //     path: 'user',
  //     select: 'name photo',
  //   });
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});

// Create static method to store the average rating for each tour
// Static method because we need to use the aggregate method on the Model and not schema
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  // Calculate the statistics (this refers to the review Model since aggregate must be called on the Model)
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        // Specify group by tour
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  if (stats.length > 0) {
    // Find tour by id and set the statistical properties
    await Tour.findByIdAndUpdate(tourId, {
      ratingsAverage: stats[0].avgRating,
      ratingsQuantity: stats[0].nRating,
    });
  } else {
    // Set default properties if there are no reviews
    await Tour.findByIdAndUpdate(tourId, {
      ratingsAverage: 4.5,
      ratingsQuantity: 0,
    });
  }
};

// Add middleware to calculate the aggregation when review is created.
reviewSchema.post('save', async function () {
  // this refers to the current review document
  // Use this.constructor to refer to the Review model
  await this.constructor.calcAverageRatings(this.tour);
});

// Add middleware to calculate the aggregation when review is deleted or updated.
// 1st step: Use the pre query middleware to store the review document in the query.
// 2nd step: Use the post query middleware to update the statistics are after the document is updated or delete
reviewSchema.pre(/findOneAnd/, async function (next) {
  // Execute the query object (this) and store it in this so that it can be accessed via the post middleware
  this.review = await this.findOne();
  next();
});

reviewSchema.post(/findOneAnd/, async function () {
  // Update the ratings statistics after the review is updated or deleted
  await this.review.constructor.calcAverageRatings(this.review.tour);
});

// Set up the Review model in MongoDB
const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
