
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
    if (!isCaptchaValid) throw new Error("Invalid CAPTCHA token.");

    const isEmailTaken = await this.userRepository.emailExists(email);
    const isUsernameTaken = await this.userRepository.usernameExists(username);

    if (isEmailTaken || isUsernameTaken) {
      throw new Error("Email or username already exists.");
    }

    const newUserRecord = { email, username, password, tier: "Free" };
    const createdUser = await this.userRepository.create(newUserRecord);

    // Using the injected utility
    const verificationToken = this.tokenUtility.generateVerificationToken(createdUser._id);
    
    await this.emailService.sendVerificationEmail(
      createdUser.email,
      verificationToken
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
    if (!user) throw new Error("Invalid credentials.");

    if (user.is_suspended) throw new Error("Forbidden: Suspended account.");

    const isPasswordValid = await user.comparePassword(password, user.password);
    if (!isPasswordValid) throw new Error("Invalid credentials.");

    const accessToken = this.tokenUtility.generateAccessToken({
      user_id: user._id,
      tier: user.tier,
      role: user.role,
    });

    const refreshToken = this.tokenUtility.generateRefreshToken({
      user_id: user._id,
    });

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
}

export default AuthService;