class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }
  filter() {
    /* ######################### 1A) Filtering ######################## */

    /* Here we use spread operator to construct object. Basically we take all properties & methods from req.query and construct a brand new object based on these. Because if we create new variable object, it will simply serve as reference to the original object. But we want a new object here for us to query the filtered result. */
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    /* We loop each field and delete that field detail from queryObj object. The syntax "delete" is JS operation.
    Refer here: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/delete */
    excludedFields.forEach((el) => delete queryObj[el]);

    /* Student proposed this solution without needing to loop. */
    // const { page, sort, limit, fields, ...queryObj } = req.query;

    /* #################### 1B) Advanced filtering #################### */

    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte)\b/g, (match) => `$${match}`);

    /* Why can't we directly specify the [$gte] in the url?
    Yes that will work just fine too, but it's not common to see it this way. That's why I(Jonas) showed the more common way of doing it, which gives us some additional work to set it up in the code, but what matters is the better user experience.*/

    /* ###################### 2) Get query object ##################### */

    // Method 1
    /* When you call Tour.find(queryObj) without await, this only returns a Query object, but it does not execute the query itself.
    This is the reason why we can attach different mongoose methods like .where().equals() after that first .find() call. If it would execute the query right away, we could then not sort it or not filter it.
    So, again, the query is actually only executed once we await it. */
    this.query = this.query.find(JSON.parse(queryStr));

    // Method 2
    // We can continue use method like .where because find() will return a document which has prototype methods. Other than equals, we can use lt, lte, gt, gte etc
    // const query = await Tour.find().where('duration').equals(5).where('difficulty').equals('easy');

    return this; //Return entire object
  }
  sort() {
    /* ############################ 3) Sort ########################### */

    if (this.queryString.sort) {
      /* req.query.sort represent the property we specify in URL like domain.com/?sort=-price,ratingsAverage denotes price,ratingsAverage and is a string type.
      If the first sort has conflict, it will continue solve by second. */
      // Here to modify them into '-price ratingsAverage'.
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
      // This format is accepted: query.sort('-price ratingsAverage')
    } else {
      // In case user doesn't specify the sort field, we do a default one.
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }
  limitFields() {
    /* ####################### 4) Field limiting ###################### */

    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      // In case we want to prevent user accessing our price
      // if (fields.includes('price')) throw new Error('Accessing price is prohibited');
      // Remember we cannot mix params with - and with no - like this: ?fields=-name,-duration,difficulty,price
      this.query = this.query.select(fields);
    } else {
      // In select() method, we are including fields. When we put - to the params, we are excluding it.
      this.query = this.query.select('-__v');
    }
    return this;
  }
  paginate() {
    /* ######################### 5) Pagination ######################## */

    /* Because it'll always be string for number in URL so we have to convert to number type by multiple to 1.
    If page is not available, we use value 1 */
    const page = this.queryString.page * 1 || 1;
    /* We set default limit to 100 because not every time user will set limit value. */
    const limit = this.queryString.limit * 1 || 100;
    /* Formula to calculate skip number. Eg. if is page 3, then (3-1)*100 = 200, we will skip 200 result and start search for the 201th result. We then get result between 201 to 300 at page 3. */
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);

    // I don't understand why Jonas comment out code below while we can just add async to this function. I tried but it cause an error.
    // if (queryString.page) {
    //   const numTours = await Tour.countDocuments(this.query);
    // // If after all the filtering & fields limiting and we get zero result, throw error and end process.
    //   if (numTours === 0) throw new Error('This page does not exist');
    // }
    return this;
  }
}

module.exports = APIFeatures;
