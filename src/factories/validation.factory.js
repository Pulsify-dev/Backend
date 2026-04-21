import Joi from "joi";

/**
 * Generic validation middleware factory
 * @param {Joi.Schema} schema - Joi schema to validate against
 * @param {string} source - Where to get data from: 'body', 'params', or 'query'
 * @returns {Function} Express middleware function
 */
const validate = (schema, source = "body") => {
  return (req, res, next) => {
    const dataToValidate = req[source] ?? {};

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false, // Collect all errors, not just first
      stripUnknown: true, // Remove fields not in schema (security!)
    });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(", ");
      return res.status(400).json({ error: errorMessage });
    }

    // Replace with validated/cleaned data
    if (source === "query") {
      Object.assign(req.query, value);
    } else {
      req[source] = value;
    }
    next();
  };
};

export default validate;

