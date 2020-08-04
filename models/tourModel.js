const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');
const User = require('./userModel');

//Creating tourSchema using mongoose.Schema
const tourSchema = new mongoose.Schema({
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      //Validators (inbuilt) -> for strings
      minlength: [10, 'A tour must have 10 or more characters'],
      maxlength: [40, 'A tour must have less than or equal 40 characters']
      // validate: [validator.isAlpha, 'name should be alphabatic']
    },
    slug: String,
    secret: {
      type: Boolean,
      default: false,
      select: false
    },
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration']
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size']
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      //to describe which all values are allowed for difficulty
      enum: {
        //Allowed values
        values: ['easy', 'medium', 'difficult'],
        message: 'A tour must have a difficulty of easy or medium or difficult'
      }
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1.0, 'A tour must have a rating equal to or greater than 1.0'],
      max: [5.0, 'A tour must have a rating equal to or less than 5.0'],
      //Runs each time a new value is set for ratingsAverage, receives a callback function
      //Math.round() gives integer, i.e gives  for 4.666
      set: val => Math.round(val * 10) / 10 //4.6666 => 46.666 => 47 => 4.7
    },
    ratingsQuantity: {
      type: Number,
      default: 0
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price']
    },
    priceDiscount: {
      type: Number,
      //Custom validator
      validate: {
        validator: function(val) {
          return val < this.price
        },
        message: 'Price Discount should be less than price'
      }
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a description']
    },
    description: {
      type: String,
      trim: true
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image']
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false //ye nhi dikhai dega
    },
    startDates: [Date],
    startLocation: {
      // GeoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point']
      },
      coordinates: [Number],
      address: String,
      description: String
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number
      }
    ],
    
    //Embedding guides into tourModel
    // guides: Array

    //Referencing guides
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      } 
    ]
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

//Creating a virtual property
//It will not be stored in the database and so cannot be queried upon
//It will just be showed
tourSchema.virtual('durationWeeks').get(function(){
  return this.duration / 7;
});

//VIRTUAL POPULATING
//To add reference of reviews on a tour but not saving its reference on the database
//On getTourById
tourSchema.virtual('reviews', {
  ///Reference model
  ref: 'Review',
  //Name of the field in the ref model(Reviews here) where the reference to the current model(Tour here) is stored
  //In review model we have a field 'tour'
  foreignField: 'tour',
  //Where is the id is actually stored in this current model
  localField: '_id',
})

//INDEX

//INDEX -> ek alag jagah pe index ke hisaab se document stored honge in custom sorted fir
//and fir jab us index pe query hogi to saare document scan karne ki bajaye wo us index pe pade docs ko scan karega 

//Set an index for price in asc order
// tourSchema.index({ price: 1 });

//Compound index
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
//for Geospatial query
tourSchema.index({ startLocation: '2dsphere' });

//DOCUMENT MIDDLEWARE: runs only before .save() and .create() 
//pre -> runs before the event viz 'save' here
//Pre save hook
tourSchema.pre('save', function(next) {
  //this here refers to the current document
  this.slug = slugify(this.name, { lower: true});
  next();
})

//For embedding guides into tours
// tourSchema.pre('save', async function(next) {
//   //returns promises as the function inside map is async and map returns the result of the function viz promise here
//   const guidesPromises = this.guides.map(async id => await User.findById(id));
//   //Runs all promises
//   // console.log(guidesPromises);
//   next();
// })

//To populate guides in tour
tourSchema.pre(/^find/, function(next) {
  // this.populate('guides')
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt'
  })
  next();
})

// //We can have multiple document middleware

// //Post save hook --> runs after event
tourSchema.post('save', function(doc, next) {
  // console.log(doc); //The saved document
  next();
})

//QUERY MIDDLEWARE
tourSchema.pre(/^find/, function(next) {
  //here this refers to current query
  this.find({ secret: { $ne: true}} );  //show only non-secret tour
  this.start = Date.now();
  next();
})

// tourSchema.post(/^find/, function(docs, next) {
//   console.log(`The time taken is ${Date.now() - this.start} millisecond`);
//   next();
// })

//AGGREAGATE MIDDLEWARE
tourSchema.pre('aggregate', function(next) {
  //this here refers to the the current aggregate 
  // console.log(this.pipeline());
  // this.pipeline().unshift({ $match: { secret: { $ne: true }}})  //adding the non-secret tour to the match stage 
  next();
}) 

//Creating model out of schema
const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;