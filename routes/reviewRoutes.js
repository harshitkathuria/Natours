const express = require('express');
const reviewController = require('../controller/reviewController');
const authController = require('../controller/authController')

//Parent se aaye hue params ko preserve karta hai (tum use use kar sakte ho);
const router = express.Router({ mergeParams: true });

// POST tour/123f4d/reviews
// POST /reviews

//Ab dono hi request neeche wale route pe aayenge but we can still access tourId as mergeParams: true

router.use(authController.protect);

router.route('/')
    .get(reviewController.getAllReviews)
    .post(authController.restrictTo('user'), reviewController.setUserTourIds, reviewController.createReview)

router.route('/:id')
    .get(reviewController.getReview)
    .patch(authController.restrictTo('user', 'admin'), reviewController.updateReview)
    .delete(authController.restrictTo('user', 'admin'), reviewController.deleteReview)

module.exports = router;