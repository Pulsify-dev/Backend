class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  // src/controllers/auth.controller.js

  register = async (req, res, next) => {
    console.log("📦 INCOMING DATA FROM POSTMAN:", req.body); // Useful for debugging

    try {
      // 1. ARCHITECT CHECK: Validate required fields immediately
      if (!req.body.email || !req.body.password || !req.body.username) {
        return res.status(400).json({
          error: "Bad Request: email, username, and password are required.",
        });
      }

      const userData = {
        email: req.body.email,
        username: req.body.username,
        password: req.body.password,
        captchaToken: req.body.captcha_token,
      };

      const result = await this.authService.registerUser(userData);
      return res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };
  login = async (req, res, next) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res
          .status(400)
          .json({ error: "Bad Request: Email and password are required." });
      }
      const result = await this.authService.loginUser(email, password);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
  socialLogin = async (req, res, next) => {
    try {
      const { provider } = req.params; // this will be 'google', 'facebook', or 'apple'
      const { token } = req.body;

      if (!token) return res.status(400).json({ error: "Token is required." });

      const result = await this.authService.socialLogin(provider, token);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  verifyEmail = async (req, res, next) => {
    console.log("➡️ [1] Verification route hit!");

    const loginPage = process.env.CLIENT_URL
      ? `${process.env.CLIENT_URL}/login`
      : "https://pulsify.page/login";

    try {
      const token = req.query.token || req.body.token;
      console.log("➡️ [2] Token received:", token ? "Yes" : "No");

      if (!token) {
        console.log("❌ [Error] No token provided.");
        return res.redirect(`${loginPage}?error=missing_token`);
      }

      console.log("➡️ [3] Calling AuthService...");
      await this.authService.verifyEmail(token);

      console.log("✅ [4] Database updated! Redirecting to frontend...");
      return res.redirect(`${loginPage}?verified=true`);
    } catch (error) {
      console.error("❌ [5] Crash inside verifyEmail:", error.message);
      console.error(error.stack);

      return res.redirect(`${loginPage}?error=invalid_token`);
    }
  };
  refreshToken = async (req, res, next) => {
    try {
      const { refresh_token } = req.body;
      if (!refresh_token)
        return res.status(400).json({ error: "Refresh token is required." });

      const result = await this.authService.refreshUserToken(refresh_token);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (req, res, next) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "Email is required." });

      const result = await this.authService.forgotPassword(email);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req, res, next) => {
    try {
      const { token, new_password } = req.body;
      if (!token || !new_password) {
        return res
          .status(400)
          .json({ error: "Token and new_password are required." });
      }

      const result = await this.authService.resetPassword(token, new_password);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
  logout = async (req, res, next) => {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        return res.status(400).json({ error: "Refresh token is required." });
      }

      await this.authService.logoutUser(refresh_token);

      return res.status(200).json({ message: "Logged out successfully." });
    } catch (error) {
      next(error);
    }
  };

  resendVerification = async (req, res, next) => {
    console.log("🔄 [Auth] Resend verification requested for:", req.body.email);

    try {
      if (!req.body.email) {
        return res.status(400).json({ error: "Email is required." });
      }

      const result = await this.authService.resendVerificationEmail(
        req.body.email,
      );

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}

export default AuthController;
