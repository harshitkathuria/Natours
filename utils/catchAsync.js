module.exports = fn => {
    return (req, res, next) => {
        // console.log(req.originalUrl);
        fn(req, res, next).catch(err => next(err));
    }
}