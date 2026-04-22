import Joi from "joi";
import validate from "../factories/validation.factory.js";

const createPlaylistSchema = Joi.object({
  title: Joi.string().min(1).max(100).required().messages({
    "string.empty": "Title cannot be empty",
    "string.max": "Title cannot exceed 100 characters",
  }),
  description: Joi.string().max(500).optional().messages({
    "string.max": "Description cannot exceed 500 characters",
  }),
  is_private: Joi.boolean().optional(),
});

const updatePlaylistSchema = Joi.object({
  title: Joi.string().min(1).max(100).optional(),
  description: Joi.string().max(500).optional(),
  cover_url: Joi.string().uri().optional(),
});

const addTrackSchema = Joi.object({
  track_id: Joi.string().required().messages({
    "any.required": "track_id is required",
  }),
  position: Joi.number().integer().min(0).optional(),
});

const reorderTracksSchema = Joi.object({
  track_order: Joi.array()
    .items(Joi.string().required())
    .required()
    .messages({
      "any.required": "track_order is required",
      "array.base": "track_order must be an array",
    }),
});

const moveTrackSchema = Joi.object({
  new_position: Joi.number().integer().min(0).required().messages({
    "any.required": "new_position is required",
    "number.base": "new_position must be a number",
  }),
});

const updatePrivacySchema = Joi.object({
  is_private: Joi.boolean().required().messages({
    "any.required": "is_private is required",
    "boolean.base": "is_private must be a boolean",
  }),
});

export default {
  validateCreatePlaylist: validate(createPlaylistSchema, "body"),
  validateUpdatePlaylist: validate(updatePlaylistSchema, "body"),
  validateAddTrack: validate(addTrackSchema, "body"),
  validateReorderTracks: validate(reorderTracksSchema, "body"),
  validateMoveTrack: validate(moveTrackSchema, "body"),
  validateUpdatePrivacy: validate(updatePrivacySchema, "body"),
};
