class APIFeatures {
  // query = MongoDB query object
  // queryString = request query string
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    // Create deep copy of the request query
    let queryObj = { ...this.queryString };
    // Specify fields to exclude
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    // Exclude fields from query
    excludedFields.forEach((el) => delete queryObj[el]);

    // Filter with comparison
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    // Get Query object based on the query fields
    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  limitFields() {
    // Limit returned fields
    if (this.queryString.fields) {
      // convert the query fields from comma to space
      const fields = this.queryString.fields.split(',').join(' ');
      // select the query fields
      this.query = this.query.select(fields);
    } else {
      // exclude the __v field
      this.query = this.query.select('-__v');
    }
    return this;
  }

  paginate() {
    // Pagination
    // Find page with default of 1 (convert to int)
    const page = this.queryString.page * 1 || 1;
    // Find limit with default of 100 (convert to int)
    const limit = this.queryString.limit * 1 || 100;
    // Calculate number of documents to skip
    const skip = (page - 1) * limit;
    // Skip and limit query
    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}

module.exports = APIFeatures;
