const express = require('express');
const authController = require('../controller/authController');

const userController = require('../controller/userController');
const router = express.Router();

//To signup
router.post('/signup', authController.signup);
//To login
router.post('/login', authController.login);
//Logout route
router.get('/logout', authController.logOut);
//Forgot Password
router.post('/forgotPassword', authController.forgotPassword);
//Reset Password
router.patch('/resetPassword/:token', authController.resetPassword);

//Only the logged in admin will be able to perform the actions listed below this middleware
router.use(authController.protect);

//To update current user password
router.patch('/updateMyPassword', authController.updatePassword);
//To update current user data
router.patch('/updateMe', userController.uploadUserPhoto, userController.resizeUserPhoto, userController.updateMe);
//To delete user
router.delete('/deleteMe', userController.deleteMe);

router.route('/me')
    .get(userController.getMe, userController.getUser);

router.route('/')
    .get(userController.getAllUsers)
    .post(userController.createUser)

router.route('/:id')
    .get(userController.getUser)
    .patch(userController.updateUser)
    .delete(userController.deleteUser)

module.exports = router;