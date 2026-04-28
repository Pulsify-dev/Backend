import Joi from "joi";
import validate from "../factories/validation.factory.js";

const conversationParamSchema = Joi.object({
  conversation_id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid conversation ID format",
    }),
});

const startConversationSchema = Joi.object({
  username: Joi.string()
    .min(6)
    .max(20)
    .pattern(/^[a-zA-Z0-9_]+$/)
    .required()
    .messages({
      "string.pattern.base": "Usernames can only contain letters, numbers, and underscores",
      "string.min": "Username must be at least 6 characters",
      "string.max": "Username cannot exceed 20 characters",
      "any.required": "username is required",
    }),
});

const sendMessageSchema = Joi.object({
  text: Joi.string().max(2000).optional(),
  shared_entity: Joi.object({
    type: Joi.string().valid("Track", "Playlist", "Album").required(),
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

export default {
  validateConversationParam: validate(conversationParamSchema, "params"),
  validateStartConversation: validate(startConversationSchema, "body"),
  validateSendMessage: validate(sendMessageSchema, "body"),
};
