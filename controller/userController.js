const multer = require('multer');
const catchAsync = require("../utils/catchAsync");
const User = require("../models/userModel");
const AppError = require("../utils/appError");
const factory = require('./handleFactory');
const sharp = require('sharp');

//Configure multer options

//Multer Storage
// const multerStorage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, 'public/img/users');
//     },
//     filename: (req, file, cb) => {
//         //user-userId-timeStamp-ext
//         const ext = file.mimetype.split('/')[1];
//         cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//     }
// })

//image stored in buffer
const multerStorage = multer.memoryStorage();

//Multer filter
const multerFilter = (req, file, cb) => {
    if(file.mimetype.startsWith('image')) {
        cb(null, true);
    }
    else {
        cb(new AppError('Not an image! PLease upload only image', 400), false);
    }   
}

const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter
})

exports.uploadUserPhoto = upload.single('photo');

//Resize user photo
exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
    if(!req.file)
        return next();

    req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;
    
    await sharp(req.file.buffer)
        .resize(500, 500)
        .toFormat('jpeg')
        //90 % quality
        .jpeg({ quality: 90 })
        .toFile(`public/img/users/${req.file.filename}`);

    next();
});

//Return onlt the allowed fields
const filterObj = (obj, ...allowedFields) => {
    const newObj = {};
    Object.keys(obj).forEach(el => {
        if(allowedFields.includes(el))
        newObj[el] = obj[el];
    });
    return newObj;
}

// Middleware for setting id = currentUser.Id so that we can get the info of the current User
exports.getMe = (req, res, next) => {
    req.params.id = req.user.id;
    next();
}

// exports.getAllUsers = catchAsync(async (req, res) => {
//     const users = await User.find();
//     res.status(200).json({
//         status: 'success',
//         data: {
//             users
//         }
//     })
// });

exports.updateMe = catchAsync(async (req, res, next) => {

    console.log(req.file);

    //1) Create error if user POSTed password
    if(req.body.password || req.body.passwordConfirm) {
        return next(new AppError('This route is not for changing password..To change password please head over to: /updateMyPassword', 400));
    }

    //2) Filter out the unwanted fields (so that user cannot update their role as admin)
    const filteredBody = filterObj(req.body, 'name', 'email');
    //To store the image name to the filteredObj
    if(req.file)
        filteredBody.photo = req.file.filename;

    //3)Update user document
    const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
        new: true, 
        runValidators: true
    });

    res.status(200).json({
        status: 'success',
        data: {
            user: updatedUser
        }
    })
});

exports.deleteMe = catchAsync(async (req, res, next) => {
    //We are actually not deleting the user from our database, instead marking them inactive
    await User.findByIdAndUpdate(req.user.id, { active: false });
    res.status(204).json({
        status: 'success',
        data: null
    })
});

exports.createUser = (req, res) => {
    res.status(500).json({
        status: "fail",
        message: "This route is not yet defined..."
    });
};

//Get all users
exports.getAllUsers = factory.getAll(User);

//Get user by Id
exports.getUser = factory.getOne(User);

//Updating a User (by Admin)
//DO NOT UPDATE PASSWORD
exports.updateUser = factory.updateOne(User);

//Deleting a user (by Admin)
exports.deleteUser = factory.deleteOne(User);