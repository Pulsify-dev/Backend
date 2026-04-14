import { Router } from "express";
import messagingController from "../controllers/messaging.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import validationMiddleware from "../middleware/user.validation.middleware.js";
import messagingValidation from "../middleware/messaging.validation.middleware.js";

const router = Router();

router.get(
	"/conversations",
	authMiddleware.requireAuth,
	validationMiddleware.validateSearchQuery,
	messagingController.getMyConversations,
);

router.post(
	"/conversations",
	authMiddleware.requireAuth,
	messagingValidation.validateStartConversation,
	messagingController.startOrGetConversation,
);

router.get(
	"/conversations/unread-count",
	authMiddleware.requireAuth,
	messagingController.getUnreadCount,
);

router.get(
	"/conversations/:conversation_id/messages",
	authMiddleware.requireAuth,
	messagingValidation.validateConversationParam,
	validationMiddleware.validateSearchQuery,
	messagingController.getMessages,
);

router.post(
	"/conversations/:conversation_id/messages",
	authMiddleware.requireAuth,
	messagingValidation.validateConversationParam,
	messagingValidation.validateSendMessage,
	messagingController.sendMessage,
);

router.put(
	"/conversations/:conversation_id/read",
	authMiddleware.requireAuth,
	messagingValidation.validateConversationParam,
	messagingController.markConversationRead,
);

export default router;
