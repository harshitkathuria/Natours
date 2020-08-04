const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handleFactory');
const Booking = require('../models/bookingModel');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  //1) Get the currently booked tour
  const tour = await Tour.findById(req.params.tourId)

  //2) Create checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    success_url: `${req.protocol}://${req.get('host')}/?tour=${req.params.tourId}&price=${tour.price}&user=${req.user.id}`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    line_items: [
      {
        name: `${tour.name} Tour`,
        description: tour.summary,
        images: [`https://www.natours.dev/img/tours/${tour.imageCover}`],
        amount: tour.price * 100,
        currency: 'usd',
        quantity: 1
      }
    ]
  })

  //3) Create session as response
  res.status(200).json({
    status: 'success',
    session
  })
});

//Get tours of the currently logged in user
exports.getMyTours = catchAsync(async (req, res, next) => {
  //1) Find all the bookings of the currently logged in user
  const bookings = await Booking.find({ user: req.user.id });

  //2) Find tours with the bookings
  const tourIds = bookings.map(el => el.tour);
  //$in -- find all the tours with id in tourIds
  const tours = await Tour.find({ _id: { $in: tourIds }});

  res.status(200).render('overview', {
    title: 'My Tours',
    tours
  });
});

//Redirects the page to the home url after removing the query string from the url
exports.createBookingCheckOut = async (req, res, next) => {

  // console.log('in createBookingCheckout');

  const { tour, user, price } = req.query;

  if(!tour || !user || !price)
    return next();

  await Booking.create({ tour, user, price });

  res.redirect(req.originalUrl.split('?')[0]);
}

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);