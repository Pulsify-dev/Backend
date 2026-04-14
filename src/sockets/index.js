import { Server } from "socket.io";
import tokenUtility from "../utils/jwt.utils.js";
import registerChatSocketHandlers from "./chat.socket.js";

const ALLOWED_ORIGINS = [
  "https://pulsify.page",
  "https://www.pulsify.page",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

let ioInstance = null;

const extractTokenFromSocket = (socket) => {
  const authToken = socket.handshake.auth?.token;
  if (authToken) {
    return authToken;
  }

  const queryToken = socket.handshake.query?.token;
  if (queryToken) {
    return queryToken;
  }

  const authorizationHeader = socket.handshake.headers?.authorization;
  if (authorizationHeader && authorizationHeader.startsWith("Bearer ")) {
    return authorizationHeader.split(" ")[1];
  }

  return null;
};

const authenticateSocket = (socket, next) => {
  try {
    const token = extractTokenFromSocket(socket);
    if (!token) {
      return next(new Error("Unauthorized: Missing token"));
    }

    const decoded = tokenUtility.verifyToken(token, false);
    if (!decoded) {
      return next(new Error("Unauthorized: Invalid token"));
    }

    socket.user = decoded;
    return next();
  } catch (error) {
    return next(new Error("Unauthorized: Authentication failed"));
  }
};

const initializeSocketServer = (httpServer) => {
  if (ioInstance) {
    return ioInstance;
  }

  ioInstance = new Server(httpServer, {
    cors: {
      origin: ALLOWED_ORIGINS,
      credentials: true,
    },
  });

  ioInstance.use(authenticateSocket);

  ioInstance.on("connection", (socket) => {
    registerChatSocketHandlers(ioInstance, socket);
  });

  return ioInstance;
};

const getSocketServer = () => ioInstance;

export { initializeSocketServer, getSocketServer };
