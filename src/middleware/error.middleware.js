import { AppError, NotFoundError } from '../utils/errors.js';

const errorHandler = (err, req, res, next) => {
  // Default to 500 internal server error
  let statusCode = 500;
  let message = 'Internal Server Error';
  
  // 1. Check if it's your custom AppError
  if (err instanceof AppError) {
    // TODO: Use err.statusCode and err.message
    statusCode = err.statusCode;
    message = err.message;
  }
  
  // 2. Check if it's a Mongoose ValidationError
  else if (err.name === 'ValidationError') {
    // TODO: Set statusCode to 400
    statusCode = 400;
    // TODO: Extract validation message from err.errors
    message = Object.values(err.errors).map(el => el.message).join(', ');
  }
  
  // 3. Check if it's a MongoDB duplicate key error
  else if (err.code === 11000) {
    // TODO: Set statusCode to 409
    statusCode = 409;
    // TODO: Create message like "Email already exists"
    // Hint: err.keyValue contains the duplicate field
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
  }
  
  // 4. Check if it's a Mongoose CastError
  else if (err.name === 'CastError') {
    // TODO: Set statusCode to 400
    statusCode = 400;
    // TODO: Message like "Invalid ID format"
    message = `Invalid ${err.path} format: ${err.value}`;
    // Example: "Invalid _id format: abc123"
  }
  
  // 5. Log the error (in development)
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  }
  
  // 6. Send response
  const errorResponse = {
    error: message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      name: err.name,  // ← Add this
      statusCode: statusCode  // ← And this
    })
  };
  res.status(statusCode).json(errorResponse);
};

// 404 handler for routes that don't exist
const notFound = (req, res, next) => {
  // TODO: Create error for route not found
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
  // Hint: Use the NotFoundError class
};

export default { errorHandler, notFound };