import { expect } from "chai";
import sinon from "sinon";
import AuthService from "../services/auth.service.js";

describe("AuthService Business Logic", () => {
  let authService;
  let mockUserRepository;
  let mockTokenUtility;
  let mockEmailService;
  let mockCaptchaService;

  beforeEach(() => {
    // Repository Mocks (Includes all Module 1 methods)
    mockUserRepository = {
      emailExists: sinon.stub(),
      usernameExists: sinon.stub(),
      create: sinon.stub(),
      findByEmailWithPassword: sinon.stub(),
      findById: sinon.stub(),
      updateById: sinon.stub(),
      findByPasswordResetToken: sinon.stub(),
      findByRefreshToken: sinon.stub(),
      updateRefreshToken: sinon.stub(),
    };

    // Utility & Service Mocks
    mockTokenUtility = {
      generateVerificationToken: sinon.stub(),
      generateAccessToken: sinon.stub(),
      generateRefreshToken: sinon.stub(),
      verifyToken: sinon.stub(),
    };

    mockEmailService = {
      sendVerificationEmail: sinon.stub(),
      sendPasswordResetEmail: sinon.stub(),
    };

    mockCaptchaService = {
      verify: sinon.stub(),
    };

    // Instantiate Service with injected dependencies
    authService = new AuthService(
      mockUserRepository,
      mockTokenUtility,
      mockEmailService,
      mockCaptchaService,
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  /* -------------------------------------------------------------------------- */
  /* REGISTER USER                                                              */
  /* -------------------------------------------------------------------------- */
  describe("registerUser()", () => {
    const validUserData = {
      email: "test@pulsify.app",
      username: "testuser",
      password: "password123",
      captchaToken: "valid-token",
    };

    it("should successfully register a new user", async () => {
      mockCaptchaService.verify.resolves(true);
      mockUserRepository.emailExists.resolves(false);
      mockUserRepository.usernameExists.resolves(false);

      const fakeCreatedUser = {
        _id: "mongo-id-123",
        email: validUserData.email,
        username: validUserData.username,
        tier: "Free",
      };
      mockUserRepository.create.resolves(fakeCreatedUser);
      mockTokenUtility.generateVerificationToken.returns("fake-jwt-123");
      mockEmailService.sendVerificationEmail.resolves(true);

      const result = await authService.registerUser(validUserData);

      expect(result.user_id).to.equal("mongo-id-123");
      expect(result.tier).to.equal("Free");
      expect(mockCaptchaService.verify.calledOnceWith("valid-token")).to.be
        .true;
      expect(mockEmailService.sendVerificationEmail.calledOnce).to.be.true;
    });

    it("should throw an error if CAPTCHA is invalid", async () => {
      mockCaptchaService.verify.resolves(false);
      try {
        await authService.registerUser(validUserData);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error.message).to.equal("Invalid CAPTCHA token.");
      }
    });

    it("should throw an error if email already exists", async () => {
      mockCaptchaService.verify.resolves(true);
      mockUserRepository.emailExists.resolves(true);

      try {
        await authService.registerUser(validUserData);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error.message).to.equal("Email or username already exists.");
      }
    });
  });

  /* -------------------------------------------------------------------------- */
  /* LOGIN USER                                                                 */
  /* -------------------------------------------------------------------------- */
  describe("loginUser()", () => {
    it("should successfully log in and save the refresh token to the database", async () => {
      const fakeUser = {
        _id: "mongo-id-123",
        email: "test@pulsify.app",
        is_suspended: false,
        comparePassword: sinon.stub().resolves(true),
      };

      mockUserRepository.findByEmailWithPassword.resolves(fakeUser);
      mockTokenUtility.generateAccessToken.returns("access-123");
      mockTokenUtility.generateRefreshToken.returns("refresh-123");
      mockUserRepository.updateRefreshToken.resolves();

      const result = await authService.loginUser(
        "test@pulsify.app",
        "password123",
      );

      expect(result.access_token).to.equal("access-123");
      expect(result.refresh_token).to.equal("refresh-123");
      expect(mockUserRepository.updateRefreshToken.calledOnce).to.be.true;
    });

    it("should throw error if user is suspended", async () => {
      mockUserRepository.findByEmailWithPassword.resolves({
        is_suspended: true,
      });
      try {
        await authService.loginUser("test@pulsify.app", "pass");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error.message).to.equal("Forbidden: Suspended account.");
      }
    });

    it("should throw error if credentials are invalid", async () => {
      mockUserRepository.findByEmailWithPassword.resolves(null);
      try {
        await authService.loginUser("wrong@test.com", "pass");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error.message).to.equal("Invalid credentials.");
      }
    });
  });

  /* -------------------------------------------------------------------------- */
  /* LOGOUT USER                                                                */
  /* -------------------------------------------------------------------------- */
  describe("logoutUser()", () => {
    it("should return true and clear the database token if found", async () => {
      mockUserRepository.findByRefreshToken.resolves({ _id: "mongo-id-123" });
      mockUserRepository.updateRefreshToken.resolves();

      const result = await authService.logoutUser("valid-token");

      expect(result).to.be.true;
      expect(
        mockUserRepository.updateRefreshToken.calledWith("mongo-id-123", null),
      ).to.be.true;
    });

    it("should return true even if token does not exist in DB (Idempotency)", async () => {
      mockUserRepository.findByRefreshToken.resolves(null);

      const result = await authService.logoutUser("ghost-token");

      expect(result).to.be.true;
      expect(mockUserRepository.updateRefreshToken.called).to.be.false;
    });
  });

  /* -------------------------------------------------------------------------- */
  /* VERIFY EMAIL                                                               */
  /* -------------------------------------------------------------------------- */
  describe("verifyEmail()", () => {
    it("should successfully verify a user email", async () => {
      mockTokenUtility.verifyToken.returns({ user_id: "mongo-id-123" });
      mockUserRepository.findById.resolves({
        _id: "mongo-id-123",
        is_verified: false,
      });
      mockUserRepository.updateById.resolves();

      const result = await authService.verifyEmail("valid-token");

      expect(result.message).to.equal("Email successfully verified.");
      expect(mockUserRepository.updateById.calledOnce).to.be.true;
    });

    it("should return early if user is already verified", async () => {
      mockTokenUtility.verifyToken.returns({ user_id: "mongo-id-123" });
      mockUserRepository.findById.resolves({ is_verified: true });

      const result = await authService.verifyEmail("token");
      expect(result.message).to.equal("Email is already verified.");
    });
  });

  /* -------------------------------------------------------------------------- */
  /* REFRESH TOKEN                                                              */
  /* -------------------------------------------------------------------------- */
  describe("refreshUserToken()", () => {
    it("should issue new tokens for a valid refresh token", async () => {
      mockTokenUtility.verifyToken.returns({ user_id: "mongo-id-123" });
      mockUserRepository.findById.resolves({
        _id: "mongo-id-123",
        is_suspended: false,
      });
      mockTokenUtility.generateAccessToken.returns("new-access");
      mockTokenUtility.generateRefreshToken.returns("new-refresh");

      const result = await authService.refreshUserToken("valid-refresh");

      expect(result.access_token).to.equal("new-access");
      expect(result.refresh_token).to.equal("new-refresh");
    });
  });

  /* -------------------------------------------------------------------------- */
  /* PASSWORD RESET                                                             */
  /* -------------------------------------------------------------------------- */
  describe("forgotPassword()", () => {
    it("should return success message even if email is missing (Privacy Protection)", async () => {
      mockUserRepository.findByEmailWithPassword.resolves(null);
      const result = await authService.forgotPassword("fake@test.com");
      expect(result.message).to.contain(
        "If that email address is in our database",
      );
    });

    it("should trigger reset email if user exists", async () => {
      mockUserRepository.findByEmailWithPassword.resolves({
        _id: "id",
        email: "test@test.com",
      });
      mockUserRepository.updateById.resolves();
      mockEmailService.sendPasswordResetEmail.resolves();

      const result = await authService.forgotPassword("test@test.com");
      expect(mockEmailService.sendPasswordResetEmail.calledOnce).to.be.true;
    });
  });

  describe("resetPassword()", () => {
    it("should successfully update password with valid token", async () => {
      mockUserRepository.findByPasswordResetToken.resolves({
        _id: "user-1",
        password_reset_expires: Date.now() + 50000,
      });
      mockUserRepository.updateById.resolves();

      const result = await authService.resetPassword("token", "new-pass");

      expect(result.message).to.equal(
        "Password has been successfully reset. You can now log in.",
      );
      expect(mockUserRepository.updateById.calledOnce).to.be.true;
    });

    it("should throw error if token is expired", async () => {
      mockUserRepository.findByPasswordResetToken.resolves({
        password_reset_expires: Date.now() - 50000,
      });

      try {
        await authService.resetPassword("token", "pass");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error.message).to.equal(
          "Invalid or expired password reset token.",
        );
      }
    });
  });
});
