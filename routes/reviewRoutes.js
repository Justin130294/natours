const express = require('express');
const reviewController = require(`./../controllers/reviewController`);
const authController = require(`./../controllers/authController`);

// Set merge params to true so that the middleware has access to the parameters prior to its route i.e. tourID
const router = express.Router({ mergeParams: true });

// Require user to be logged in for all review routes
router.use(authController.protect);

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo('user'),
    reviewController.setTourUserIds,
    reviewController.createReview,
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview,
  )
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview,
  );

module.exports = router;
