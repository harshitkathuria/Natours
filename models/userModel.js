const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

//name, email, photo, password, passwordConfirm
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please tell us your name']
    },
    email: {
        type: String,
        required: [true, 'Please provide your name'],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, 'Please provide a valid email']
    },
    role: {
       type: String,
       default: 'user',
       enum: ['user', 'guide', 'lead-guide', 'admin'],
    },
    photo: {
        type: String,
        default: 'default.jpg'
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 8,
        select: false   //do not show the password by default
    },
    passwordConfirm: {
        type: String,
        required: [true, 'Please confirm your password'],
        validate: {
            //Only works on SAVE and CREATE
            validator: function(val) {
                return val === this.password;
            },
            message: 'Passwords do not match'
        }
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
        type: Boolean,
        default: true,
        select: false
    }
});

//To encrypt out data
//Before saving of our document
userSchema.pre('save', async function(next) {
    //If the password was not modified then return
    if(!this.isModified('password'))
        return next();

    //Hash the pa ssword this cost of 12 (CPU intensive)
    this.password = await bcrypt.hash(this.password, 12);

    //Delete passwordConfrim field
    this.passwordConfirm = undefined;

    next();
});

//To change the passwordChangedAt property
userSchema.pre('save', function(next) {
    if(!this.isModified('password') || this.isNew) 
        return next();

    //To avoid time gap between changing of its time and issuing of jwt
    this.passwordChangedAt = Date.now() - 1000;
    next();
})

//Query Middleware
userSchema.pre(/^find/, function(next) {
    //Select those which have active as not equal to false, equal to true will not work as their default value is true not actual value
    
    //this point to current query
    this.find({ active: {$ne: false}});
    next();
})

//Instance method --> Accessible by all instance of User
//Returns true if candidate password and original password is correct
userSchema.methods.correctPassword = async function(candidatePassword, password) {
    //Compares candidate password and password
    return await bcrypt.compare(candidatePassword, password);
}

//Function to check whether the jwt token is issued before the passwordChangeAt
userSchema.methods.changedPasswordAfter = function(JWTTimeStamp) {
    //If changedPasswordAt field actually exist
    if(this.passwordChangedAt) {
        //To convert passwordChangedAt to millisecond
        const changedTimeStamp = this.passwordChangedAt.getTime() / 1000;
        // console.log(changedTimeStamp, JWTTimeStamp);
        return JWTTimeStamp < changedTimeStamp;
    }
    return false;
}

//Creates a random passwordDelete Token
userSchema.methods.createPasswordResetToken = function() {
    //Create a random 32 size hexadecimal string
    const resetToken = crypto.randomBytes(32).toString('hex');

    //encrypt this string using crypto
    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    //Set expiration time of token as 10 min 
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

    //Return the reset token
    return resetToken;
}

const User = mongoose.model('User', userSchema);

module.exports = User;