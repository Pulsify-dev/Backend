import { expect } from "chai";
import sinon from "sinon";

import registerChatSocketHandlers from "../sockets/chat.socket.js";
import messagingService from "../services/messaging.service.js";

// ═══════════════════════════════════════════════════════════════════════════
// chat.socket.js  –  registerChatSocketHandlers
// ═══════════════════════════════════════════════════════════════════════════

describe("ChatSocket", () => {
  afterEach(() => sinon.restore());

  // ── Shared IDs ────────────────────────────────────────────────────────────
  const USER_ID   = "507f1f77bcf86cd799439011";
  const CONVO_ID  = "607f1f77bcf86cd799439033";
  const RECIPIENT = "707f1f77bcf86cd799439044";

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Builds a minimal fake socket that captures event handlers in `_handlers`.
   * Mirrors the pattern used in notification.test.js.
   */
  const makeSocket = (userId = USER_ID) => {
    const handlers = {};
    return {
      id: "chat-socket-001",
      user: { user_id: userId },
      join: sinon.stub(),
      leave: sinon.stub(),
      on: (event, cb) => { handlers[event] = cb; },
      _handlers: handlers,
    };
  };

  /**
   * Builds a fake io whose to() returns a chainable { emit } stub.
   * Exposes _emit so tests can assert on broadcast payloads.
   */
  const makeIo = () => {
    const emitStub = sinon.stub();
    const toStub   = sinon.stub().returns({ emit: emitStub });
    return { to: toStub, _emit: emitStub };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Setup — registerChatSocketHandlers
  // ─────────────────────────────────────────────────────────────────────────
  describe("registerChatSocketHandlers (setup)", () => {
    it("should immediately join the personal user room on registration", () => {
      const socket = makeSocket();
      registerChatSocketHandlers(makeIo(), socket);

      expect(socket.join.calledWith(`user:${USER_ID}`)).to.be.true;
    });

    it("should register conversation:join, message:new, and conversation:read handlers", () => {
      const socket = makeSocket();
      registerChatSocketHandlers(makeIo(), socket);

      expect(socket._handlers).to.have.property("conversation:join");
      expect(socket._handlers).to.have.property("message:new");
      expect(socket._handlers).to.have.property("conversation:read");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // conversation:join
  // ─────────────────────────────────────────────────────────────────────────
  describe("conversation:join", () => {
    it("should join the conversation room and ack success when authorised", async () => {
      sinon.stub(messagingService, "assertConversationParticipant").resolves({
        _id: CONVO_ID,
        participants: [USER_ID, RECIPIENT],
      });

      const socket = makeSocket();
      const io     = makeIo();
      registerChatSocketHandlers(io, socket);

      const ack = sinon.stub();
      await socket._handlers["conversation:join"]({ conversation_id: CONVO_ID }, ack);

      expect(socket.join.calledWith(`conversation:${CONVO_ID}`)).to.be.true;
      expect(ack.calledOnce).to.be.true;
      expect(ack.firstCall.args[0].success).to.be.true;
      expect(ack.firstCall.args[0].data.conversation_id).to.equal(CONVO_ID);
    });

    it("should ack failure when assertConversationParticipant throws", async () => {
      sinon.stub(messagingService, "assertConversationParticipant")
        .rejects(new Error("Caller is not a conversation participant"));

      const socket = makeSocket();
      registerChatSocketHandlers(makeIo(), socket);

      const ack = sinon.stub();
      await socket._handlers["conversation:join"]({ conversation_id: CONVO_ID }, ack);

      expect(ack.firstCall.args[0].success).to.be.false;
      expect(ack.firstCall.args[0].error).to.equal("Caller is not a conversation participant");
    });

    it("should not throw when no ack callback is provided", async () => {
      sinon.stub(messagingService, "assertConversationParticipant").resolves({
        _id: CONVO_ID,
        participants: [USER_ID, RECIPIENT],
      });

      const socket = makeSocket();
      registerChatSocketHandlers(makeIo(), socket);

      // no ack → should complete silently (emitAck guard)
      await socket._handlers["conversation:join"]({ conversation_id: CONVO_ID });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // message:new
  // ─────────────────────────────────────────────────────────────────────────
  describe("message:new", () => {
    const mockSendResult = {
      message:       { _id: "msg-001", text: "Hello!" },
      conversationId: CONVO_ID,
      recipientId:   RECIPIENT,
      lastMessageAt: new Date("2026-04-26T10:00:00Z"),
    };

    it("should broadcast to the conversation room and the recipient's user room on success", async () => {
      sinon.stub(messagingService, "sendMessage").resolves(mockSendResult);

      const socket = makeSocket();
      const io     = makeIo();
      registerChatSocketHandlers(io, socket);

      const ack = sinon.stub();
      await socket._handlers["message:new"](
        { conversation_id: CONVO_ID, text: "Hello!" },
        ack,
      );

      expect(io.to.calledWith(`conversation:${CONVO_ID}`)).to.be.true;
      expect(io.to.calledWith(`user:${RECIPIENT}`)).to.be.true;
      expect(ack.firstCall.args[0].success).to.be.true;
      expect(ack.firstCall.args[0].data.message).to.deep.equal(mockSendResult.message);
    });

    it("should NOT broadcast to a user room when recipientId is null", async () => {
      sinon.stub(messagingService, "sendMessage").resolves({
        ...mockSendResult,
        recipientId: null,
      });

      const socket = makeSocket();
      const io     = makeIo();
      registerChatSocketHandlers(io, socket);

      await socket._handlers["message:new"](
        { conversation_id: CONVO_ID, text: "Hello!" },
        sinon.stub(),
      );

      const calledRooms = io.to.args.map((a) => a[0]);
      expect(calledRooms.some((r) => r.startsWith("user:"))).to.be.false;
    });

    it("should ack failure when sendMessage throws", async () => {
      sinon.stub(messagingService, "sendMessage")
        .rejects(new Error("Message must contain text or shared_entity"));

      const socket = makeSocket();
      registerChatSocketHandlers(makeIo(), socket);

      const ack = sinon.stub();
      await socket._handlers["message:new"]({ conversation_id: CONVO_ID }, ack);

      expect(ack.firstCall.args[0].success).to.be.false;
      expect(ack.firstCall.args[0].error).to.equal("Message must contain text or shared_entity");
    });

    it("should pass senderId, conversationId, text and sharedEntity correctly to the service", async () => {
      const sendStub = sinon.stub(messagingService, "sendMessage").resolves(mockSendResult);

      const socket = makeSocket();
      registerChatSocketHandlers(makeIo(), socket);

      await socket._handlers["message:new"](
        { conversation_id: CONVO_ID, text: "Hey", shared_entity: { type: "Track", id: "t1" } },
        sinon.stub(),
      );

      const args = sendStub.firstCall.args[0];
      expect(args.senderId).to.equal(USER_ID);
      expect(args.conversationId).to.equal(CONVO_ID);
      expect(args.text).to.equal("Hey");
      expect(args.sharedEntity).to.deep.equal({ type: "Track", id: "t1" });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // conversation:read
  // ─────────────────────────────────────────────────────────────────────────
  describe("conversation:read", () => {
    const mockReadResult = {
      conversationId: CONVO_ID,
      markedCount:    3,
      readAt:         new Date("2026-04-26T10:05:00Z"),
    };

    it("should broadcast conversation:read to the conversation room with correct payload", async () => {
      sinon.stub(messagingService, "markConversationRead").resolves(mockReadResult);

      const socket = makeSocket();
      const io     = makeIo();
      registerChatSocketHandlers(io, socket);

      const ack = sinon.stub();
      await socket._handlers["conversation:read"]({ conversation_id: CONVO_ID }, ack);

      expect(io.to.calledWith(`conversation:${CONVO_ID}`)).to.be.true;
      expect(io._emit.calledWith("conversation:read")).to.be.true;

      const broadcastPayload = io._emit.firstCall.args[1];
      expect(broadcastPayload.reader_id).to.equal(USER_ID);
      expect(broadcastPayload.marked_count).to.equal(3);

      expect(ack.firstCall.args[0].success).to.be.true;
      expect(ack.firstCall.args[0].data.marked_count).to.equal(3);
    });

    it("should ack failure when markConversationRead throws", async () => {
      sinon.stub(messagingService, "markConversationRead")
        .rejects(new Error("Caller is not a conversation participant"));

      const socket = makeSocket();
      registerChatSocketHandlers(makeIo(), socket);

      const ack = sinon.stub();
      await socket._handlers["conversation:read"]({ conversation_id: CONVO_ID }, ack);

      expect(ack.firstCall.args[0].success).to.be.false;
      expect(ack.firstCall.args[0].error).to.equal("Caller is not a conversation participant");
    });

    it("should use the socket user's ID as reader_id in the broadcast payload", async () => {
      sinon.stub(messagingService, "markConversationRead").resolves(mockReadResult);

      const socket = makeSocket();
      const io     = makeIo();
      registerChatSocketHandlers(io, socket);

      await socket._handlers["conversation:read"]({ conversation_id: CONVO_ID }, sinon.stub());

      const broadcastPayload = io._emit.firstCall.args[1];
      expect(broadcastPayload.reader_id).to.equal(USER_ID);
    });

    it("should not throw when no ack callback is provided", async () => {
      sinon.stub(messagingService, "markConversationRead").resolves(mockReadResult);

      const socket = makeSocket();
      const io     = makeIo();
      registerChatSocketHandlers(io, socket);

      // no ack → should complete silently (emitAck guard)
      await socket._handlers["conversation:read"]({ conversation_id: CONVO_ID });
    });
  });
});
