import bcrypt from "bcryptjs";
import crypto from "crypto";
import OAuthFactory from "./oauth/oauth-factory.service.js";
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  NotFoundError,
} from "../utils/errors.utils.js";
class AuthService {
  constructor(userRepository, tokenUtility, emailService, captchaService) {
    this.userRepository = userRepository;
    this.tokenUtility = tokenUtility;
    this.emailService = emailService;
    this.captchaService = captchaService;
  }

  // src/services/auth.service.js

  // src/services/auth.service.js

  async registerUser(userData) {
    const { email, username, password, captchaToken } = userData;

    // ... validation ...

    const newUserRecord = { email, username, password, tier: "Free" };
    const createdUser = await this.userRepository.create(newUserRecord);

    const verificationToken = this.tokenUtility.generateVerificationToken(
      createdUser._id,
    );

    console.log("🛠️ [AuthService] Passing email to EmailService:", email); // ADD THIS LOG

    // ARCHITECT FIX: Make sure you are passing 'email', NOT 'createdUser.email'
    await this.emailService.sendVerificationEmail(email, verificationToken);

    return {
      user_id: createdUser._id,
      email: email,
      username: username,
      tier: "Free",
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
  async socialLogin(providerName, token) {
    const oauthStrategy = OAuthFactory.getStrategy(providerName);
    const { providerId, email, displayName, avatarUrl } =
      await oauthStrategy.verifyToken(token);

    // ARCHITECT CHECK: Ensure we actually got an email
    if (!email) {
      throw new BadRequestError(
        `Your ${providerName} account must have a verified email to use Pulsify.`,
      );
    }

    // 1. Check if user exists via this provider ID
    // Ensure you added this to user.repository.js!
    let user = await this.userRepository.findByProviderId(
      providerName,
      providerId,
    );

    if (!user) {
      // 2. Check if account exists via email to link them
      user = await this.userRepository.findByEmail(email);

      if (user) {
        const updatePatch = {};
        updatePatch[`${providerName}_id`] = providerId;
        user = await this.userRepository.updateById(user._id, updatePatch);
      } else {
        // 3. Create brand new user
        // We use a fallback if displayName is missing
        const namePart = email.split("@")[0];
        const generatedUsername = `${namePart.slice(0, 10)}_${Math.random().toString(36).slice(-4)}`;

        const newUserRecord = {
          email,
          username: generatedUsername,
          display_name: displayName || generatedUsername,
          avatar_url: avatarUrl || "avatar-url.png",
          is_verified: true,
          tier: "Free",
        };
        newUserRecord[`${providerName}_id`] = providerId;

        user = await this.userRepository.create(newUserRecord);
      }
    }

    if (user.is_suspended)
      throw new ForbiddenError("Forbidden: Suspended account.");

    // 6. Generate Pulsify Tokens
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

  // src/services/auth.service.js
  async forgotPassword(email) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) return { message: "Email sent if account exists." };

    const resetToken = crypto.randomBytes(32).toString("hex");
    await this.userRepository.updateById(user._id, {
      password_reset_token: resetToken,
      password_reset_expires: Date.now() + 3600000,
    });

    await this.emailService.sendPasswordResetEmail(user.email, resetToken);
    return { message: "Check your email." };
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
  // src/services/auth.service.js

  async resendVerificationEmail(email) {
    // 1. Find the user
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      return {
        message:
          "If that email is registered, a new verification link has been sent.",
      };
    }

    if (user.is_verified) {
      const error = new Error(
        "This account is already verified. Please log in.",
      );
      error.statusCode = 400;
      throw error;
    }

    const newVerificationToken = this.tokenUtility.generateVerificationToken(
      user._id,
    );

    console.log("🛠️ [AuthService] Resending email to:", user.email);
    await this.emailService.sendVerificationEmail(
      user.email,
      newVerificationToken,
    );

    return {
      message:
        "A new verification email has been sent. Please check your inbox.",
    };
  }
}

export default AuthService;
