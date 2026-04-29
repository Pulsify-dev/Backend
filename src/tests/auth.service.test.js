import { expect } from "chai";
import sinon from "sinon";
import bcrypt from "bcryptjs";
import AuthService from "../services/auth.service.js";
import OAuthFactory from "../services/oauth/oauth-factory.service.js";
import playlistRepository from "../repositories/playlist.repository.js";
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} from "../utils/errors.utils.js";

describe("AuthService - 100% Coverage Suite", () => {
  let authService;
  let mockUserRepo, mockTokenUtil, mockEmailSvc, mockCaptchaSvc;

  beforeEach(() => {
    mockUserRepo = {
      create: sinon.stub(),
      findByEmail: sinon.stub(),
      findByEmailWithPassword: sinon.stub(),
      findById: sinon.stub(),
      updateById: sinon.stub(),
      findByPasswordResetToken: sinon.stub(),
      findByRefreshToken: sinon.stub(),
      updateRefreshToken: sinon.stub(),
      findByProviderId: sinon.stub(),
    };

    mockTokenUtil = {
      generateVerificationToken: sinon.stub(),
      generateAccessToken: sinon.stub(),
      generateRefreshToken: sinon.stub(),
      verifyToken: sinon.stub(),
    };

    mockEmailSvc = {
      sendVerificationEmail: sinon.stub(),
      sendPasswordResetEmail: sinon.stub(),
    };

    mockCaptchaSvc = {
      verify: sinon.stub(),
    };

    authService = new AuthService(
      mockUserRepo,
      mockTokenUtil,
      mockEmailSvc,
      mockCaptchaSvc,
    );
    sinon.stub(playlistRepository, "create").resolves();
  });

  afterEach(() => {
    sinon.restore();
  });

  /* -------------------------------------------------------------------------- */
  /* REGISTER USER                                          */
  /* -------------------------------------------------------------------------- */
  describe("registerUser()", () => {
    const userData = {
      email: "test@pulsify.app",
      username: "testuser",
      password: "password",
      captchaToken: "tok",
    };

    it("should successfully register a new user and trigger email (Lines 92-95)", async () => {
      mockCaptchaSvc.verify.resolves(true);
      // Crucial: Must explicitly resolve the create promise to continue execution
      mockUserRepo.create.resolves({ _id: "u123", email: "test@pulsify.app" });
      mockTokenUtil.generateVerificationToken.returns("v-token");
      mockEmailSvc.sendVerificationEmail.resolves(true);

      const result = await authService.registerUser(userData);

      expect(result.user_id).to.equal("u123");
      expect(result.message).to.include("Registration successful");
      expect(mockUserRepo.create.calledOnce).to.be.true;
      expect(
        mockEmailSvc.sendVerificationEmail.calledWith(
          "test@pulsify.app",
          "v-token",
        ),
      ).to.be.true;
    });

    it("should throw BadRequestError if CAPTCHA is invalid", async () => {
      mockCaptchaSvc.verify.resolves(false);
      try {
        await authService.registerUser(userData);
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).to.be.instanceOf(BadRequestError);
        expect(e.message).to.equal("Invalid or expired CAPTCHA token.");
      }
    });

    it("should still succeed even if playlist creation fails", async () => {
      mockCaptchaSvc.verify.resolves(true);
      mockUserRepo.create.resolves({ _id: "u123", email: "test@pulsify.app" });
      playlistRepository.create.rejects(new Error("DB Error"));
      mockTokenUtil.generateVerificationToken.returns("v-token");
      mockEmailSvc.sendVerificationEmail.resolves(true);

      const result = await authService.registerUser(userData);

      expect(result.user_id).to.equal("u123");
    });
  });

  /* -------------------------------------------------------------------------- */
  /* LOGIN USER                                                                 */
  /* -------------------------------------------------------------------------- */
  describe("loginUser()", () => {
    const user = {
      _id: "u1",
      email: "t@p.app",
      tier: "Free",
      role: "user",
      is_suspended: false,
      is_verified: true,
      comparePassword: sinon.stub(),
    };

    it("should return tokens on valid credentials", async () => {
      user.comparePassword.resolves(true);
      mockUserRepo.findByEmailWithPassword.resolves(user);
      mockTokenUtil.generateAccessToken.returns("at");
      mockTokenUtil.generateRefreshToken.returns("rt");
      mockUserRepo.updateRefreshToken.resolves(); // Explicit resolve

      const res = await authService.loginUser("t@p.app", "pass");
      expect(res.access_token).to.equal("at");
      expect(mockUserRepo.updateRefreshToken.calledOnce).to.be.true;
    });

    it("should throw UnauthorizedError if user not found", async () => {
      mockUserRepo.findByEmailWithPassword.resolves(null);
      try {
        await authService.loginUser("t@p.app", "pass");
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).to.be.instanceOf(UnauthorizedError);
      }
    });

    it("should throw ForbiddenError if user is suspended", async () => {
      mockUserRepo.findByEmailWithPassword.resolves({
        ...user,
        is_suspended: true,
      });
      try {
        await authService.loginUser("t@p.app", "pass");
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).to.be.instanceOf(ForbiddenError);
      }
    });

    it("should throw ForbiddenError if user is not verified", async () => {
      mockUserRepo.findByEmailWithPassword.resolves({
        ...user,
        is_verified: false,
      });
      try {
        await authService.loginUser("t@p.app", "pass");
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).to.be.instanceOf(ForbiddenError);
        expect(e.message).to.contain("Please verify your email address");
      }
    });

    it("should throw UnauthorizedError if password invalid", async () => {
      user.comparePassword.resolves(false);
      mockUserRepo.findByEmailWithPassword.resolves(user);
      try {
        await authService.loginUser("t@p.app", "wrong");
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).to.be.instanceOf(UnauthorizedError);
      }
    });
  });

  /* -------------------------------------------------------------------------- */
  /* SOCIAL LOGIN                                */
  /* -------------------------------------------------------------------------- */
  describe("socialLogin()", () => {
    let mockStrat;
    beforeEach(() => {
      mockStrat = { verifyToken: sinon.stub() };
      sinon.stub(OAuthFactory, "getStrategy").returns(mockStrat);
    });

    it("should throw BadRequestError if provider doesn't return email (Line 161-165)", async () => {
      mockStrat.verifyToken.resolves({
        providerId: "g1",
        displayName: "Test",
        avatarUrl: "pic.jpg",
      }); // No email
      try {
        await authService.socialLogin("google", "tok");
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).to.be.instanceOf(BadRequestError);
        expect(e.message).to.contain("must have a verified email");
      }
    });

    it("should login successfully if user exists via provider ID", async () => {
      mockStrat.verifyToken.resolves({
        providerId: "g1",
        email: "e@e.com",
        displayName: "Test",
      });
      mockUserRepo.findByProviderId.resolves({
        _id: "u1",
        tier: "Free",
        is_suspended: false,
      });
      mockTokenUtil.generateAccessToken.returns("at");
      mockTokenUtil.generateRefreshToken.returns("rt");
      mockUserRepo.updateRefreshToken.resolves();

      const res = await authService.socialLogin("google", "tok");
      expect(res.access_token).to.equal("at");
      expect(mockUserRepo.findByProviderId.calledWith("google", "g1")).to.be
        .true;
    });

    it("should link account if user exists via email (Lines 167-173)", async () => {
      mockStrat.verifyToken.resolves({
        providerId: "g1",
        email: "match@test.com",
      });
      mockUserRepo.findByProviderId.resolves(null);
      mockUserRepo.findByEmail.resolves({ _id: "existing-u" });
      mockUserRepo.updateById.resolves({
        _id: "existing-u",
        tier: "Free",
        is_suspended: false,
      });
      mockUserRepo.updateRefreshToken.resolves();

      await authService.socialLogin("google", "tok");
      expect(
        mockUserRepo.updateById.calledWith("existing-u", { google_id: "g1" }),
      ).to.be.true;
    });

    it("should create new user if neither provider ID nor email exists (Lines 178-181)", async () => {
      mockStrat.verifyToken.resolves({
        providerId: "g2",
        email: "new@test.com",
      });
      mockUserRepo.findByProviderId.resolves(null);
      mockUserRepo.findByEmail.resolves(null);
      mockUserRepo.create.resolves({
        _id: "u2",
        tier: "Free",
        is_suspended: false,
      });
      mockUserRepo.updateRefreshToken.resolves();

      await authService.socialLogin("google", "tok");
      expect(mockUserRepo.create.calledOnce).to.be.true;

      const createArgs = mockUserRepo.create.firstCall.args[0];
      expect(createArgs.email).to.equal("new@test.com");
      expect(createArgs.google_id).to.equal("g2");
      expect(createArgs.is_verified).to.be.true;
    });

    it("should create new user and succeed even if playlist creation fails", async () => {
      mockStrat.verifyToken.resolves({
        providerId: "g3",
        email: "fail@test.com",
      });
      mockUserRepo.findByProviderId.resolves(null);
      mockUserRepo.findByEmail.resolves(null);
      mockUserRepo.create.resolves({
        _id: "u3",
        tier: "Free",
        is_suspended: false,
      });
      playlistRepository.create.rejects(new Error("DB Error"));
      mockUserRepo.updateRefreshToken.resolves();

      const res = await authService.socialLogin("google", "tok");
      expect(mockUserRepo.create.calledOnce).to.be.true;
      expect(res).to.have.property("access_token");
    });

    it("should throw ForbiddenError if social user is suspended", async () => {
      mockStrat.verifyToken.resolves({ providerId: "g1", email: "s@s.com" });
      mockUserRepo.findByProviderId.resolves({ _id: "u1", is_suspended: true });
      try {
        await authService.socialLogin("google", "tok");
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).to.be.instanceOf(ForbiddenError);
      }
    });
  });

  /* -------------------------------------------------------------------------- */
  /* VERIFY EMAIL                                                               */
  /* -------------------------------------------------------------------------- */
  describe("verifyEmail()", () => {
    it("should successfully verify email", async () => {
      mockTokenUtil.verifyToken.returns({ user_id: "u1" });
      mockUserRepo.findById.resolves({ _id: "u1", is_verified: false });
      mockUserRepo.updateById.resolves();

      const res = await authService.verifyEmail("tok");
      expect(res.message).to.equal("Email successfully verified.");
    });

    it("should return early if already verified", async () => {
      mockTokenUtil.verifyToken.returns({ user_id: "u1" });
      mockUserRepo.findById.resolves({ is_verified: true });
      const res = await authService.verifyEmail("tok");
      expect(res.message).to.equal("Email is already verified.");
    });

    it("should throw BadRequestError if token is invalid", async () => {
      mockTokenUtil.verifyToken.returns(null);
      try {
        await authService.verifyEmail("bad");
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).to.be.instanceOf(BadRequestError);
      }
    });

    it("should throw NotFoundError if user not found", async () => {
      mockTokenUtil.verifyToken.returns({ user_id: "u1" });
      mockUserRepo.findById.resolves(null);
      try {
        await authService.verifyEmail("tok");
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).to.be.instanceOf(NotFoundError);
      }
    });
  });

  /* -------------------------------------------------------------------------- */
  /* REFRESH TOKEN                                        */
  /* -------------------------------------------------------------------------- */
  describe("refreshUserToken()", () => {
    it("should issue new tokens", async () => {
      mockTokenUtil.verifyToken.returns({ user_id: "u1" });
      mockUserRepo.findById.resolves({
        _id: "u1",
        tier: "Free",
        is_suspended: false,
      });
      mockTokenUtil.generateAccessToken.returns("at-new");
      mockTokenUtil.generateRefreshToken.returns("rt-new");

      const res = await authService.refreshUserToken("rt-valid");
      expect(res.access_token).to.equal("at-new");
      expect(res.refresh_token).to.equal("rt-new");
    });

    it("should throw UnauthorizedError if token is invalid", async () => {
      mockTokenUtil.verifyToken.returns(null);
      try {
        await authService.refreshUserToken("bad");
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).to.be.instanceOf(UnauthorizedError);
      }
    });

    it("should throw NotFoundError if user not found", async () => {
      mockTokenUtil.verifyToken.returns({ user_id: "u1" });
      mockUserRepo.findById.resolves(null);
      try {
        await authService.refreshUserToken("tok");
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).to.be.instanceOf(NotFoundError);
      }
    });

    it("should throw ForbiddenError if user is suspended (Line 222-223)", async () => {
      mockTokenUtil.verifyToken.returns({ user_id: "u1" });
      mockUserRepo.findById.resolves({ _id: "u1", is_suspended: true });
      try {
        await authService.refreshUserToken("tok");
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).to.be.instanceOf(ForbiddenError);
      }
    });
  });

  /* -------------------------------------------------------------------------- */
  /* FORGOT PASSWORD                                      */
  /* -------------------------------------------------------------------------- */
  describe("forgotPassword()", () => {
    it("should send reset email if user exists (Line 208-216)", async () => {
      mockUserRepo.findByEmail.resolves({ _id: "u1", email: "t@p.app" });
      mockUserRepo.updateById.resolves();
      mockEmailSvc.sendPasswordResetEmail.resolves(); // Explicit resolve

      const res = await authService.forgotPassword("t@p.app");
      expect(res.message).to.equal("Check your email.");
      expect(mockUserRepo.updateById.calledOnce).to.be.true;
      expect(mockEmailSvc.sendPasswordResetEmail.calledOnce).to.be.true;
    });

    it("should return privacy message if user not found", async () => {
      mockUserRepo.findByEmail.resolves(null);
      const res = await authService.forgotPassword("ghost@p.app");
      expect(res.message).to.contain("Email sent if account exists");
    });
  });

  /* -------------------------------------------------------------------------- */
  /* RESET PASSWORD                                                             */
  /* -------------------------------------------------------------------------- */
  describe("resetPassword()", () => {
    it("should update password with valid token", async () => {
      mockUserRepo.findByPasswordResetToken.resolves({
        _id: "u1",
        password_reset_expires: Date.now() + 10000,
      });
      sinon.stub(bcrypt, "hash").resolves("hash");
      mockUserRepo.updateById.resolves();

      const res = await authService.resetPassword("tok", "new-p");
      expect(res.message).to.contain("successfully reset");
      expect(mockUserRepo.updateById.calledOnce).to.be.true;
    });

    it("should throw BadRequestError if token expired or invalid", async () => {
      mockUserRepo.findByPasswordResetToken.resolves({
        password_reset_expires: Date.now() - 10000,
      });
      try {
        await authService.resetPassword("tok", "new-p");
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).to.be.instanceOf(BadRequestError);
      }
    });
  });

  /* -------------------------------------------------------------------------- */
  /* LOGOUT USER                                                                */
  /* -------------------------------------------------------------------------- */
  describe("logoutUser()", () => {
    it("should clear refresh token from DB", async () => {
      mockUserRepo.findByRefreshToken.resolves({ _id: "u1" });
      mockUserRepo.updateRefreshToken.resolves();
      const res = await authService.logoutUser("tok");
      expect(res).to.be.true;
      expect(mockUserRepo.updateRefreshToken.calledWith("u1", null)).to.be.true;
    });

    it("should return true even if token not found", async () => {
      mockUserRepo.findByRefreshToken.resolves(null);
      const res = await authService.logoutUser("tok");
      expect(res).to.be.true;
      expect(mockUserRepo.updateRefreshToken.called).to.be.false;
    });
  });

  /* -------------------------------------------------------------------------- */
  /* RESEND VERIFICATION EMAIL                            */
  /* -------------------------------------------------------------------------- */
  describe("resendVerificationEmail()", () => {
    it("should resend email for unverified user (Line 259-264)", async () => {
      mockUserRepo.findByEmail.resolves({
        _id: "u1",
        is_verified: false,
        email: "t@p.app",
      });
      mockTokenUtil.generateVerificationToken.returns("v-tok");
      mockEmailSvc.sendVerificationEmail.resolves(); // Explicit resolve

      const res = await authService.resendVerificationEmail("t@p.app");
      expect(res.message).to.contain("new verification email has been sent");
      expect(mockTokenUtil.generateVerificationToken.calledWith("u1")).to.be
        .true;
      expect(mockEmailSvc.sendVerificationEmail.calledWith("t@p.app", "v-tok"))
        .to.be.true;
    });

    it("should return privacy message if user not found", async () => {
      mockUserRepo.findByEmail.resolves(null);
      const res = await authService.resendVerificationEmail("unknown@test.com");
      expect(res.message).to.contain("If that email is registered");
    });

    it("should throw error with 400 status if already verified", async () => {
      mockUserRepo.findByEmail.resolves({ _id: "u1", is_verified: true });
      try {
        await authService.resendVerificationEmail("t@p.app");
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e.statusCode).to.equal(400);
        expect(e.message).to.contain("already verified");
      }
    });
  });
});
