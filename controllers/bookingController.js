const Tour = require('./../models/tourModel');
const Booking = require('./../models/bookingModel');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const handlerFactory = require('./handlerFactory');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1) Get the currently booked tour
  const tour = await Tour.findById(req.params.tourId);
  // 2) Create the checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_type: ['card'],
    // Details about session
    mode: 'payment',
    // URL that user will be redirected to when payment is successful
    success_url: `${req.protocol}://${req.get('host')}/`,
    // URL that user will be redirected to when payment is unsuccessful
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    // Custom field to specify the tour id
    client_reference_id: req.params.tourId,
    // Details about product
    line_items: [
      {
        quantity: 1,
        price: 100,
        // price_data: {
        //   currency: 'usd',
        //   // Amount in cents by default
        //   unit_amount: tour.price * 100,
        //   product_data: {
        //     name: `${tour.name} Tour`,
        //     description: tour.summary,
        //     images: [`https://www.natours.dev/img/tours/${tour.imageCover}`],
        //   },
      },
      // },
    ],
  });
  // 3) Send checkout session as response to client
  res.status(200).json({
    status: 'success',
    session,
  });
});

exports.createBookingCheckout = catchAsync(async (req, res, next) => {
  const { tour, user, price } = request.query;
  if (!tour || !user || !price) return next();
  await Booking.create({ tour, user, price });
  // Redirect to the url without the query fields
  res.redirect(req.originalUrl.split('?')[0]);
});

exports.createBooking = handlerFactory.createOne(Booking);
exports.getBooking = handlerFactory.getOne(Booking);
exports.getAllBookings = handlerFactory.getAll(Booking);
exports.updateBooking = handlerFactory.updateOne(Booking);
exports.deleteBooking = handlerFactory.deleteOne(Booking);
