class APIFeatures {
    constructor(query, queryString) {
        this.query = query;
        this.queryString = queryString;
    }

    //To filter query
    filter() {
        //Build  query
        //1A) Filtering
        const queryObj = {...this.queryString};
        const excludeQuery = ['page', 'sort', 'limit', 'fields'];

        excludeQuery.forEach(el => delete queryObj[el]);

        //1B) Advanced Filtering
        let queryStr = JSON.stringify(queryObj);
        queryStr = queryStr.replace(/\b(gte|lte|gt|lt)\b/g, (match => `$${match}`));
        // console.log(JSON.parse(queryStr));

        //Returns a promise
        //Gives us tour queries tours in a nice json format
        this.query = this.query.find(JSON.parse(queryStr));

        return this;    //to return this current object, so that we can chain multiple functions on it
    }

    //For sorting query
    sort() {
        if(this.queryString.sort) {    //agar sort=x ki query ki hai to
            // query = query.sort(req.query.sort)  //sort by x
            // query = query.sort('-price duration');  //sort by descending order of price if equal then by duration 

            const sortBy = this.queryString.sort.split(',').join(' ') //sort queries ko space se separate kar do as url mein space to use nhi kar sakte
                                                            // to comma se separate kiya 
            this.query = this.query.sort(sortBy);
        }
        else {
            this.query = this.query.sort('-createdAt');   //warna decreasing order of createdAt se sort kar do
        }

        return this;
    }

    //Limiting fields (selecting what to show)
    limitingFields() {
        if(this.queryString.fields) {
            const fields = this.queryString.fields.split(',').join(' ');
            this.query = this.query.select(fields);   //Shows only the selected fields
            // this.query = this.query.select('price duration')
        }
        else {
            this.query = this.query.select('-__v');   //Does not show __v as -sign is used
        }

        return this;
    }

    //Pagination
    paginate() {
        const page = this.queryString.page * 1 || 1;
        const limit = this.queryString.limit * 1 || 100;
        const skip = (page - 1) * limit;
        // console.log(this.queryString.limit, limit);

        //page=3&limit=10 --> 1-10 in page in 1, 11-20 in page 2, 21-30 in page 3....
        // query.skip(20).limit(10)  // Skip 20 objects (or start showing from 21st obj) with limit(per page) of 10
        this.query = this.query.skip(skip).limit(limit);  

        //If page nuber exceeds total documents
        // if(this.queryString.page) {
        //     const numTours = await Tour.countDocuments();
        //     if(skip >= numTours) {
        //         throw new Error('This page does not exceed')
        //     }
        // }

        return this;
    }
}

module.exports = APIFeatures;