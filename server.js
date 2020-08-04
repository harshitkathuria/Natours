const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException', err => { 
    console.log(err.name, err.message);
    process.exit(1);
})

//Connecting our env variables to our project
dotenv.config({path: './config.env'});
const app = require('./app');

// console.log(app.get('env'));
// console.log(process.env);

const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);

//Returns a promise
//Connnecting mongoose with our database
mongoose.connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false
})  
.then(con => {
    console.log('Connection to db estabilished');
})

//Start server
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
    console.log(`Listening from port ${port}`);
});

//For handeling unhandled promise rejection
process.on('unhandledRejection', err => {
    console.log(err.name, err.message);
    console.log('Unhandled Rejection!!! Shutting down...');
    server.close(() => {
        process.exit(1);
    });
})