
export const emitNotification = (io, userId, notification) => {
  console.log(`[Sockets] Attempting to emit to room: user_${userId}`);
  if (io && userId) {
    io.to(`user_${userId.toString()}`).emit("new_notification", notification);
    console.log(`[Sockets] Successfully emitted 'new_notification' to user_${userId}`);
  } else {
    console.log(`[Sockets] Failed to emit: io or userId is missing`, { hasIo: !!io, userId });
  }
};


export const registerNotificationHandlers = (io, socket) => {
  const userId = socket.user ? socket.user.user_id : null;

  if (!userId) {
    console.warn(
      `[Sockets] Unauthenticated socket ${socket.id} attempted to bind notification handlers.`,
    );
    return;
  }

  socket.on("join_notifications", () => {
    socket.join(`user_${userId}`);
    console.log(`[Sockets] User ${userId} joined notification room.`);
  });

  socket.on("leave_notifications", () => {
    socket.leave(`user_${userId}`);
    console.log(`[Sockets] User ${userId} left notification room.`);
  });
};
