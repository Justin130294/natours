// Import file system module
const path = require('path');
const morgan = require('morgan');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const cookieParser = require('cookie-parser');
// Security packages
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const csp = require('express-csp');

// Initialise express application
const express = require('express');
const app = express();

// Add template engine and path to views folder
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 1) Global Middleware
// Specify the folder where static files will be served
app.use(express.static(path.join(__dirname, 'public')));
// Set security HTTP headers
// helmet should be the first middleware
app.use(helmet());
csp.extend(app, {
  policy: {
    directives: {
      'default-src': ['self'],
      'style-src': [
        'self',
        'unsafe-inline',
        'https',
        'https://api.mapbox.com/',
        'https://fonts.googleapis.com/',
      ],
      'font-src': ['self', 'https://fonts.gstatic.com'],
      'script-src': [
        'self',
        'unsafe-inline',
        'data',
        'blob',
        'https://js.stripe.com',
        'https://*.cloudflare.com',
        'https://bundle.js:8828',
        'ws://127.0.0.1:*/',
        'https://api.mapbox.com/',
        'https://fonts.googleapis.com/css',
      ],
      'worker-src': [
        'self',
        'unsafe-inline',
        'data:',
        'blob:',
        'https://*.stripe.com',
        'https://*.cloudflare.com',
        'https://bundle.js:*',
        'ws://127.0.0.1:*/',
      ],
      'frame-src': [
        'self',
        'unsafe-inline',
        'data:',
        'blob:',
        'https://*.stripe.com',
        'https://*.cloudflare.com',
        'https://bundle.js:*',
        'ws://127.0.0.1:*/',
      ],
      'img-src': [
        'self',
        'unsafe-inline',
        'data:',
        'blob:',
        'https://*.stripe.com',
        'https://*.cloudflare.com/',
        'https://bundle.js:*',
        'ws://127.0.0.1:*/',
      ],
      'connect-src': [
        'self',
        'unsafe-inline',
        'data:',
        'blob:',
        'https://*.stripe.com',
        'https://*.cloudflare.com/',
        'https://bundle.js:*',
        'ws://127.0.0.1:*/',
        'https://api.mapbox.com/',
        'https://events.mapbox.com/',
      ],
    },
  },
});

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit request from the same API
// Set the options for the rate limiter
const limiter = rateLimit({
  // Allow a maximum of 100 requests from the same IP in 1 hour
  max: 100,
  windowMs: 60 * 60 * 1000, // 1 hour in ms
  message: 'Too many requests from this IP, please try again in an hour!',
});
// Apply the limiter middleware to the /api route
app.use('/api', limiter);

// Body parser to read data from body into req.body
app.use(express.json({ limit: '10kb' })); // Any request body larger than 10kb will not be read
// URL Encoded form parser to read URL Encoded forms (Setting extended: true allows us to pass in complex data)
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
// Cookie parser to read cookie data
app.use(cookieParser());

// Data sanitization against SQL injection
app.use(mongoSanitize());

// Data santization against XSS attacks (remove malicious html code from the request body and params)
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  }),
);

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

// 3) Routes
app.use('/', viewRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// 4) Global Error Middleware
app.use(globalErrorHandler);

module.exports = app;
