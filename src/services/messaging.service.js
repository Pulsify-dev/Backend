import conversationRepository from "../repositories/conversation.repository.js";
import messageRepository from "../repositories/message.repository.js";
import userRepository from "../repositories/user.repository.js";
import blockRepository from "../repositories/block.repository.js";
import albumRepository from "../repositories/album.repository.js";
import {
	BadRequestError,
	ForbiddenError,
	NotFoundError,
} from "../utils/errors.utils.js";

const buildParticipantPairId = (userAId, userBId) => {
	const participantIds = [userAId.toString(), userBId.toString()].sort();
	return participantIds.join("-");
};

/**
 * Runs two isBlocked checks in parallel and returns a structured
 * block_status object the frontend can use to render the correct UI.
 *
 * blocked_by_me   → caller blocked the other party (they can unblock)
 * blocked_by_them → other party blocked the caller (nothing they can do)
 */
const resolveBlockStatus = async (callerId, otherUserId) => {
	const [blockedByMe, blockedByThem] = await Promise.all([
		blockRepository.isBlocked(callerId, otherUserId),
		blockRepository.isBlocked(otherUserId, callerId),
	]);

	return {
		is_blocked: blockedByMe || blockedByThem,
		blocked_by_me: blockedByMe,
		blocked_by_them: blockedByThem,
	};
};

const UNBLOCKED_STATUS = { is_blocked: false, blocked_by_me: false, blocked_by_them: false };

const assertCanShareAlbum = async (senderId, albumId) => {
	const album = await albumRepository.findById(albumId);
	if (!album || album.is_hidden) {
		throw new NotFoundError("Album not found");
	}

	const isOwner = album.artist_id?.toString() === senderId.toString();
	if (album.visibility === "private" && !isOwner) {
		throw new ForbiddenError("You do not have access to share this album.");
	}

	return album;
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

			const [unreadCount, blockStatus] = await Promise.all([
				messageRepository.countUnreadInChat(conversation._id, userId),
				otherParticipant
					? resolveBlockStatus(userId, otherParticipant._id)
					: Promise.resolve(UNBLOCKED_STATUS),
			]);

			return {
				...conversation,
				other_participant: otherParticipant || null,
				unread_count: unreadCount,
				block_status: blockStatus,
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

	// Resolve block status before checking for an existing conversation
	const blockStatus = await resolveBlockStatus(senderId, recipientId);

	if (blockStatus.is_blocked) {
		// Hybrid approach:
		// If the conversation already exists (e.g. they were chatting before
		// the block), return it with block_status so the frontend can render
		// the correct restricted UI instead of crashing with a 403.
		// If no conversation ever existed, keep the hard error — there is
		// nothing to return.
		const participantPairId = buildParticipantPairId(senderId, recipientId);
		const existingConversation = await conversationRepository.getByPairId(participantPairId);

		if (existingConversation) {
			return { conversation: existingConversation, created: false, block_status: blockStatus };
		}

		// No prior conversation — throw with a direction-aware message
		if (blockStatus.blocked_by_me) {
			throw new ForbiddenError("Cannot message a user you have blocked.");
		}
		throw new ForbiddenError("Recipient has blocked you.");
	}

	const participantPairId = buildParticipantPairId(senderId, recipientId);
	let conversation = await conversationRepository.getByPairId(participantPairId);

	if (conversation) {
		return { conversation, created: false, block_status: UNBLOCKED_STATUS };
	}

	conversation = await conversationRepository.createConversation({
		participants: [senderId, recipientId],
	});

	return { conversation, created: true, block_status: UNBLOCKED_STATUS };
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
		if (sharedEntity.type === "Album") {
			await assertCanShareAlbum(senderId, sharedEntity.id);
		}

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
	const conversation = await assertConversationParticipant(conversationId, userId);

	// Derive the other participant's ID from the conversation document
	const otherParticipantId = (conversation.participants || [])
		.map((p) => p.toString())
		.find((p) => p !== userId.toString()) || null;

	const [messages, total, blockStatus] = await Promise.all([
		messageRepository.getChatHistory(conversationId, page, limit),
		messageRepository.countInChat(conversationId),
		otherParticipantId
			? resolveBlockStatus(userId, otherParticipantId)
			: Promise.resolve(UNBLOCKED_STATUS),
	]);

	return { messages, total, page, limit, block_status: blockStatus };
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
