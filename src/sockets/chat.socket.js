import messagingService from "../services/messaging.service.js";

const emitAck = (ack, payload) => {
  if (typeof ack === "function") {
    ack(payload);
  }
};

const registerChatSocketHandlers = (io, socket) => {
  const userId = socket.user.user_id;
  const userRoom = `user:${userId}`;

  socket.join(userRoom);

  socket.on("conversation:join", async (payload = {}, ack) => {
    try {
      const { conversation_id: conversationId } = payload;
      await messagingService.assertConversationParticipant(conversationId, userId);

      socket.join(`conversation:${conversationId}`);
      emitAck(ack, {
        success: true,
        data: { conversation_id: conversationId },
      });
    } catch (error) {
      emitAck(ack, {
        success: false,
        error: error.message,
      });
    }
  });

  socket.on("message:new", async (payload = {}, ack) => {
    try {
      const { conversation_id: conversationId, text, shared_entity: sharedEntity } = payload;
      const result = await messagingService.sendMessage({
        senderId: userId,
        conversationId,
        text,
        sharedEntity,
      });

      const eventPayload = {
        conversation_id: result.conversationId,
        message: result.message,
        last_message_at: result.lastMessageAt,
      };

      io.to(`conversation:${result.conversationId}`).emit("message:new", eventPayload);
      if (result.recipientId) {
        io.to(`user:${result.recipientId}`).emit("message:new", eventPayload);
      }

      emitAck(ack, {
        success: true,
        data: eventPayload,
      });
    } catch (error) {
      emitAck(ack, {
        success: false,
        error: error.message,
      });
    }
  });

  socket.on("conversation:read", async (payload = {}, ack) => {
    try {
      const { conversation_id: conversationId } = payload;
      const result = await messagingService.markConversationRead(
        conversationId,
        userId,
      );

      const eventPayload = {
        conversation_id: result.conversationId,
        reader_id: userId,
        marked_count: result.markedCount,
        read_at: result.readAt,
      };

      io.to(`conversation:${result.conversationId}`).emit(
        "conversation:read",
        eventPayload,
      );

      emitAck(ack, {
        success: true,
        data: eventPayload,
      });
    } catch (error) {
      emitAck(ack, {
        success: false,
        error: error.message,
      });
    }
  });
};

export default registerChatSocketHandlers;
