const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

exports.deleteOne = Model => catchAsync(async (req, res, next) => {

    const doc = await Model.findByIdAndDelete(req.params.id);

    if(!doc) {
        return next(new AppError(`Could not find the document with id ${req.params.id}`, 404))
    }

    res.status(204).json({
        status: "success",
        data: null
    })
})

exports.updateOne = Model => catchAsync(async (req, res, next) => {
    
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    })
    
    if(!doc) {
        return next(new AppError(`Could not find the document with id ${req.params.id}`, 404))
    }

    res.status(200).json({
        status: "success",
        data: {
            doc
        }
    });
})

exports.createOne = Model => catchAsync(async (req, res, next) => {
    // console.log(req.body);
    // const newTour = new Tour({});
    // newTour.save();
    
    const newDoc = await Model.create(req.body);
    res.status(201).json({
        status: "success",
        data: {
            data: newDoc
        }
    })
});

exports.getOne = (Model, populateObj) => catchAsync(async (req, res, next) => {
    //To populate guides (referencing)
    // const tour = await Tour.findById(req.params.id).populate('guides');
    // const tour = await Tour.findById(req.params.id).populate('reviews');
    // const tour = Tour.findOne({_id: req.params.id})  //Same as above 
    let query = Model.findById(req.params.id);
    if(populateObj)
        query = query.populate(populateObj);
    const doc = await query;

    if(!doc) {
        return next(new AppError(`Could not find the document with id ${req.params.id}`, 404))
    }

    res.status(200).json({
        status: "success",
        data: {
            doc
        }
    })
})

exports.getAll = Model =>  catchAsync(async (req, res, next) => {

    // GET tour/123gbf/reviews
    //for nested routing of reviews on tour
    let filter = {};
    if(req.params.tourId) 
    filter = {tour: req.params.tourId};

    //Api features
    const features = new APIFeatures(Model.find(filter), req.query).filter().sort().limitingFields().paginate();

    //Execute query
    // const doc = await features.query;
    const doc = await features.query;

    // const tour = await Tour.find()  //Same as above (MongoDB query)
    //     .where('duration')
    //     .equals(5)
    //     .where('difficulty')
    //     .equals('easy')

    //Send response
    res.status(200).json({
        status: 'success',
        results: doc.length,
        data: {
            doc
        }
    }) 
})