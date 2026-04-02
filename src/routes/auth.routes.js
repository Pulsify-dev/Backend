import express from "express";

import AuthController from "../controllers/auth.controller.js";
import AuthService from "../services/auth.service.js";
import userRepository from "../repositories/user.repository.js";
import tokenUtility from "../utils/jwt.utils.js";
import emailService from "../services/email.service.js";
import captchaService from "../services/captcha.service.js";

const router = express.Router();

const authService = new AuthService(
  userRepository,
  tokenUtility,
  emailService,
  captchaService,
);

const authController = new AuthController(authService);

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/verify-email", authController.verifyEmail);
router.post("/verify-email", authController.verifyEmail);
router.post("/refresh", authController.refreshToken);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

export default router;
