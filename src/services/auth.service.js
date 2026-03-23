import bcrypt from "bcryptjs";
import crypto from "crypto";
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  NotFoundError,
} from "../utils/errors.js";
class AuthService {
  constructor(userRepository, tokenUtility, emailService, captchaService) {
    this.userRepository = userRepository;
    this.tokenUtility = tokenUtility;
    this.emailService = emailService;
    this.captchaService = captchaService;
  }

  async registerUser(userData) {
    const { email, username, password, captchaToken } = userData;

    const isCaptchaValid = await this.captchaService.verify(captchaToken);
    if (!isCaptchaValid) throw new BadRequestError("Invalid CAPTCHA token.");

    const isEmailTaken = await this.userRepository.emailExists(email);
    const isUsernameTaken = await this.userRepository.usernameExists(username);

    if (isEmailTaken || isUsernameTaken) {
      throw new ConflictError("Email or username already exists.");
    }

    const newUserRecord = { email, username, password, tier: "Free" };
    const createdUser = await this.userRepository.create(newUserRecord);

    const verificationToken = this.tokenUtility.generateVerificationToken(
      createdUser._id,
    );

    await this.emailService.sendVerificationEmail(
      createdUser.email,
      verificationToken,
    );

    return {
      user_id: createdUser._id,
      email: createdUser.email,
      username: createdUser.username,
      tier: createdUser.tier,
      message: "Registration successful. Please check your email to verify.",
    };
  }

  async loginUser(email, password) {
    const user = await this.userRepository.findByEmailWithPassword(email);
    if (!user) throw new UnauthorizedError("Invalid credentials.");

    if (user.is_suspended)
      throw new ForbiddenError("Forbidden: Suspended account.");

    const isPasswordValid = await user.comparePassword(password, user.password);
    if (!isPasswordValid) throw new UnauthorizedError("Invalid credentials.");

    const accessToken = this.tokenUtility.generateAccessToken({
      user_id: user._id,
      tier: user.tier,
      role: user.role,
    });

    const refreshToken = this.tokenUtility.generateRefreshToken({
      user_id: user._id,
    });

    await this.userRepository.updateRefreshToken(user._id, refreshToken);
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        user_id: user._id,
        username: user.username,
        email: user.email,
        display_name: user.display_name,
        tier: user.tier,
        avatar_url: user.avatar_url,
      },
    };
  }
  async verifyEmail(token) {
    const decoded = this.tokenUtility.verifyToken(token);
    if (!decoded || !decoded.user_id) {
      throw new BadRequestError("Invalid or expired verification token.");
    }

    const user = await this.userRepository.findById(decoded.user_id);
    if (!user) throw new NotFoundError("User not found.");
    if (user.is_verified) return { message: "Email is already verified." };

    await this.userRepository.updateById(user._id, { is_verified: true });

    return { message: "Email successfully verified." };
  }

  async refreshUserToken(refreshToken) {
    const decoded = this.tokenUtility.verifyToken(refreshToken, true);
    if (!decoded || !decoded.user_id) {
      throw new UnauthorizedError(
        "Invalid or expired refresh token. Please log in again.",
      );
    }

    const user = await this.userRepository.findById(decoded.user_id);
    if (!user) throw new NotFoundError("User not found.");
    if (user.is_suspended)
      throw new ForbiddenError("Forbidden: Suspended account.");

    const newAccessToken = this.tokenUtility.generateAccessToken({
      user_id: user._id,
      tier: user.tier,
      role: user.role,
    });

    const newRefreshToken = this.tokenUtility.generateRefreshToken({
      user_id: user._id,
    });

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
    };
  }

  async forgotPassword(email) {
    const user = await this.userRepository.findByEmailWithPassword(email);

    const defaultMessage =
      "If that email address is in our database, we will send you a link to reset your password.";
    if (!user) return { message: defaultMessage };

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpires = Date.now() + 3600000; // Expires in 1 hour

    await this.userRepository.updateById(user._id, {
      password_reset_token: resetToken,
      password_reset_expires: resetTokenExpires,
    });

    await this.emailService.sendPasswordResetEmail(user.email, resetToken);

    return { message: defaultMessage };
  }

  async resetPassword(token, newPassword) {
    const user = await this.userRepository.findByPasswordResetToken(token);

    if (!user || user.password_reset_expires < Date.now()) {
      throw new BadRequestError("Invalid or expired password reset token.");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await this.userRepository.updateById(user._id, {
      password: hashedPassword,
      password_reset_token: null,
      password_reset_expires: null,
    });

    return {
      message: "Password has been successfully reset. You can now log in.",
    };
  }
  async logoutUser(refreshToken) {
    const user = await this.userRepository.findByRefreshToken(refreshToken);

    if (user) {
      await this.userRepository.updateRefreshToken(user._id, null);
    }
    return true;
  }
}

export default AuthService;
