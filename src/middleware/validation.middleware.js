import Joi from "joi";

// 1. Update profile schema
const updateProfileSchema = Joi.object({
  display_name: Joi.string().min(1).max(50).optional(),
  bio: Joi.string().max(500).optional(),
  location: Joi.string().max(100).optional(),
  favorite_genres: Joi.array().items(Joi.string()).optional(),
  social_links: Joi.object({
    instagram: Joi.string().allow("").optional(),
    twitter: Joi.string().allow("").optional(),
    website: Joi.string().allow("").optional(),
  }).optional(),
  is_private: Joi.boolean().optional(),
});

// 2. MongoDB ObjectId validation for URL params
const mongoIdSchema = Joi.object({
  user_id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid user ID format",
    }),
});

// 3. Delete account validation
const deleteAccountSchema = Joi.object({
  password: Joi.string().min(8).required().messages({
    "string.min": "Password must be at least 8 characters",
    "any.required": "Password is required",
  }),
});

// 4. Email change validation
const emailChangeSchema = Joi.object({
  new_email: Joi.string().email().required().messages({
    "string.email": "Invalid email format",
    "any.required": "New email is required",
  }),
  current_password: Joi.string().min(8).required().messages({
    "string.min": "Password must be at least 8 characters",
    "any.required": "Current password is required",
  }),
});

// 5. Token query validation
const tokenQuerySchema = Joi.object({
  token: Joi.string().required().messages({
    "any.required": "Token is required",
  }),
});

// 6. Search/pagination query validation
const searchQuerySchema = Joi.object({
  q: Joi.string().optional().allow(""),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
});

const conversationParamSchema = Joi.object({
  conversation_id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid conversation ID format",
    }),
});

const startConversationSchema = Joi.object({
  recipient_id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid recipient ID format",
      "any.required": "recipient_id is required",
    }),
});

const sendMessageSchema = Joi.object({
  text: Joi.string().max(2000).optional(),
  shared_entity: Joi.object({
    type: Joi.string().valid("Track", "Playlist").required(),
    id: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        "string.pattern.base": "Invalid shared entity ID format",
      }),
  }).optional(),
}).custom((value, helpers) => {
  const hasText = typeof value.text === "string" && value.text.trim().length > 0;
  const hasSharedEntity = !!value.shared_entity;
  if (!hasText && !hasSharedEntity) {
    return helpers.error("any.invalid", {
      message: "Message must contain text or shared_entity",
    });
  }
  return value;
}).messages({
  "any.invalid": "Message must contain text or shared_entity",
});

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
const changePasswordSchema = Joi.object({
  old_password: Joi.string().required(),
  new_password: Joi.string().min(8).required(),
});
export default {
  validateUpdateProfile: validate(updateProfileSchema, "body"),
  validateMongoId: validate(mongoIdSchema, "params"),
  validateDeleteAccount: validate(deleteAccountSchema, "body"),
  validateEmailChange: validate(emailChangeSchema, "body"),
  validateTokenQuery: validate(tokenQuerySchema, "query"),
  validateSearchQuery: validate(searchQuerySchema, "query"),
  validateChangePassword: validate(changePasswordSchema, "body"),
  validateConversationParam: validate(conversationParamSchema, "params"),
  validateStartConversation: validate(startConversationSchema, "body"),
  validateSendMessage: validate(sendMessageSchema, "body"),
};
