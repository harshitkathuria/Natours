const multer = require('multer');
const sharp = require('sharp');
const Tour = require('../models/tourModel');
const APIFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handleFactory');

//Multer Storage

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

//to upload single image
// upload.single('image');
//to uplaod multiple images for same name 
// upload.array('image', 3);

//to upload both single and multiple images
exports.uploadTourImages = upload.fields([
    { name: 'imageCover', max: 1 },
    { name: 'images', max: 3}
])

exports.resizeTourImages = catchAsync(async (req, res, next) => {
    console.log(req.files);
    if(!req.files.imageCover || !req.files.images)
        return next();

    //1) imageCover
    req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
    await sharp(req.files.imageCover[0].buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${req.body.imageCover}`);

    //2) Images
    req.body.images = [];
    await Promise.all(req.files.images.map(async (el, idx) => {
        const filename = `tour-${req.params.id}-${Date.now()}-${idx + 1}.jpeg`;
        await sharp(el.buffer)
            .resize(2000, 1333)
            .toFormat('jpeg')
            .jpeg({ quality: 90 })
            .toFile(`public/img/tours/${filename}`);

        req.body.images.push(filename);
    }));

    next();
});

// const tours = JSON.parse(fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`));

//Check if our id is valid
// exports.checkId = (req, res, next, val) => {
//     console.log(val);
//     if(Number(req.params.id) > tours.length) {
//         return res.status(404).json({
//             status: "fail",
//             message: "Invalid ID"
//         });
//     }
//     next();
// }

//Check if body is valid
// exports.checkBody = (req, res, next) => {
//     if(req.body.name == undefined || req.body.price == undefined) {
//         return res.status(400).json({
//             status: "fail",
//             message: "Invalid parameters"
//         });
//     }
//     next();
// }

//Get top-5-rated tour
exports.aliasTopTours = (req, res, next) => {
    req.query.limit = '5';
    req.query.sort = '-ratingsAverage,price'
    req.query.fields = 'name,price,ratingsAverage,difficulty';
    next();
}

//Get all tours
// exports.getAllTours = catchAsync(async (req, res, next) => {

//     console.log(req.query);

//     //Api features
//     const features = new APIFeatures(Tour.find(), req.query).filter().sort().limitingFields().paginate();

//     //Execute query
//     const tours = await features.query;

//     // const tours = await Tour.find()  //Same as above (MongoDB query)
//     //     .where('duration')
//     //     .equals(5)
//     //     .where('difficulty')
//     //     .equals('easy')

//     //Send response
//     res.status(200).json({
//         status: 'success',
//         results: tours.length,
//         data: {
//             tours
//         }
//     }) 
// })

//Get tour by id
// exports.getTour = catchAsync(async (req, res, next) => {
//     //To populate guides (referencing)
//     // const tour = await Tour.findById(req.params.id).populate('guides');
//     const tour = await Tour.findById(req.params.id).populate('reviews');
//     // const tour = Tour.findOne({_id: req.params.id})  //Same as above

//     if(!tour) {
//         return next(new AppError(`Could not find the document with id ${req.params.id}`, 404))
//     }

//     res.status(200).json({
//         status: "success",
//         data: {
//             tour
//         }
//     })
// })

//Get all tours
exports.getAllTours = factory.getAll(Tour);

//Get tour by Id
exports.getTour = factory.getOne(Tour, 'reviews')

//Create tour
exports.createTour = factory.createOne(Tour);

//Update tour
exports.updateTour = factory.updateOne(Tour);

//Delete tour
exports.deleteTour = factory.deleteOne(Tour);

//get tours within a radius across a center co-ordinates
// tours-within/200/center/34.111745,-118.113491/unit/mi
exports.getToursWithin = async (req, res, next) => {
    const { distance, latlng, unit } = req.params;
    const [ lat, lng ] = latlng.split(',');

    if(!lat || ! lng) {
        next(new AppError('Please provide latitude and longitude in the format lat,lng', 400));
    }

    //Radius in radians
    const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

    //Geospatial Query
    const tours = await Tour.find({
        //Add a index of startLocation
        startLocation: { 
            $geoWithin: { 
                $centerSphere: [[lng, lat], radius]  
                //First define longitude and then latitude and then longitude
                //radius in radians
            }
        }
    })
    
    res.status(200).json({
        status: 'success',
        results: tours.length,
        data: {
            data: tours
        }
    })
}

//Get tour distances from a point
exports.getTourDistances = async (req, res, next) => {
    const { latlng, unit } = req.params;
    const [ lat, lng ] = latlng.split(',');

    if(!lat || !lng) {
        next(new AppError('Please provide lattitude and longitude in the format lat,lng', 400));
	}
	
	//If unit is miles convert it into miles else in km
	const multiplier = unit === 'mi' ? 0.000621371 : 0.001

    const distances = await Tour.aggregate([
        {
			//geoNear always need to be the first stage int he aggregation pipeline
			//It requires the geospatial index, viz startLocation in our case
			//We have only one index so it will automatically use it otherwise we have to write it  
            $geoNear: {
				//All the distances will be calculated with this point
                near: { //GeoJson
                    type: 'Point',
                    coordinates: [lng * 1, lat * 1]
				},
				//Name of field which will store all the calculations (can be choosed by user)
				distanceField: 'distance',
				//Default distance is in metres
                distanceMultiplier: multiplier //Multiply distance with it
            }
		}, 
		{
			$project: {
				name: 1, 
				distance: 1
			} 
		}
    ])

    res.status(200).json({
        status: 'success',
        results: distances.length,
        data: {
            data: distances
        }
    })
}

//Agregation pipeline --> Each document will pass through certain stages and produce the output

//Caclulate statistics 
exports.getTourStats = catchAsync(async (req, res, next) => {
    const stats = await Tour.aggregate([
        //Pass through all these stages

        {
            $match: {ratingsAverage: {$gte: 4.5}}
        },
        {
            $group: {
                // _id: null,   //sab ko ek saath group karne ke liye
                _id: { $toUpper: '$difficulty' },  //based on difficulty
                results: { $sum: 1 },   //har document aayega and results mein 1 add kar dega
                avgRating: { $avg: '$ratingsAverage' },
                avgPrice: { $avg: '$price' },
                minPrice: { $min: '$price' },
                maxPrice: { $max: '$price' },
            }
        },
        {
            $sort: {minPrice: 1}    //1 for asc, -1 for desc
        }
        //We can match again also
        // {    
        //     $match: { difficulty: 'EASY' }
        // }
    ]);

    res.status(200).json({
        status: "success",
        data: {
            stats
        }
    })
})

//Get monthy plan 
exports.getMonthyPlan = catchAsync(async (req, res, next) => {
    const year = req.params.year;

    const plan = await Tour.aggregate([
        {
            $unwind: '$startDates'  //ek array ke items ko alag alag kar deta hai
                                    //it means ki agar x tour ke paas 3 start dates hai to
                                    //wo 3 items bana dega x tour ke with individual startDates 
        },
        {
            $match: {
                startDates: {
                    //in the specified year
                    $gte: new Date(`${year}-01-01`),
                    $lte: new Date(`${year}-12-31`)   
                }
            }
        },
        {
            $group: {
                _id: { $month: '$startDates' }, //by month of startDates
                numTourStarts: { $sum: 1 }, 
                tours: { $push: '$name' }   //$push -> to create an array of '$name' field
            }
        },
        {
            $addFields: { month: '$_id' }
        },
        {
            $project: { _id: 0 }    //to select which item to show....0 to hide
        }, 
        {
            $sort: { numTourStarts: -1}
        }

    ]);

    res.status(200).json({
        status: 'success',
        data: {
            plan 
        }
    })
});