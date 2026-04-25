import Conversation from "../models/conversation.model.js";

const findById = function (id, extraFields = "") {
  return Conversation.findById(id).select(extraFields).lean();
};

const createConversation = function (conversationData) {
  return Conversation.create(conversationData);
};

const getByPairId = function (participantPairId, extraFields = "") {
  return Conversation.findOne({ participant_pair_id: participantPairId }).select(
    extraFields,
  ).lean();
};

const getUserInbox = function (userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  return Conversation.find({ participants: userId })
    .populate({
      path: "participants",
      select: "username display_name avatar_url is_verified",
    })
    .sort({ last_message_at: -1, updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

const countUserChats = function (userId) {
  return Conversation.countDocuments({ participants: userId });
};

const getUserChatIds = function (userId) {
  return Conversation.find({ participants: userId }).select("_id").lean();
};

const updateById = function (id, updatedPatch) {
  return Conversation.findByIdAndUpdate(id, updatedPatch, {
    returnDocument: "after",
    runValidators: true,
  });
};

const getConvoIfParticipant = function (
  conversationId,
  userId,
  extraFields = "",
) {
  return Conversation.findOne({
    _id: conversationId,
    participants: userId,
  }).select(extraFields).lean();
};

export default {
  findById,
  createConversation,
  getByPairId,
  getUserInbox,
  countUserChats,
  getUserChatIds,
  updateById,
  getConvoIfParticipant,
};
