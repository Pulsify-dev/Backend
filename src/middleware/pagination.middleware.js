import { BadRequestError } from "../utils/errors.utils.js";


const paginate = (req, res, next) => {
  // 1. Extract and parse (use || for defaults)
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;  // Pre-calculate for convenience

  // 2. Validate
  if (page < 1 || isNaN(page)) {
    throw new BadRequestError("Invalid page number.");
  }
  if (limit < 1 || isNaN(limit)) {
    throw new BadRequestError("Invalid limit.");
  }
  if (limit > 100) {
    throw new BadRequestError("Limit cannot exceed 100.");
  }

  // 3. Attach to req.pagination = { page, limit, skip }
  req.pagination = { page, limit, skip };

  // 4. Call next()
    next();
};

export default {
    paginate
};

