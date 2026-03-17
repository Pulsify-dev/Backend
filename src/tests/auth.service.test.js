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
    mockUserRepository = {
      emailExists: sinon.stub(),
      usernameExists: sinon.stub(),
      create: sinon.stub(),
      findByEmailWithPassword: sinon.stub(),
      findById: sinon.stub(),
      updateById: sinon.stub(),
      findByPasswordResetToken: sinon.stub(),
    };

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
      expect(
        mockEmailService.sendVerificationEmail.calledOnceWith(
          "test@pulsify.app",
          "fake-jwt-123",
        ),
      ).to.be.true;
    });

    it("should throw an error if CAPTCHA is invalid", async () => {
      mockCaptchaService.verify.resolves(false);

      try {
        await authService.registerUser(validUserData);
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).to.equal("Invalid CAPTCHA token.");
        expect(mockUserRepository.emailExists.called).to.be.false;
      }
    });

    it("should throw an error if email already exists", async () => {
      mockCaptchaService.verify.resolves(true);
      mockUserRepository.emailExists.resolves(true);
      mockUserRepository.usernameExists.resolves(false);

      try {
        await authService.registerUser(validUserData);
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).to.equal("Email or username already exists.");
        expect(mockUserRepository.create.called).to.be.false;
      }
    });
  });

  describe("loginUser()", () => {
    it("should successfully log in a valid user", async () => {
      const fakeUser = {
        _id: "mongo-id-123",
        email: "test@pulsify.app",
        password: "hashedpassword",
        is_suspended: false,
        tier: "Free",
        role: "User",
        comparePassword: sinon.stub().resolves(true),
      };

      mockUserRepository.findByEmailWithPassword.resolves(fakeUser);
      mockTokenUtility.generateAccessToken.returns("access-123");
      mockTokenUtility.generateRefreshToken.returns("refresh-123");

      const result = await authService.loginUser(
        "test@pulsify.app",
        "password123",
      );

      expect(result.access_token).to.equal("access-123");
      expect(result.refresh_token).to.equal("refresh-123");
    });

    it("should throw an error if user is not found", async () => {
      mockUserRepository.findByEmailWithPassword.resolves(null);

      try {
        await authService.loginUser("wrong@pulsify.app", "password123");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error.message).to.equal("Invalid credentials.");
      }
    });

    it("should throw an error if password does not match", async () => {
      const fakeUser = {
        is_suspended: false,
        comparePassword: sinon.stub().resolves(false), // Password mismatch
      };
      mockUserRepository.findByEmailWithPassword.resolves(fakeUser);

      try {
        await authService.loginUser("test@pulsify.app", "wrongpassword");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error.message).to.equal("Invalid credentials.");
      }
    });

    it("should throw an error if user is suspended", async () => {
      const fakeUser = {
        is_suspended: true,
      };
      mockUserRepository.findByEmailWithPassword.resolves(fakeUser);

      try {
        await authService.loginUser("bad@boy.com", "password123");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error.message).to.equal("Forbidden: Suspended account.");
      }
    });
  });

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
      mockUserRepository.findById.resolves({
        _id: "mongo-id-123",
        is_verified: true,
      });

      const result = await authService.verifyEmail("valid-token");

      expect(result.message).to.equal("Email is already verified.");
      expect(mockUserRepository.updateById.called).to.be.false;
    });

    it("should throw error if token is invalid", async () => {
      mockTokenUtility.verifyToken.returns(null);

      try {
        await authService.verifyEmail("bad-token");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error.message).to.equal(
          "Invalid or expired verification token.",
        );
      }
    });

    it("should throw error if user does not exist in db", async () => {
      mockTokenUtility.verifyToken.returns({ user_id: "ghost-id" });
      mockUserRepository.findById.resolves(null);

      try {
        await authService.verifyEmail("valid-token");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error.message).to.equal("User not found.");
      }
    });
  });

  describe("refreshUserToken()", () => {
    it("should issue new tokens for a valid refresh token", async () => {
      mockTokenUtility.verifyToken.returns({ user_id: "mongo-id-123" });
      mockUserRepository.findById.resolves({
        _id: "mongo-id-123",
        is_suspended: false,
        tier: "Free",
        role: "User",
      });
      mockTokenUtility.generateAccessToken.returns("new-access");
      mockTokenUtility.generateRefreshToken.returns("new-refresh");

      const result = await authService.refreshUserToken("valid-refresh");

      expect(result.access_token).to.equal("new-access");
      expect(result.refresh_token).to.equal("new-refresh");
    });

    it("should throw error if user is suspended during token refresh", async () => {
      mockTokenUtility.verifyToken.returns({ user_id: "mongo-id-123" });
      mockUserRepository.findById.resolves({ is_suspended: true });

      try {
        await authService.refreshUserToken("valid-refresh");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error.message).to.equal("Forbidden: Suspended account.");
      }
    });

    it("should throw error if user not found", async () => {
      mockTokenUtility.verifyToken.returns({ user_id: "mongo-id-123" });
      mockUserRepository.findById.resolves(null);

      try {
        await authService.refreshUserToken("valid-refresh");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error.message).to.equal("User not found.");
      }
    });
  });

  describe("forgotPassword()", () => {
    it("should return default message even if email does not exist (Security Best Practice)", async () => {
      mockUserRepository.findByEmailWithPassword.resolves(null);

      const result = await authService.forgotPassword("unknown@pulsify.app");

      expect(result.message).to.contain(
        "If that email address is in our database",
      );
      expect(mockUserRepository.updateById.called).to.be.false;
    });

    it("should trigger a reset email if user exists", async () => {
      mockUserRepository.findByEmailWithPassword.resolves({
        _id: "mongo-id-123",
        email: "test@pulsify.app",
      });
      mockUserRepository.updateById.resolves();
      mockEmailService.sendPasswordResetEmail.resolves();

      const result = await authService.forgotPassword("test@pulsify.app");

      expect(result.message).to.contain(
        "If that email address is in our database",
      );
      expect(mockEmailService.sendPasswordResetEmail.calledOnce).to.be.true;
    });
  });

  describe("resetPassword()", () => {
    it("should successfully update password with valid token", async () => {
      const futureDate = Date.now() + 100000;
      mockUserRepository.findByPasswordResetToken.resolves({
        _id: "mongo-id-123",
        password_reset_expires: futureDate,
      });
      mockUserRepository.updateById.resolves();

      const result = await authService.resetPassword(
        "valid-token",
        "new-password-123",
      );

      expect(result.message).to.equal(
        "Password has been successfully reset. You can now log in.",
      );
      expect(mockUserRepository.updateById.calledOnce).to.be.true;
    });

    it("should throw error if token is expired", async () => {
      const pastDate = Date.now() - 100000;
      mockUserRepository.findByPasswordResetToken.resolves({
        _id: "mongo-id-123",
        password_reset_expires: pastDate,
      });

      try {
        await authService.resetPassword("expired-token", "new-pass");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error.message).to.equal(
          "Invalid or expired password reset token.",
        );
      }
    });

    it("should throw error if token does not exist in database", async () => {
      mockUserRepository.findByPasswordResetToken.resolves(null);

      try {
        await authService.resetPassword("fake-token", "new-pass");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error.message).to.equal(
          "Invalid or expired password reset token.",
        );
      }
    });
  });
});
