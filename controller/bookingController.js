const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handleFactory');
const Booking = require('../models/bookingModel');
const User = require('../models/userModel');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  //1) Get the currently booked tour
  const tour = await Tour.findById(req.params.tourId)

  //2) Create checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    // success_url: `${req.protocol}://${req.get('host')}/?tour=${req.params.tourId}&price=${tour.price}&user=${req.user.id}`,
    success_url: `${req.protocol}://${req.get('host')}/my-tours/?alert=booking`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    line_items: [
      {
        name: `${tour.name} Tour`,
        description: tour.summary,
        images: [`${req.protocol}://${req.get('host')}/img/tours/${tour.imageCover}`],
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
// exports.createBookingCheckOut = async (req, res, next) => {
  //UNSECURE
//   // console.log('in createBookingCheckout');

//   const { tour, user, price } = req.query;

//   if(!tour || !user || !price)
//     return next();

//   await Booking.create({ tour, user, price });

//   res.redirect(req.originalUrl.split('?')[0]);
// }

const createBookingCheckout = async session => {
  const tour = session.client_reference_id;
  const user = (await User.findOne({ email: session.customer_email })).id;
  const price = session.display_items[0].amount / 100;
  console.log('TOUR: '+ tour , "USER: " + user, "PRICE" + price);
  await Booking.create({ tour, user, price })
}

exports.webhookCheckout = (req, res, next) => {
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  }
  catch(err) {
    return res.status(400).send(`Webhook Error...${err.message}`);
  }
  
  if(event.type === 'checkout.session.completed')
    createBookingCheckout(event.data.object);

  res.status(200).json({
    recieved: 'true'
  })

}

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);