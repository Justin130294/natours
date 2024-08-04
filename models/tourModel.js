const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');
// const User = require('./userModel');
// Specify scheme
const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour must have less or equal than 40 characters'],
      minlength: [10, 'A tour name must have more or equal than 10 characters'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either: easy, medium, difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be at least 1.0'],
      max: [5, 'Rating must be at most 5.0'],
      // Round the multiplied value by 10 ^ 1 and then divide by 10^1 to get rounded value to 1 d.p.
      // Math.round(value) rounds the value to integer values
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          // this only points to the current document on new document creation
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) should be below regular price',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a description'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      // name of reference to the image as
      // images are placed elsewhere in the file system
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      // mongo will automatically convert the timestamp to
      // the date of creation
      default: Date.now(),
      select: false,
    },
    // mongo will parse the strings into a Date object
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      //GeoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    // Set up property for referencing
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    // return virtual fields when converting to JSON or to object
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexing (1 for ascending order, -1 for descending order)
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
// Index the start location for GeoJSON querying
tourSchema.index({ startLocation: '2dsphere' });

// create virtual field for duration in weeks
tourSchema.virtual('durationInWeeks').get(function () {
  return this.duration / 7;
});

// Create virtual field for the reviews that is not persisted in the database
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour', // Location in child the parent reference is at
  localField: '_id', // Parent reference field
});

// Document Middleware (this is the document object)
// runs before .save() and .create()
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// Embedding model
// Document Middleware to find and embed the tour guides
// tourSchema.pre('save', async function (next) {
//   // returns promises that return the guide documents since it is an async function
//   const guidesPromises = this.guides.map(async (id) => User.findById(id));
//   // Resolve the promises
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

// Query middleware
tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

// Query middleware to populate the reference object ids
// and filter out certain fields
tourSchema.pre(/^find/, function (next) {
  this.populate({
    // Populate the guides field
    path: 'guides',
    // Do not include below fields in the output
    select: '-__v -passwordChangedAt',
  });
  next();
});

tourSchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${Date.now() - this.start} milliseconds`);
  next();
});

// Aggregate middleware
// tourSchema.pre('aggregate', function (next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   next();
// });

// Create model from schema; this also creates a collection in MongoDB
const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
