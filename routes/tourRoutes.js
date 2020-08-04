const express = require('express');

const tourController = require('../controller/tourController');
const authController = require('../controller/authController');
const reviewController = require('../controller/reviewController')
const reviewRouter = require('./reviewRoutes');
const router = express.Router();

// router.param('id', (req, res, next, val) => {
//     console.log(`The parameter is ${val}`);
//     next();
// });

//Works only for for variables in url
// router.param('id', tourController.checkId);

// POST tour/123f4d/reviews
// GET tour/126gd/reviews

//Nested Routing
router.use('/:tourId/reviews', reviewRouter);

// router.route('/:tourId/reviews')
//     .post(authController.protect, authController.restrictTo('user'), reviewController.createReview);

//Get top 5 rated tours
router.route('/top-5-rated')
    .get(tourController.aliasTopTours, tourController.getAllTours)

//Get tour stats (aggregation pipeline)
router.route('/tour-stats')
    .get(tourController.getTourStats);

router.route('/monthly-plan/:year')
    .get(authController.protect, authController.restrictTo('admin', 'lead-guide', 'guide'), tourController.getMonthyPlan)

//Get tours within a certain radius across center co-ordinates
// tours-within/200/center/-40,45/unit/mi
router.route('/tours-within/:distance/center/:latlng/unit/:unit')
    .get(tourController.getToursWithin)

//Get distances of tour from a point
router.route('/distances/:latlng/unit/:unit')
    .get(tourController.getTourDistances)

router.route('/')   //The root url
    .get(tourController.getAllTours)
    .post(authController.protect, authController.restrictTo('admin', 'lead-guide'), tourController.createTour)

router.route('/:id')    //root plus id url
    .get(tourController.getTour)
    .patch(authController.protect, authController.restrictTo('admin', 'lead-guide'), tourController.uploadTourImages, tourController.resizeTourImages, tourController.updateTour)
    .delete(authController.protect, authController.restrictTo('admin', 'lead-guide'), tourController.deleteTour)

module.exports = router;