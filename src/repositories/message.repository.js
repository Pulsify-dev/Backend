import Message from "../models/message.model.js";

const findById = function (id, extraFields = "") {
	return Message.findById(id).select(extraFields);
};

const createMessage = function (messageData) {
	return Message.create(messageData);
};

const getChatHistory = function (conversationId, page = 1, limit = 20) {
	const skip = (page - 1) * limit;
	return Message.find({ conversation_id: conversationId })
		.sort({ createdAt: 1 })
		.skip(skip)
		.limit(limit)
		.lean();
};

const countInChat = function (conversationId) {
	return Message.countDocuments({ conversation_id: conversationId });
};

const markChatAsRead = function (conversationId, userId, readAt) {
	return Message.updateMany(
		{
			conversation_id: conversationId,
			sender_id: { $ne: userId },
			is_read: false,
		},
		{
			$set: {
				is_read: true,
				read_at: readAt,
			},
		},
	);
};

const countUnreadInChat = function (conversationId, userId) {
	return Message.countDocuments({
		conversation_id: conversationId,
		sender_id: { $ne: userId },
		is_read: false,
	});
};

const countUnreadChats = async function (conversationIds, userId) {
	const distinctIds = await Message.distinct("conversation_id", {
		conversation_id: { $in: conversationIds },
		sender_id: { $ne: userId },
		is_read: false,
	});
	return distinctIds.length;
};

export default {
	findById,
	createMessage,
	getChatHistory,
	countInChat,
	markChatAsRead,
	countUnreadInChat,
	countUnreadChats,
};
