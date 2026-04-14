import Playlist from "../models/playlist.model.js";

const findByPermalinkAndCreator = function (permalink, creatorId, extraFields = "") {
  return Playlist.findOne({ permalink, creator_id: creatorId }).select(extraFields);
};

export default {
  findByPermalinkAndCreator,
};
