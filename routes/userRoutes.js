const express = require('express');
const userController = require(`./../controllers/userController`);
const router = express.Router();
const authController = require(`./../controllers/authController`);

// Actions that can be performed without logging in
// Signup/login does not follow REST philosophy
// Since name of URL is associated with the action
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.post('/forgetPassword', authController.forgetPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// Actions that must be logged in to perform
// Protect all the routes that come after this point (since middleware is run in sequence)
// Add authController.protect to ensure that user is logged in
router.use(authController.protect);
router.patch('/updatePassword', authController.updatePassword);
// multer will place the file in the request object at req.file
router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe,
);
router.delete('/deleteMe', userController.deleteMe);
router.get('/me', userController.getMe, userController.getUser);
// Rest philosophy = name of URL has nothing to do with the action

// Actions that can only be performed by admin
router.use(authController.restrictTo('admin'));
router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);
router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
