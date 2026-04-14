import conversationRepository from "../repositories/conversation.repository.js";
import messageRepository from "../repositories/message.repository.js";
import userRepository from "../repositories/user.repository.js";
import blockRepository from "../repositories/block.repository.js";
import {
	BadRequestError,
	ForbiddenError,
	NotFoundError,
} from "../utils/errors.utils.js";

const buildParticipantPairId = (userAId, userBId) => {
	const participantIds = [userAId.toString(), userBId.toString()].sort();
	return participantIds.join("-");
};

const getMyConversations = async (userId, page = 1, limit = 20) => {
	const [conversations, total] = await Promise.all([
		conversationRepository.getUserInbox(userId, page, limit),
		conversationRepository.countUserChats(userId),
	]);

	const normalizedConversations = await Promise.all(
		conversations.map(async (conversation) => {
			const otherParticipant = (conversation.participants || []).find(
				(participant) => participant?._id?.toString() !== userId.toString(),
			);

			const unreadCount = await messageRepository.countUnreadInChat(
				conversation._id,
				userId,
			);

			return {
				...conversation,
				other_participant: otherParticipant || null,
				unread_count: unreadCount,
			};
		}),
	);

	return {
		conversations: normalizedConversations,
		total,
		page,
		limit,
	};
};

const assertConversationParticipant = async (conversationId, userId) => {
	const conversation = await conversationRepository.getConvoIfParticipant(
		conversationId,
		userId,
		"participants participant_pair_id last_message_at",
	);

	if (!conversation) {
		throw new ForbiddenError("Caller is not a conversation participant");
	}

	return conversation;
};

const startOrGetConversation = async (senderId, recipientId) => {
	if (senderId.toString() === recipientId.toString()) {
		throw new BadRequestError("Cannot create conversation with yourself");
	}

	const recipient = await userRepository.findById(recipientId);
	if (!recipient) {
		throw new NotFoundError("Recipient user not found");
	}

	const blockedByRecipient = await blockRepository.isBlocked(recipientId, senderId);
	if (blockedByRecipient) {
		throw new ForbiddenError("Recipient has blocked the caller");
	}

	const blockedBySender = await blockRepository.isBlocked(senderId, recipientId);
	if (blockedBySender) {
		throw new ForbiddenError("Cannot message a user you have blocked");
	}

	const participantPairId = buildParticipantPairId(senderId, recipientId);
	let conversation =
		await conversationRepository.getByPairId(participantPairId);

	if (conversation) {
		return { conversation, created: false };
	}

	conversation = await conversationRepository.createConversation({
		participants: [senderId, recipientId],
	});

	return { conversation, created: true };
};

const sendMessage = async ({
	senderId,
	conversationId,
	text,
	sharedEntity,
}) => {
	const conversation = await assertConversationParticipant(conversationId, senderId);

	const participantIds = (conversation.participants || []).map((participant) =>
		participant.toString(),
	);
	const recipientId =
		participantIds.find((participantId) => participantId !== senderId.toString()) ||
		null;

	if (recipientId) {
		const blockedByRecipient = await blockRepository.isBlocked(recipientId, senderId);
		if (blockedByRecipient) {
			throw new ForbiddenError("Recipient has blocked the caller");
		}

		const blockedBySender = await blockRepository.isBlocked(senderId, recipientId);
		if (blockedBySender) {
			throw new ForbiddenError("Cannot message a user you have blocked");
		}
	}

	const hasText = typeof text === "string" && text.trim().length > 0;
	const hasSharedEntity =
		sharedEntity && typeof sharedEntity === "object" && sharedEntity.type && sharedEntity.id;

	if (!hasText && !hasSharedEntity) {
		throw new BadRequestError("Message must contain text or shared_entity");
	}

	const messagePayload = {
		conversation_id: conversationId,
		sender_id: senderId,
	};

	if (hasText) {
		messagePayload.text = text.trim();
	}

	if (hasSharedEntity) {
		messagePayload.shared_entity = {
			type: sharedEntity.type,
			id: sharedEntity.id,
		};
	}

	const message = await messageRepository.createMessage(messagePayload);

	const updatedConversation = await conversationRepository.updateById(conversationId, {
		last_message_at: new Date(),
	});

	return {
		message,
		conversationId: conversationId.toString(),
		recipientId,
		lastMessageAt: updatedConversation?.last_message_at || new Date(),
	};
};

const markConversationRead = async (conversationId, userId) => {
	await assertConversationParticipant(conversationId, userId);

	const readAt = new Date();
	const updateResult = await messageRepository.markChatAsRead(
		conversationId,
		userId,
		readAt,
	);

	return {
		conversationId: conversationId.toString(),
		markedCount: updateResult.modifiedCount || 0,
		readAt,
	};
};

const getTotalUnreadCount = async (userId) => {
	const conversationRows = await conversationRepository.getUserChatIds(
		userId,
	);

	const conversationIds = conversationRows.map((conversation) => conversation._id);
	if (conversationIds.length === 0) {
		return { unread_count: 0 };
	}

	const unreadCount = await messageRepository.countUnreadChats(
		conversationIds,
		userId,
	);

	return { unread_count: unreadCount };
};

const getMessages = async (conversationId, userId, page = 1, limit = 20) => {
	await assertConversationParticipant(conversationId, userId);

	const [messages, total] = await Promise.all([
		messageRepository.getChatHistory(conversationId, page, limit),
		messageRepository.countInChat(conversationId),
	]);

	return { messages, total, page, limit };
};

export default {
	buildParticipantPairId,
	getMyConversations,
	startOrGetConversation,
	assertConversationParticipant,
	sendMessage,
	markConversationRead,
	getTotalUnreadCount,
	getMessages,
};
