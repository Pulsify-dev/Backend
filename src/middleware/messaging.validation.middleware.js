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

export default {
  validateConversationParam: validate(conversationParamSchema, "params"),
  validateStartConversation: validate(startConversationSchema, "body"),
  validateSendMessage: validate(sendMessageSchema, "body"),
};
