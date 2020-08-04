const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const signToken = id => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    })
}

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);
    const cookieOptions = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
        //So that no one can change it
        httpOnly: true
    }

    //So that cookie transfer take place over https
    if(process.env.NODE_ENV === 'production')
        cookieOptions.secure = true;

    res.cookie('jwt', token, cookieOptions);

    //So that it doesn't show up in response.....It actually doesn't update in document, just modified for output
    //To save it we would have to use user.save()
    user.password = undefined;

    // console.log('From csToken: ' + token);
    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user
        }
    })
}

exports.signup = catchAsync(async (req, res, next) => {
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        role: req.body.role,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
        passwordChangedAt: req.body.passwordChangedAt,
    })

    const url = `${req.protocol}://${req.get('host')}/me`;
    await new Email(newUser, url).sendWelcome();

    createSendToken(newUser, 201, res);
})

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;
    // const email = req.body.email;

    //1) Check if both email and password are provided by the user
    if(!email || !password) {
        return next(new AppError('Please provide both email and password'), 400);
    }

    //2) Check if user exits && password is correct
    const user = await User.findOne({ email }).select('+password'); //+ sign because it was selected false by default

    if(!user || !await user.correctPassword(password, user.password)) {
        return next(new AppError('Incorrect email or password'), 401);
    }
    //3) If everything is OK, send token to client
    createSendToken(user, 200, res);
})

//To protect routes from non-logged users
exports.protect = catchAsync(async (req, res, next) => {
    
    //1) Getting token and check if it's there
    let token;
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    //Checking if jwt is there in cookie
    else if(req.cookies.jwt)
        token = req.cookies.jwt;

    if(!token) {
        return next(new AppError('Please log in first', 401));
    }
    // console.log(req.headers);

    //2) Verification of token
    
    //promisify to make this function return a promise
    //ye actually verify karta hai ki kya ye token is secret key se bana hai hai ya nhi
    //and agar bana hai to iske pass uski poori info hogi like payload jo hum await karte hai
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    // console.log(decoded);

    //3) Check if user still exist
    //ki kahin user delete to nhi ho gaya ho
    const currentUser = await User.findById(decoded.id);
    // console.log(currentUser);
    if(!currentUser) {
        return next(new AppError('The user belonging to this token no longer exist', 401));
    }

    //4) Check is user changed password after the token was issued
    if(currentUser.changedPasswordAfter(decoded.iat)) {
        return next(new AppError('The password was changed..Please log in again'), 401);
    }

    //Granting acess to the protected route and storing the user in req.user for later authorization purpose
    req.user = currentUser;
    res.locals.user = currentUser;

    next();
})

//Only for render pages..Does not causes error
exports.isLoggedIn = catchAsync(async (req, res, next) => {
    //Checking if jwt is there in cookie
    if(req.cookies.jwt) {
        try {

            //2) Verification of token
            
            //promisify to make this function return a promise
            //ye actually verify karta hai ki kya ye token is secret key se bana hai hai ya nhi
            //and agar bana hai to iske pass uski poori info hogi like payload jo hum await karte hai
            const decoded = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET);
            // console.log(decoded);

            if(!decoded)
                return next();
    
            //3) Check if user still exist
            //ki kahin user delete to nhi ho gaya ho
            const currentUser = await User.findById(decoded.id);
            // console.log(currentUser);
            if(!currentUser) {
                return next();
            }
    
            //4) Check is user changed password after the token was issued
            if(currentUser.changedPasswordAfter(decoded.iat)) {
                return next();
            }
    
            //Adding user to req.locale which can be used in every view template
            res.locals.user = currentUser;
            return next();
        }
        catch (err) {
            return next();
        }
    }
    next();
});

//Log Out controller
exports.logOut = (req, res) => {
    res.cookie('jwt', 'loggedout', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    })
    res.status(200).json({
        status: 'success'
    })
}

//...roles => variable arguements array
exports.restrictTo = (...roles) => {
    //roles: ['admin', 'lead-guide']
    return (req, res, next) => {
        //if the role is not admin or lead-guide then return error
        if(!roles.includes(req.user.role)) {
            return next(new AppError('You are not allowed to perform this action', 403));
        }

        //Else proceed further
        next();
    }
}

//For generating reset password token and e-mail to the client
exports.forgotPassword = catchAsync(async (req, res, next) => {

    //1)Get user based on POSTed e-mail
    const user = await User.findOne({ email: req.body.email });
    //If user not found...Retunr error
    if(!user) {
        return next(new AppError('No user exists with this e-mail', 404));
    }

    //2)Generate the random reset token
    const resetToken = user.createPasswordResetToken();
    //this.resetPassword was modified, not saved -> So to save we actually call save method
    //To do not run validator as they would require us to enter the required field again
    await user.save({ validateBeforeSave: false});

    //3) Send it to user's e-mail
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/user/restPassword/${resetToken}`;

    const message = `Forgot your password? Submit a PATCH request with your new password and confirm password to :${resetURL}\nIf you didn't forget your password please ignore this email`;

    try {
        // await sendEmail({
        //     email: user.email,
        //     subject: 'Your password reset token(valid for 10min)',
        //     message
        // })

        await new Email(user, resetURL).sendPasswordReset();
    
        res.status(200).json({
            stataus: 'success',
            message: 'Token sent to email!'
        })
    }
    catch(err) {
        console.log(err);
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        return next(new AppError('There was an error sending the email'), 500);
    }
})

exports.resetPassword = catchAsync(async (req, res, next) => {
    //1) Get user based on the token
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({ 
        passwordResetToken: hashedToken,
        passwordResetExpires: {$gt: Date.now()}
    });
    //2) If token has not expired, and there is user, set the password
    if(!user) {
        return next(new AppError('Token is invalid or expired', 400))
    }
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save(); 

    //3) Update changedPasswordAt property for the user
        //In pre save middleware
    
    //4) Log the user in , send JWT 
    createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
    //1) Get user from the collection
    // console.log(req.user.id);
    const user = await User.findById(req.user.id).select('+password');

    //2) Check if the POSTed current password is correct
    if(!await user.correctPassword(req.body.passwordCurrent, user.password)) {
        return next(new AppError('The password is incorrect'), 401);
    }

    //3) If so, then update the password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();

    //4) Log in the user, send JWT
    createSendToken(user, 200, res);
})