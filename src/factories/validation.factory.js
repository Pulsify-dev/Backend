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

//Playlist Validation
const playlistValidationSchemas = {
  createPlaylist: validate(
    Joi.object({
      title: Joi.string().min(1).max(100).required().messages({
        "string.empty": "Title cannot be empty",
        "string.max": "Title cannot exceed 100 characters",
      }),
      description: Joi.string().max(500).optional().messages({
        "string.max": "Description cannot exceed 500 characters",
      }),
      is_private: Joi.boolean().optional(),
    })
  ),

  updatePlaylist: validate(
    Joi.object({
      title: Joi.string().min(1).max(100).optional(),
      description: Joi.string().max(500).optional(),
      cover_url: Joi.string().uri().optional(),
    })
  ),

  addTrack: validate(
    Joi.object({
      track_id: Joi.string().required().messages({
        "any.required": "track_id is required",
      }),
      position: Joi.number().integer().min(0).optional(),
    })
  ),

  reorderTracks: validate(
    Joi.object({
      track_order: Joi.array()
        .items(Joi.string().required())
        .required()
        .messages({
          "any.required": "track_order is required",
          "array.base": "track_order must be an array",
        }),
    })
  ),

  moveTrack: validate(
    Joi.object({
      new_position: Joi.number().integer().min(0).required().messages({
        "any.required": "new_position is required",
        "number.base": "new_position must be a number",
      }),
    })
  ),

  updatePrivacy: validate(
    Joi.object({
      is_private: Joi.boolean().required().messages({
        "any.required": "is_private is required",
        "boolean.base": "is_private must be a boolean",
      }),
    })
  ),
};

export const validatePlaylist = playlistValidationSchemas;

export default validate;

