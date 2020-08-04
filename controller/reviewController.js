const Review = require("../models/reviewModel");
const catchAsync = require("../utils/catchAsync");
const factory = require('./handleFactory');

exports.setUserTourIds = catchAsync(async (req, res, next) => {
  
  //POST tour/123fcr/reviews
  //POST /reviews

  if(!req.body.tour)
    req.body.tour = req.params.tourId;
  if(!req.body.user)
    req.body.user = req.user.id;

  next();
})

// exports.getAllReviews = catchAsync(async (req, res, next) => {

//   //GET tour/123gbf/reviews
//   let filter = {};
//   if(req.params.tourId) 
//   filter = {tour: req.params.tourId};

//   const reviews = await Review.find(filter);
//   res.status(200).json({
//     status: 'success',
//     results: reviews.length,
//     data: {
//       reviews
//     }  
//   })
// });

//Get all tours
exports.getAllReviews = factory.getAll(Review);  

//Get review by Id
exports.getReview = factory.getOne(Review);

//Create review
exports.createReview = factory.createOne(Review);

//Update review
exports.updateReview = factory.updateOne(Review);

//Deleting a review
exports.deleteReview = factory.deleteOne(Review);