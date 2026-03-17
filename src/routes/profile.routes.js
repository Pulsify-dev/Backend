import { Router } from "express";
import profileController from "../controllers/profile.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import { avatarUpload, coverUpload } from "../middleware/upload.middleware.js";

const router = Router();

//protected routes

router.get("/me", authMiddleware.requireAuth, profileController.getMyProfile);
router.patch("/me", authMiddleware.requireAuth, profileController.updateMyProfile);
router.delete("/me", authMiddleware.requireAuth, profileController.deleteMyAccount);
router.post("/me/avatar", authMiddleware.requireAuth, avatarUpload, profileController.uploadAvatar);
router.post("/me/cover", authMiddleware.requireAuth, coverUpload, profileController.uploadCover);
router.put("/me/email", authMiddleware.requireAuth, profileController.initiateEmailChange);

//public routes
router.get("/confirm-email-change", profileController.confirmEmailChange);
router.get("/", profileController.searchUsers);
router.get("/:user_id", profileController.getPublicProfile);

export default router;