const AppError = require("../utils/appError")

const handleCastErrorDB = err => {
    const message = `Invalid ${err.path}: ${err.value}`;
    return new AppError(message, 400);
}

const handleDuplicateFieldsDB = error => {
    const message = `Duplicate field value ${error.keyValue.name}. Please use another value`;
    return new AppError(message, 400)
}

const handleValidationErrorDB = error => {
    const errors = Object.values(error.errors).map(el => el.message);
    const message = `Validation error. ${errors.join('. ')}`;

    return new AppError(message, 400);
}

const handleJWTError = () => new AppError('Invalid token...', 401);

const handleJWTExpiresError = () => new AppError('Your token is expired', 401);

const sendErrorDev = (err, req, res) => {
    //API
    if(req.originalUrl.startsWith('/api')) {
        res.status(err.statusCode).json({
            status: err.status,
            error: err,
            message: err.message,
            stack: err.stack
        })
    }
    //Render
    else {
        res.status(200).render('error', {
            title: 'Something went wrong',
            msg: err.message
        })
    }

}

const sendErrorProd = (err, req, res) => {

    console.log(err);
    //API
    if(req.originalUrl.startsWith('/api')) {
        //Operational, trusted error: send message to the client
        if(err.isOperational) {
            res.status(err.statusCode).json({
                status: err.status,
                message: err.message
            })
        }
        //Programming or unwanted error: don't leak error
        else {
            // console.log(err);
            res.status(err.statusCode).json({
                status: 'fail',
                message: 'Something went wrong'
            })
        }
    }
    //Render
    else {
        //Operational, trusted error: send message to the client
        if(err.isOperational) {
            res.status(err.statusCode).render('error', {
                title: 'Something went wrong!',
                msg: err.message
            })
        }
        //Programming or unwanted error: don't leak error
        else {
            res.status(err.statusCode).render('error', {
                title: 'something went wrong!',
                msg: 'Try again later'
            })
        }
    }
}

module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
    console.log(err);

    if(process.env.NODE_ENV === 'development') {
        // console.log('in dev');
        sendErrorDev(err, req, res);
    }
    else if(process.env.NODE_ENV === 'production') {
        // console.log('in prod')
        let error = {...err};
        error.message = err.message
        //Now the error becomes an appError which has isOperational set to true
        if(err.name === 'CastError') {  
            error = handleCastErrorDB(error);
        }
        //For unique validator
        if(err.code === 11000) {
            error = handleDuplicateFieldsDB(error);
        }
        //For validator error like constraint on length, etc
        if(err.name === 'ValidationError') {
            error = handleValidationErrorDB(error);
        }
        //If Jwt is wrong
        if(err.name === 'JsonWebTokenError') {
            error = handleJWTError();
        }
        //If jwt is expired
        if(err.name === 'TokenExpiredError') {
            error = handleJWTExpiresError();
        }
        sendErrorProd(error, req, res);
    }
}