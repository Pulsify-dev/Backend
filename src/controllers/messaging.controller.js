import messagingService from "../services/messaging.service.js";

const getMyConversations = async (req, res, next) => {
	try {
		const userId = req.user.user_id;
		const page = parseInt(req.query.page, 10) || 1;
		const limit = parseInt(req.query.limit, 10) || 20;

		if (page < 1 || limit < 1 || limit > 100) {
			return res.status(400).json({
				success: false,
				message: "Invalid page or limit parameters",
			});
		}

		const result = await messagingService.getMyConversations(userId, page, limit);

		return res.status(200).json({
			success: true,
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

const startOrGetConversation = async (req, res, next) => {
	try {
		const senderId = req.user.user_id;
		const { recipient_id: recipientId } = req.body;

		const { conversation, created } =
			await messagingService.startOrGetConversation(senderId, recipientId);

		return res.status(created ? 201 : 200).json({
			success: true,
			data: conversation,
		});
	} catch (error) {
		next(error);
	}
};

const getUnreadCount = async (req, res, next) => {
	try {
		const userId = req.user.user_id;
		const result = await messagingService.getTotalUnreadCount(userId);

		return res.status(200).json({
			success: true,
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

const markConversationRead = async (req, res, next) => {
	try {
		const userId = req.user.user_id;
		const { conversation_id: conversationId } = req.params;

		const result = await messagingService.markConversationRead(
			conversationId,
			userId,
		);

		return res.status(200).json({
			success: true,
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

const getMessages = async (req, res, next) => {
	try {
		const userId = req.user.user_id;
		const { conversation_id: conversationId } = req.params;
		const page = parseInt(req.query.page, 10) || 1;
		const limit = parseInt(req.query.limit, 10) || 20;

		const result = await messagingService.getMessages(
			conversationId,
			userId,
			page,
			limit,
		);

		return res.status(200).json({
			success: true,
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

const sendMessage = async (req, res, next) => {
	try {
		const userId = req.user.user_id;
		const { conversation_id: conversationId } = req.params;
		const { text, shared_entity: sharedEntity } = req.body;

		const result = await messagingService.sendMessage({
			senderId: userId,
			conversationId,
			text,
			sharedEntity,
		});

		return res.status(201).json({
			success: true,
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export default {
	getMyConversations,
	startOrGetConversation,
	getUnreadCount,
	markConversationRead,
	getMessages,
	sendMessage,
};
