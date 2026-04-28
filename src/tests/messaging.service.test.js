import { expect } from "chai";
import sinon from "sinon";
import messagingService from "../services/messaging.service.js";
import conversationRepository from "../repositories/conversation.repository.js";
import messageRepository from "../repositories/message.repository.js";
import userRepository from "../repositories/user.repository.js";
import blockRepository from "../repositories/block.repository.js";
import albumRepository from "../repositories/album.repository.js";
import { BadRequestError, ForbiddenError, NotFoundError } from "../utils/errors.utils.js";

describe("MessagingService Unit Tests", () => {
	const USER_ID = "507f1f77bcf86cd799439011";
	const RECIPIENT_ID = "507f1f77bcf86cd799439022";
	const CONVO_ID = "607f1f77bcf86cd799439033";
	const PAIR_ID = "507f1f77bcf86cd799439011-507f1f77bcf86cd799439022";

	afterEach(() => {
		sinon.restore();
	});

	describe("startOrGetConversation()", () => {
		it("should throw BadRequestError if messaging self", async () => {
			sinon.stub(userRepository, "findByUsername").resolves({ _id: USER_ID });
			try {
				await messagingService.startOrGetConversation(USER_ID, "selfuser");
				expect.fail("Should have thrown BadRequestError");
			} catch (err) {
				expect(err).to.be.instanceOf(BadRequestError);
			}
		});

		it("should throw NotFoundError if recipient does not exist", async () => {
			sinon.stub(userRepository, "findByUsername").resolves(null);
			try {
				await messagingService.startOrGetConversation(USER_ID, "testuser");
				expect.fail("Should have thrown NotFoundError");
			} catch (err) {
				expect(err).to.be.instanceOf(NotFoundError);
			}
		});

		it("should throw ForbiddenError if recipient blocked sender (no prior conversation)", async () => {
			sinon.stub(userRepository, "findByUsername").resolves({ _id: RECIPIENT_ID });
			const isBlockedStub = sinon.stub(blockRepository, "isBlocked");
			// resolveBlockStatus: isBlocked(sender, recipient) = false, isBlocked(recipient, sender) = true
			isBlockedStub.withArgs(USER_ID, RECIPIENT_ID).resolves(false);
			isBlockedStub.withArgs(RECIPIENT_ID, USER_ID).resolves(true);
			// No prior conversation exists
			sinon.stub(conversationRepository, "getByPairId").resolves(null);

			try {
				await messagingService.startOrGetConversation(USER_ID, "testuser");
				expect.fail("Should have thrown ForbiddenError");
			} catch (err) {
				expect(err).to.be.instanceOf(ForbiddenError);
				expect(err.message).to.equal("Recipient has blocked you.");
			}
		});

		it("should throw ForbiddenError if sender blocked recipient (no prior conversation)", async () => {
			sinon.stub(userRepository, "findByUsername").resolves({ _id: RECIPIENT_ID });
			const isBlockedStub = sinon.stub(blockRepository, "isBlocked");
			// resolveBlockStatus: isBlocked(sender, recipient) = true, isBlocked(recipient, sender) = false
			isBlockedStub.withArgs(USER_ID, RECIPIENT_ID).resolves(true);
			isBlockedStub.withArgs(RECIPIENT_ID, USER_ID).resolves(false);
			// No prior conversation exists
			sinon.stub(conversationRepository, "getByPairId").resolves(null);

			try {
				await messagingService.startOrGetConversation(USER_ID, "testuser");
				expect.fail("Should have thrown ForbiddenError");
			} catch (err) {
				expect(err).to.be.instanceOf(ForbiddenError);
				expect(err.message).to.equal("Cannot message a user you have blocked.");
			}
		});

		it("should return existing conversation with block_status when blocked", async () => {
			sinon.stub(userRepository, "findByUsername").resolves({ _id: RECIPIENT_ID });
			const isBlockedStub = sinon.stub(blockRepository, "isBlocked");
			isBlockedStub.withArgs(USER_ID, RECIPIENT_ID).resolves(true);
			isBlockedStub.withArgs(RECIPIENT_ID, USER_ID).resolves(false);
			const existingConvo = { _id: CONVO_ID };
			sinon.stub(conversationRepository, "getByPairId").resolves(existingConvo);

			const result = await messagingService.startOrGetConversation(USER_ID, "testuser");
			expect(result.conversation).to.equal(existingConvo);
			expect(result.created).to.be.false;
			expect(result.block_status.is_blocked).to.be.true;
			expect(result.block_status.blocked_by_me).to.be.true;
			expect(result.block_status.blocked_by_them).to.be.false;
		});

		it("should return existing conversation if pair holds", async () => {
			sinon.stub(userRepository, "findByUsername").resolves({ _id: RECIPIENT_ID });
			sinon.stub(blockRepository, "isBlocked").resolves(false);
			const existingConvo = { _id: CONVO_ID };
			sinon.stub(conversationRepository, "getByPairId").resolves(existingConvo);

			const result = await messagingService.startOrGetConversation(USER_ID, "testuser");
			expect(result.created).to.be.false;
			expect(result.conversation).to.equal(existingConvo);
		});

		it("should create new conversation if none exists", async () => {
			sinon.stub(userRepository, "findByUsername").resolves({ _id: RECIPIENT_ID });
			sinon.stub(blockRepository, "isBlocked").resolves(false);
			sinon.stub(conversationRepository, "getByPairId").resolves(null);
			const newConvo = { _id: CONVO_ID };
			sinon.stub(conversationRepository, "createConversation").resolves(newConvo);

			const result = await messagingService.startOrGetConversation(USER_ID, "testuser");
			expect(result.created).to.be.true;
			expect(result.conversation).to.equal(newConvo);
		});
	});

	describe("sendMessage()", () => {
		it("should throw ForbiddenError if sender is not in conversation", async () => {
			sinon.stub(conversationRepository, "getConvoIfParticipant").resolves(null);

			try {
				await messagingService.sendMessage({
					senderId: USER_ID,
					conversationId: CONVO_ID,
					text: "Hi",
				});
				expect.fail("Should have thrown ForbiddenError");
			} catch (err) {
				expect(err).to.be.instanceOf(ForbiddenError);
			}
		});

		it("should throw BadRequestError if no text and no valid shared entity", async () => {
			sinon.stub(conversationRepository, "getConvoIfParticipant").resolves({
				_id: CONVO_ID,
				participants: [USER_ID, RECIPIENT_ID],
			});
			sinon.stub(blockRepository, "isBlocked").resolves(false);

			try {
				await messagingService.sendMessage({
					senderId: USER_ID,
					conversationId: CONVO_ID,
					text: "   ",
				});
				expect.fail("Should have thrown BadRequestError");
			} catch (err) {
				expect(err).to.be.instanceOf(BadRequestError);
			}
		});

		it("should successfully send message with text", async () => {
			sinon.stub(conversationRepository, "getConvoIfParticipant").resolves({
				_id: CONVO_ID,
				participants: [USER_ID, RECIPIENT_ID],
			});
			sinon.stub(blockRepository, "isBlocked").resolves(false);
			const mockMessage = { _id: "msg1", text: "Hello" };
			sinon.stub(messageRepository, "createMessage").resolves(mockMessage);
			sinon.stub(conversationRepository, "updateById").resolves({ last_message_at: new Date() });

			const result = await messagingService.sendMessage({
				senderId: USER_ID,
				conversationId: CONVO_ID,
				text: "Hello",
			});

			expect(result.message).to.equal(mockMessage);
			expect(result.recipientId).to.equal(RECIPIENT_ID);
			expect(result.conversationId).to.equal(CONVO_ID);
		});

		it("should successfully send message with a public album share", async () => {
			sinon.stub(conversationRepository, "getConvoIfParticipant").resolves({
				_id: CONVO_ID,
				participants: [USER_ID, RECIPIENT_ID],
			});
			sinon.stub(blockRepository, "isBlocked").resolves(false);
			sinon.stub(albumRepository, "findById").resolves({
				_id: "album1",
				artist_id: RECIPIENT_ID,
				visibility: "public",
				is_hidden: false,
			});
			const createStub = sinon.stub(messageRepository, "createMessage").resolves({ _id: "msg2" });
			sinon.stub(conversationRepository, "updateById").resolves({ last_message_at: new Date() });

			const result = await messagingService.sendMessage({
				senderId: USER_ID,
				conversationId: CONVO_ID,
				sharedEntity: {
					type: "Album",
					id: "507f1f77bcf86cd799439044",
				},
			});

			expect(result.message._id).to.equal("msg2");
			expect(createStub.firstCall.args[0].shared_entity.type).to.equal("Album");
		});

		it("should allow the album owner to share a private album", async () => {
			sinon.stub(conversationRepository, "getConvoIfParticipant").resolves({
				_id: CONVO_ID,
				participants: [USER_ID, RECIPIENT_ID],
			});
			sinon.stub(blockRepository, "isBlocked").resolves(false);
			sinon.stub(albumRepository, "findById").resolves({
				_id: "album1",
				artist_id: USER_ID,
				visibility: "private",
				is_hidden: false,
			});
			const createStub = sinon.stub(messageRepository, "createMessage").resolves({ _id: "msg3" });
			sinon.stub(conversationRepository, "updateById").resolves({ last_message_at: new Date() });

			await messagingService.sendMessage({
				senderId: USER_ID,
				conversationId: CONVO_ID,
				sharedEntity: {
					type: "Album",
					id: "507f1f77bcf86cd799439055",
				},
			});

			expect(createStub.calledOnce).to.be.true;
		});

		it("should reject a private album share for a non-owner", async () => {
			sinon.stub(conversationRepository, "getConvoIfParticipant").resolves({
				_id: CONVO_ID,
				participants: [USER_ID, RECIPIENT_ID],
			});
			sinon.stub(blockRepository, "isBlocked").resolves(false);
			sinon.stub(albumRepository, "findById").resolves({
				_id: "album1",
				artist_id: RECIPIENT_ID,
				visibility: "private",
				is_hidden: false,
			});

			try {
				await messagingService.sendMessage({
					senderId: USER_ID,
					conversationId: CONVO_ID,
					sharedEntity: {
						type: "Album",
						id: "507f1f77bcf86cd799439066",
					},
				});
				expect.fail("Should have thrown ForbiddenError");
			} catch (err) {
				expect(err).to.be.instanceOf(ForbiddenError);
				expect(err.message).to.equal("You do not have access to share this album.");
			}
		});
	});

	describe("getMyConversations()", () => {
		it("should return formatted conversations with unread counts and block_status", async () => {
			const mockConvos = [
				{
					_id: CONVO_ID,
					participants: [
						{ _id: USER_ID },
						{ _id: RECIPIENT_ID, username: "testuser" },
					],
				},
			];
			sinon.stub(conversationRepository, "getUserInbox").resolves(mockConvos);
			sinon.stub(conversationRepository, "countUserChats").resolves(1);
			sinon.stub(messageRepository, "countUnreadInChat").resolves(5);
			// resolveBlockStatus: no block in either direction
			sinon.stub(blockRepository, "isBlocked").resolves(false);

			const result = await messagingService.getMyConversations(USER_ID, 1, 10);
			expect(result.total).to.equal(1);
			expect(result.conversations).to.be.an("array").with.lengthOf(1);
			expect(result.conversations[0].unread_count).to.equal(5);
			expect(result.conversations[0].other_participant.username).to.equal("testuser");
			expect(result.conversations[0].block_status.is_blocked).to.be.false;
		});

		it("should reflect blocked_by_me when caller has blocked the other participant", async () => {
			const mockConvos = [
				{
					_id: CONVO_ID,
					participants: [
						{ _id: USER_ID },
						{ _id: RECIPIENT_ID, username: "testuser" },
					],
				},
			];
			sinon.stub(conversationRepository, "getUserInbox").resolves(mockConvos);
			sinon.stub(conversationRepository, "countUserChats").resolves(1);
			sinon.stub(messageRepository, "countUnreadInChat").resolves(0);
			const isBlockedStub = sinon.stub(blockRepository, "isBlocked");
			isBlockedStub.withArgs(USER_ID, RECIPIENT_ID).resolves(true);  // caller blocked other
			isBlockedStub.withArgs(RECIPIENT_ID, USER_ID).resolves(false);

			const result = await messagingService.getMyConversations(USER_ID, 1, 10);
			const bs = result.conversations[0].block_status;
			expect(bs.is_blocked).to.be.true;
			expect(bs.blocked_by_me).to.be.true;
			expect(bs.blocked_by_them).to.be.false;
		});
	});

	describe("getMessages()", () => {
		it("should fetch chat history with block_status when authorized", async () => {
			// Return conversation with participants so resolveBlockStatus can find the other user
			sinon.stub(conversationRepository, "getConvoIfParticipant").resolves({
				_id: CONVO_ID,
				participants: [USER_ID, RECIPIENT_ID],
			});
			sinon.stub(messageRepository, "getChatHistory").resolves([{ text: "msg1" }]);
			sinon.stub(messageRepository, "countInChat").resolves(1);
			// No block in either direction
			sinon.stub(blockRepository, "isBlocked").resolves(false);

			const result = await messagingService.getMessages(CONVO_ID, USER_ID, 1, 20);
			expect(result.messages).to.have.length(1);
			expect(result.total).to.equal(1);
			expect(result.block_status.is_blocked).to.be.false;
		});
	});

	describe("markConversationRead()", () => {
		it("should mark messages as read when authorized", async () => {
			sinon.stub(conversationRepository, "getConvoIfParticipant").resolves({ _id: CONVO_ID });
			sinon.stub(messageRepository, "markChatAsRead").resolves({ modifiedCount: 3 });

			const result = await messagingService.markConversationRead(CONVO_ID, USER_ID);
			expect(result.markedCount).to.equal(3);
			expect(result.conversationId).to.equal(CONVO_ID);
		});
	});

	describe("getTotalUnreadCount()", () => {
		it("should return 0 if no conversations", async () => {
			sinon.stub(conversationRepository, "getUserChatIds").resolves([]);
			const result = await messagingService.getTotalUnreadCount(USER_ID);
			expect(result.unread_count).to.equal(0);
		});

		it("should return unread count of all valid conversations", async () => {
			sinon.stub(conversationRepository, "getUserChatIds").resolves([{ _id: "c1" }, { _id: "c2" }]);
			sinon.stub(messageRepository, "countUnreadChats").resolves(8);

			const result = await messagingService.getTotalUnreadCount(USER_ID);
			expect(result.unread_count).to.equal(8);
		});
	});
});
