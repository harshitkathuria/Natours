const Tour = require("../models/tourModel");
const User = require("../models/userModel");
const catchAsync = require('../utils/catchAsync');
const AppError = require("../utils/appError");

exports.alert = (req, res, next) => {
    const { alert } = req.query;
    if(alert === 'booking') {
        req.locals.alert = "Your booking was successful! If your booking doesn't show up here immediately, please come back later.."
    }
    next();
}

//Render overview page
exports.getOverview = catchAsync(async (req, res) => {

    //1) Get tours from Tour Model
    const tours = await Tour.find();

    //2) Build tour template
        //Done by creating pug template

    //3) Render that template using tour data from 1)
    res.status(200).render('overview', {
        title: 'Exciting tours for adventurous people',
        tours
    })
});

//Render tour page
exports.getTour = catchAsync(async (req, res, next) => {
    //1) Get the data for the requested tour (including reviews and guides)
    const tour = await Tour.findOne({ slug: req.params.slug }).populate({
        path: 'reviews',
        fields: 'review rating user'
    });

    if(!tour)
        return next(new AppError('Could not find the given tour!', 400));
    
    //2) Build Templates

    //3) Render tmeplate using data 1)
    res.status(200).render('tour', {
        title: `${tour.name} Tour`,
        tour
    })
});

//Render login page
exports.getLoginForm = (req, res) => {
    res.status(200).render('login', {
        title: 'Log into your account',
    })
}

//Render signup page
exports.getSignedUp = (req, res) => {
    res.status(200).render('signup', {
        title: 'SignUp to Natours'
    })
}

//Render user info
exports.getAccount = (req, res) => {
    res.status(200).render('account', {
        title: 'Your Account'
    })
}

//Update user info and Render user info with updated user
exports.updateUserData = catchAsync(async (req, res) => {
    const updatedUser = await User.findByIdAndUpdate(req.user.id, {
        name: req.body.name,
        email: req.body.email
    },
    {
        new: true,
        runValidators: true
    });

    res.locals.user = updatedUser;
    res.status(200).render('account', {
        title: 'Your Account',
        // user: updatedUser
    })
});