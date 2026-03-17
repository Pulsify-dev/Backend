class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  register = async (req, res) => {
    try {
      const userData = {
        email: req.body.email,
        username: req.body.username,
        password: req.body.password,
        captchaToken: req.body.captcha_token,
      };

      const result = await this.authService.registerUser(userData);
      return res.status(201).json(result);
    } catch (error) {
      if (error.message.includes("already exists")) {
        return res.status(409).json({ error: error.message });
      }
      return res.status(400).json({ error: error.message });
    }
  };

  login = async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const result = await this.authService.loginUser(email, password);
      return res.status(200).json(result);
    } catch (error) {
      next(error);  // Let error middleware handle it!
    }
  };

  verifyEmail = async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) return res.status(400).json({ error: "Token is required." });

      const result = await this.authService.verifyEmail(token);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(404).json({ error: error.message });
    }
  };

  refreshToken = async (req, res) => {
    try {
      const { refresh_token } = req.body;
      if (!refresh_token)
        return res.status(400).json({ error: "Refresh token is required." });

      const result = await this.authService.refreshUserToken(refresh_token);
      return res.status(200).json(result);
    } catch (error) {
      if (error.message.includes("Suspended")) {
        return res.status(403).json({ error: error.message });
      }
      return res.status(401).json({ error: error.message });
    }
  };

  forgotPassword = async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "Email is required." });

      const result = await this.authService.forgotPassword(email);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  };

  resetPassword = async (req, res) => {
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
      if (error.message.includes("Invalid or expired")) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(400).json({ error: error.message });
    }
  };
}

export default AuthController;
