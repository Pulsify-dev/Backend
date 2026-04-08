import { AppError, NotFoundError } from "../utils/errors.utils.js";

const errorHandler = (err, req, res, next) => {
  // Default to 500 internal server error
  let statusCode = 500;
  let message = "Internal Server Error";

  // 1. ARCHITECT FIX: Check if it's a custom AppError OR has a statusCode manually attached
  if (err instanceof AppError || err.statusCode) {
    statusCode = err.statusCode || 500;
    message = err.message || "An unexpected error occurred.";
  }

  // 2. Check if it's a Mongoose ValidationError
  else if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((el) => el.message)
      .join(", ");
  }

  // 3. Check if it's a MongoDB duplicate key error
  else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    // const value = err.keyValue[field]; // (Optional: can use value in message if needed)
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
  }

  // 4. Check if it's a Mongoose CastError or MulterError
  else if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path} format: ${err.value}`;
  } else if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      statusCode = 413;
      message = "File exceeds the allowed size limit.";
    } else {
      statusCode = 400;
      message = err.message;
    }
  }

  // 6. Send response
  const errorResponse = {
    error: message,
    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
      name: err.name,
      statusCode: statusCode,
    }),
  };
  res.status(statusCode).json(errorResponse);
};

const notFound = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

export default { errorHandler, notFound };
