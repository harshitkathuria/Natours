const express = require('express');
const viewsController = require('../controller/viewsController');
const authController = require('../controller/authController');
const bookingController = require('../controller/bookingController');

const router = express.Router();          

router.use(viewsController.alert);

//Overview page
router.get('/', authController.isLoggedIn, viewsController.getOverview);

//Tour page
router.get('/tour/:slug', authController.isLoggedIn, viewsController.getTour);

//login page
router.get('/login', authController.isLoggedIn, viewsController.getLoginForm);

//signup form
router.get('/signup', authController.isLoggedIn, viewsController.getSignedUp);

//User's info page
router.get('/me', authController.protect, viewsController.getAccount);

//Action for update user 
router.post('/submit-user-data', authController.protect, viewsController.updateUserData)

//Get my tours
router.get('/my-tours', authController.protect, bookingController.getMyTours);

module.exports = router;