const path = require('path');
const fs = require('fs');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controller/errorController');

const app = express();

// Global Middlewares

//Ude pug as template engine / view engine
app.set('view engine', 'pug');
//to tell where are templates(called views from MVC) are located 
app.set('views', path.join(__dirname, 'views'));

//Used to serve static files like html, css, etc

/* So if there is no route handler defined for our route,
    ye public folder meiin dekhega...So to open overview.html in public
    folder we have to search 'localhost/overview.html', not
    'localhost/public/overview.html', because agar handler defined 
    nhi hota to wo hamare root ko 'localhost/public' maan ke dhoondta hai
*/
app.use(express.static(path.join(__dirname, 'public')));

//Set security HTTP header
app.use(helmet());

//To restrict requests in a span of time --> to avoid bruteforce attack
const limiter = rateLimit({
    max: 100,   //100 requests
    windowMs: 60 * 60 * 60, //In 1 hour
    message: 'Too many request with this IP...Please try again in 1 hour'
})
//To restrict api request
app.use('/api', limiter);

//Used to log the request with nice info in development
if(process.env.NODE_ENV == 'development')
    app.use(morgan('dev'));

//Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb'}));    //Body with size 10kb will not be accepted;
//cookie parser
app.use(cookieParser());
//form body parser
app.use(express.urlencoded({ extended: 'true', limit: '10kb' }))

//To sanitize data against NoSQL query Injection
app.use(mongoSanitize())

//To sanitize data against XSS
app.use(xss());

//Prevent parameter pollution
app.use(hpp({
    whitelist: ['duration', 'difficulty', 'price', 'ratingsAverage', 'ratingsQuantity', 'maxGroupSize']
}));

app.use((req, res, next) => {
    // console.log('Hello from the middleware');
    req.requestTime = new Date().toUTCString();
    next();
});

// app.get('/api/v1/tours', getAllTours);
// app.get('/api/v1/tours/:id', getTour);
// app.post('/api/v1/tours', createTour);
// app.patch('/api/v1/tours/:id', updateTour)
// app.delete('/api/v1/tours/:id', deleteTour);

//It means use viewRouter middleware for '/' url, i.e root url
app.use('/', viewRouter);
//It means use tourRouter middleware for 'api/v1/tours' url
app.use('/api/v1/tours', tourRouter);
//It means use userRouter middleware for 'api/v1/users' url
app.use('/api/v1/users', userRouter);
//It means use reviewRouter middleware for 'api/v1/reviews' url
app.use('/api/v1/reviews', reviewRouter); 
//It means use bookingRouter middleware for 'api/v1/booking' url
app.use('/api/v1/bookings', bookingRouter);

/*Agar ab program yahan tak aaya hai to iska matlab upar koi bhi handler 
excute nhi hua hai(as agar hua hota to wo req-res cycle end kar deta)
*/
//For handling un-defined routers
//.all() -> all http method, * -> all url
app.all('*', (req, res, next) => {
    // res.status(404).json({
    //     status: 'fail',
    //     message: `Could not find ${req.url}`
    // });

    // const err = new Error(`Could not find ${req.url}`)  //making an error
    // err.status = 'fail';
    // err.statusCode = 404;

    /*agar hum kisi bhi middleware ke next mein arg pass kareing to wo use err hi maanta hai
    and directly error wale middleware ke paas chala jaata hai beech ke saare middleware ko skip
    karte hue
    */
   next(new AppError(`Path Not Found!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;