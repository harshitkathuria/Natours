const mongoose = require("mongoose");
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema({
    review: {
        type: String,
        required: [true, 'Cannot be left empty']
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        required: [true, 'rating cannot be left empty']
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    //Reference to tour
    tour: {
        type: mongoose.Schema.ObjectId,
        ref: 'Tour',
        required: [true, 'Review must belong to a tour']
    },
    //Reference to user
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Review must belong to a user']
    },
}, 
{
    toJSON: {
        virtuals: true
    },
    toObject: {
        virtuals: true
    }
});


//Allowing a user to write a single review on a tour
//Any combination of tourId and user will be unique otherwise it will give error 
reviewSchema.index({ tour: 1, user: 1 }, { unique: true })

//To populate tour and user
reviewSchema.pre(/^find/, function(next) {
    // To populate with all informations
    // this.populate('tour user'); 

    //To populate with selected info
    // this.populate({
    //     path: 'tour',
    //     select: 'name'
    // }).populate({
    //     path: 'user',
    //     select: 'name photo'
    // })
    this.populate({
        path: 'user',
        select: 'name photo'
    })
    next();
})

//static function, just like instance method can be called on the model
//We used static so that we can use this.aggregate as this here points to the current Model
reviewSchema.statics.calcAvgRatings = async function(tourId) {
    //this points to the current model
    const stats = await this.aggregate([
        {
            $match: {tour: tourId}
        },
        {
            $group: {
                _id: '$tour',
                nRatings: { $sum: 1 },   //Number of ratings
                avgRatings: { $avg: '$rating' } //Avg Ratings
            }
        }
    ]);
    // console.log(stats);
    if(stats) {
        await Tour.findByIdAndUpdate(tourId, {
            ratingsAverage: stats[0].avgRatings,
            ratingsQuantity: stats[0].nRatings
        })
    }
    else {
        await Tour.findByIdAndUpdate(tourId, {
            ratingsAverage: 4.5,
            ratingsQuantity: 0
        })
    }
}

reviewSchema.post('save', function() {
    
    //this.constructor => Model of the Schema
    // We cannot write Review.calcAvgRatings() as Review is not defined yet
    // And if we write this post save hook after declaration of Review Model then this will never be execute
    //as these middleware are run in sequence and should be declared before the Model declaration

    //this here points to the saved document
    this.constructor.calcAvgRatings(this.tour);
})

//We pass review from pre to post middleware by creating property on "this" as this.review
reviewSchema.pre(/^findOneAnd/, async function(next) {
    //Find the body of this query using this.findOne()
    this.review = await this.findOne();
    // console.log(review);
    next();
})

//We take tourId from this.review.tour
reviewSchema.post(/^findOneAnd/, async function() {
    //Model = this.review.constructor
    //this.findOne() does not work here, As the query is completed in post query middleware
    await this.review.constructor.calcAvgRatings(this.review.tour);
})

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;