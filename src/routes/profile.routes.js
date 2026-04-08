import { Router } from "express";
import profileController from "../controllers/profile.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import { avatarUpload, coverUpload } from "../middleware/upload.middleware.js";
import validationMiddleware from "../middleware/validation.middleware.js";

const router = Router();
//protected routes

router.get("/me", authMiddleware.requireAuth, profileController.getMyProfile);
router.patch(
  "/me",
  authMiddleware.requireAuth,
  validationMiddleware.validateUpdateProfile,
  profileController.updateMyProfile,
);
router.delete(
  "/me",
  authMiddleware.requireAuth,
  validationMiddleware.validateDeleteAccount,
  profileController.deleteMyAccount,
);
router.post(
  "/me/avatar",
  authMiddleware.requireAuth,
  avatarUpload,
  profileController.uploadAvatar,
);
router.post(
  "/me/cover",
  authMiddleware.requireAuth,
  coverUpload,
  profileController.uploadCover,
);
router.put(
  "/me/email",
  authMiddleware.requireAuth,
  validationMiddleware.validateEmailChange,
  profileController.initiateEmailChange,
);
router.put(
  "/me/password",
  authMiddleware.requireAuth,
  validationMiddleware.validateChangePassword,
  profileController.changePassword,
);
router.get(
  "/confirm-email-change",
  validationMiddleware.validateTokenQuery,
  profileController.confirmEmailChange,
);

//public routes
router.get(
  "/",
  validationMiddleware.validateSearchQuery,
  profileController.searchUsers,
);
router.get("/:user_id", profileController.getPublicProfile);

export default router;
