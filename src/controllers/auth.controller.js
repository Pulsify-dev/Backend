class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  register = async (req, res, next) => {
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

  verifyEmail = async (req, res, next) => {
    try {
      const { token } = req.body;
      if (!token) return res.status(400).json({ error: "Token is required." });

      const result = await this.authService.verifyEmail(token);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
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
}

export default AuthController;
