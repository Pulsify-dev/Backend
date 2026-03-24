import { expect } from "chai";
import sinon from "sinon";
import profileService from "../services/profile.service.js";
import userRepository from "../repositories/user.repository.js";
import emailService from "../services/email.service.js";
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
  ConflictError,
} from "../utils/errors.js";


// ─────────────────────────────────────────────────────────────────────────────
// SHARED MOCK DATA
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_USER_ID = "507f1f77bcf86cd799439011";

const mockPublicUser = {
  _id: MOCK_USER_ID,
  username: "testuser",
  display_name: "Test User",
  bio: "Hello",
  is_verified: false,
  location: "Cairo",
  avatar_url: "avatar.png",
  cover_url: "cover.png",
  track_count: 0,
  followers_count: 0,
  following_count: 0,
  social_links: {},
  tier: "Free",
  favorite_genres: [],
  createdAt: new Date(),
  is_suspended: false,
  is_private: false,
};

const mockPrivateUser = {
  ...mockPublicUser,
  email: "test@test.com",
  is_private: false,
  playlist_count: 0,
  upload_duration_used_seconds: 0,
  storage_used_bytes: 0,
  password: "hashedpassword",
  comparePassword: sinon.stub(),
};

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────
describe("ProfileService", () => {

  afterEach(() => sinon.restore());

  // ───────────────────────────────────────────────────────────────────────────
  // getPublicProfile
  // ───────────────────────────────────────────────────────────────────────────
  describe("getPublicProfile", () => {

    it("should return a public profile for a valid user", async () => {
      sinon.stub(userRepository, "findById").resolves(mockPublicUser);

      const result = await profileService.getPublicProfile(MOCK_USER_ID);

      expect(result).to.include({ username: "testuser" });
      expect(result).to.not.have.property("email");
      expect(result).to.not.have.property("playlist_count");
    });

    it("should throw NotFoundError if user does not exist", async () => {
      sinon.stub(userRepository, "findById").resolves(null);

      try {
        await profileService.getPublicProfile(MOCK_USER_ID);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
        expect(err.statusCode).to.equal(404);
      }
    });

    it("should throw NotFoundError if user is suspended", async () => {
      sinon.stub(userRepository, "findById").resolves({ ...mockPublicUser, is_suspended: true });

      try {
        await profileService.getPublicProfile(MOCK_USER_ID);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
      }
    });

    it("should throw NotFoundError if user profile is private", async () => {
      sinon.stub(userRepository, "findById").resolves({ ...mockPublicUser, is_private: true });

      try {
        await profileService.getPublicProfile(MOCK_USER_ID);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
      }
    });

    it("should not leak suspension status in error message", async () => {
      sinon.stub(userRepository, "findById").resolves({ ...mockPublicUser, is_suspended: true });

      try {
        await profileService.getPublicProfile(MOCK_USER_ID);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err.message).to.not.include("suspended");
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // getMyProfile
  // ───────────────────────────────────────────────────────────────────────────
  describe("getMyProfile", () => {

    it("should return private profile including email and private fields", async () => {
      sinon.stub(userRepository, "findById").resolves(mockPrivateUser);

      const result = await profileService.getMyProfile(MOCK_USER_ID);

      expect(result).to.include({ email: "test@test.com" });
      expect(result).to.have.property("playlist_count");
      expect(result).to.have.property("upload_duration_used_seconds");
      expect(result).to.have.property("storage_used_bytes");
    });

    it("should throw NotFoundError if user does not exist", async () => {
      sinon.stub(userRepository, "findById").resolves(null);

      try {
        await profileService.getMyProfile(MOCK_USER_ID);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
      }
    });

    it("should throw ForbiddenError if user is suspended", async () => {
      sinon.stub(userRepository, "findById").resolves({ ...mockPrivateUser, is_suspended: true });

      try {
        await profileService.getMyProfile(MOCK_USER_ID);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
        expect(err.statusCode).to.equal(403);
      }
    });

    it("should not expose password in returned profile", async () => {
      sinon.stub(userRepository, "findById").resolves(mockPrivateUser);

      const result = await profileService.getMyProfile(MOCK_USER_ID);

      expect(result).to.not.have.property("password");
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // updateMyProfile
  // ───────────────────────────────────────────────────────────────────────────
  describe("updateMyProfile", () => {

    it("should update valid fields and return updated profile", async () => {
      const updatedUser = { ...mockPrivateUser, display_name: "New Name" };
      sinon.stub(userRepository, "updateById").resolves(updatedUser);

      const result = await profileService.updateMyProfile(MOCK_USER_ID, { display_name: "New Name" });

      expect(result.display_name).to.equal("New Name");
    });

    it("should throw BadRequestError if no valid fields are provided", async () => {
      try {
        await profileService.updateMyProfile(MOCK_USER_ID, { email: "hacker@test.com", role: "Admin" });
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
        expect(err.message).to.equal("No valid fields provided.");
      }
    });

    it("should throw BadRequestError if bio exceeds 500 characters", async () => {
      try {
        await profileService.updateMyProfile(MOCK_USER_ID, { bio: "a".repeat(501) });
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
        expect(err.message).to.include("500");
      }
    });

    it("should accept bio of exactly 500 characters", async () => {
      const updatedUser = { ...mockPrivateUser, bio: "a".repeat(500) };
      sinon.stub(userRepository, "updateById").resolves(updatedUser);

      const result = await profileService.updateMyProfile(MOCK_USER_ID, { bio: "a".repeat(500) });

      expect(result.bio).to.have.lengthOf(500);
    });

    it("should strip non-allowed fields from update", async () => {
      const updateStub = sinon.stub(userRepository, "updateById").resolves(mockPrivateUser);

      await profileService.updateMyProfile(MOCK_USER_ID, {
        display_name: "Valid",
        email: "hacker@test.com",   // should be stripped
        role: "Admin",              // should be stripped
      });

      const calledWith = updateStub.firstCall.args[1];
      expect(calledWith).to.have.property("display_name");
      expect(calledWith).to.not.have.property("email");
      expect(calledWith).to.not.have.property("role");
    });

    it("should throw NotFoundError if user does not exist", async () => {
      sinon.stub(userRepository, "updateById").resolves(null);

      try {
        await profileService.updateMyProfile(MOCK_USER_ID, { display_name: "Test" });
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // deleteMyAccount
  // ───────────────────────────────────────────────────────────────────────────
  describe("deleteMyAccount", () => {

    it("should delete account and return confirmation message", async () => {
      const user = { ...mockPrivateUser, comparePassword: sinon.stub().resolves(true) };
      sinon.stub(userRepository, "findById").resolves(user);
      sinon.stub(userRepository, "deleteById").resolves();

      const result = await profileService.deleteMyAccount(MOCK_USER_ID, "password123");

      expect(result.message).to.equal("Account successfully deleted.");
    });

    it("should throw BadRequestError if password is not provided", async () => {
      try {
        await profileService.deleteMyAccount(MOCK_USER_ID, undefined);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
        expect(err.message).to.equal("Current password is required.");
      }
    });

    it("should throw NotFoundError if user does not exist", async () => {
      sinon.stub(userRepository, "findById").resolves(null);

      try {
        await profileService.deleteMyAccount(MOCK_USER_ID, "password123");
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
      }
    });

    it("should throw ForbiddenError if password is incorrect", async () => {
      const user = { ...mockPrivateUser, comparePassword: sinon.stub().resolves(false) };
      sinon.stub(userRepository, "findById").resolves(user);

      try {
        await profileService.deleteMyAccount(MOCK_USER_ID, "wrongpassword");
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
        expect(err.statusCode).to.equal(403);
      }
    });

    it("should call deleteById with correct user id", async () => {
      const user = { ...mockPrivateUser, comparePassword: sinon.stub().resolves(true) };
      sinon.stub(userRepository, "findById").resolves(user);
      const deleteStub = sinon.stub(userRepository, "deleteById").resolves();

      await profileService.deleteMyAccount(MOCK_USER_ID, "password123");

      expect(deleteStub.calledOnceWith(MOCK_USER_ID)).to.be.true;
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // initiateEmailChange
  // ───────────────────────────────────────────────────────────────────────────
  describe("initiateEmailChange", () => {

    it("should initiate email change and send verification email", async () => {
      const user = { ...mockPrivateUser, comparePassword: sinon.stub().resolves(true) };
      sinon.stub(userRepository, "findById").resolves(user);
      sinon.stub(userRepository, "emailExists").resolves(false);
      sinon.stub(userRepository, "updateById").resolves();
      const emailStub = sinon.stub(emailService, "sendEmailChangeVerification").resolves();

      const result = await profileService.initiateEmailChange(
        MOCK_USER_ID, "new@test.com", "password123"
      );

      expect(result.message).to.equal("Check new inbox for verification link.");
      expect(emailStub.calledOnce).to.be.true;
      expect(emailStub.firstCall.args[0]).to.equal("new@test.com");
    });

    it("should throw NotFoundError if user does not exist", async () => {
      sinon.stub(userRepository, "findById").resolves(null);

      try {
        await profileService.initiateEmailChange(MOCK_USER_ID, "new@test.com", "password123");
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
      }
    });

    it("should throw ForbiddenError if password is incorrect", async () => {
      const user = { ...mockPrivateUser, comparePassword: sinon.stub().resolves(false) };
      sinon.stub(userRepository, "findById").resolves(user);

      try {
        await profileService.initiateEmailChange(MOCK_USER_ID, "new@test.com", "wrongpass");
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
        expect(err.statusCode).to.equal(403);
      }
    });

    it("should throw ConflictError if new email is already in use", async () => {
      const user = { ...mockPrivateUser, comparePassword: sinon.stub().resolves(true) };
      sinon.stub(userRepository, "findById").resolves(user);
      sinon.stub(userRepository, "emailExists").resolves(true);

      try {
        await profileService.initiateEmailChange(MOCK_USER_ID, "taken@test.com", "password123");
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(ConflictError);
        expect(err.statusCode).to.equal(409);
      }
    });

    it("should store pending email token in DB", async () => {
      const user = { ...mockPrivateUser, comparePassword: sinon.stub().resolves(true) };
      sinon.stub(userRepository, "findById").resolves(user);
      sinon.stub(userRepository, "emailExists").resolves(false);
      const updateStub = sinon.stub(userRepository, "updateById").resolves();
      sinon.stub(emailService, "sendEmailChangeVerification").resolves();

      await profileService.initiateEmailChange(MOCK_USER_ID, "new@test.com", "password123");

      const updateArgs = updateStub.firstCall.args[1];
      expect(updateArgs).to.have.property("pending_email", "new@test.com");
      expect(updateArgs).to.have.property("pending_email_token");
      expect(updateArgs).to.have.property("pending_email_expires");
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // confirmEmailChange
  // ───────────────────────────────────────────────────────────────────────────
  describe("confirmEmailChange", () => {

    it("should confirm email change and clear pending fields", async () => {
      const user = { ...mockPrivateUser, _id: MOCK_USER_ID, pending_email: "new@test.com" };
      sinon.stub(userRepository, "findUserByPendingEmailToken").resolves(user);
      const updateStub = sinon.stub(userRepository, "updateById").resolves();

      const result = await profileService.confirmEmailChange("validtoken");

      expect(result.message).to.equal("Email address updated successfully.");

      const updateArgs = updateStub.firstCall.args[1];
      expect(updateArgs.email).to.equal("new@test.com");
      expect(updateArgs.pending_email).to.be.null;
      expect(updateArgs.pending_email_token).to.be.null;
      expect(updateArgs.pending_email_expires).to.be.null;
    });

    it("should throw BadRequestError if token is invalid or expired", async () => {
      sinon.stub(userRepository, "findUserByPendingEmailToken").resolves(null);

      try {
        await profileService.confirmEmailChange("invalidtoken");
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
        expect(err.message).to.equal("Invalid or expired email change token.");
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // uploadProfileImage
  // ───────────────────────────────────────────────────────────────────────────
  describe("uploadProfileImage", () => {

    const validAvatarFile = { mimetype: "image/jpeg", size: 1 * 1024 * 1024 }; // 1 MB
    const validCoverFile = { mimetype: "image/png", size: 5 * 1024 * 1024 }; // 5 MB

    it("should upload avatar and return a CDN URL", async () => {
      sinon.stub(userRepository, "updateById").resolves();

      const result = await profileService.uploadProfileImage(MOCK_USER_ID, validAvatarFile, "avatar");

      expect(result).to.have.property("url");
      expect(result.url).to.include("avatar");
    });

    it("should upload cover and return a CDN URL", async () => {
      sinon.stub(userRepository, "updateById").resolves();

      const result = await profileService.uploadProfileImage(MOCK_USER_ID, validCoverFile, "cover");

      expect(result).to.have.property("url");
      expect(result.url).to.include("cover");
    });

    it("should throw BadRequestError if no file is provided", async () => {
      try {
        await profileService.uploadProfileImage(MOCK_USER_ID, null, "avatar");
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
        expect(err.message).to.equal("No file provided.");
      }
    });

    it("should throw BadRequestError for invalid file type", async () => {
      const invalidFile = { mimetype: "image/gif", size: 1 * 1024 * 1024 };

      try {
        await profileService.uploadProfileImage(MOCK_USER_ID, invalidFile, "avatar");
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
        expect(err.message).to.include("Invalid file format");
      }
    });

    it("should throw BadRequestError if avatar exceeds 5 MB", async () => {
      const oversizedFile = { mimetype: "image/jpeg", size: 6 * 1024 * 1024 }; // 6 MB

      try {
        await profileService.uploadProfileImage(MOCK_USER_ID, oversizedFile, "avatar");
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
        expect(err.message).to.include("5 MB");
      }
    });

    it("should throw BadRequestError if cover exceeds 10 MB", async () => {
      const oversizedFile = { mimetype: "image/jpeg", size: 11 * 1024 * 1024 }; // 11 MB

      try {
        await profileService.uploadProfileImage(MOCK_USER_ID, oversizedFile, "cover");
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
        expect(err.message).to.include("10 MB");
      }
    });

    it("should accept exactly 5 MB avatar (boundary)", async () => {
      const boundaryFile = { mimetype: "image/jpeg", size: 5 * 1024 * 1024 }; // exactly 5 MB
      sinon.stub(userRepository, "updateById").resolves();

      const result = await profileService.uploadProfileImage(MOCK_USER_ID, boundaryFile, "avatar");

      expect(result).to.have.property("url");
    });

    it("should update avatar_url in DB for avatar upload", async () => {
      const updateStub = sinon.stub(userRepository, "updateById").resolves();

      await profileService.uploadProfileImage(MOCK_USER_ID, validAvatarFile, "avatar");

      const updateArgs = updateStub.firstCall.args[1];
      expect(updateArgs).to.have.property("avatar_url");
      expect(updateArgs).to.not.have.property("cover_url");
    });

    it("should update cover_url in DB for cover upload", async () => {
      const updateStub = sinon.stub(userRepository, "updateById").resolves();

      await profileService.uploadProfileImage(MOCK_USER_ID, validCoverFile, "cover");

      const updateArgs = updateStub.firstCall.args[1];
      expect(updateArgs).to.have.property("cover_url");
      expect(updateArgs).to.not.have.property("avatar_url");
    });

    it("should accept WebP file format", async () => {
      const webpFile = { mimetype: "image/webp", size: 1 * 1024 * 1024 };
      sinon.stub(userRepository, "updateById").resolves();

      const result = await profileService.uploadProfileImage(MOCK_USER_ID, webpFile, "avatar");

      expect(result).to.have.property("url");
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // searchUsers
  // ───────────────────────────────────────────────────────────────────────────
  describe("searchUsers", () => {

    it("should return paginated user list with correct structure", async () => {
      sinon.stub(userRepository, "searchUsers").resolves({
        users: [mockPublicUser],
        total: 1,
      });

      const result = await profileService.searchUsers("test", 1, 20);

      expect(result).to.have.property("data");
      expect(result).to.have.property("pagination");
      expect(result.pagination).to.deep.equal({ page: 1, limit: 20, total: 1 });
    });

    it("should return empty data array when no users match", async () => {
      sinon.stub(userRepository, "searchUsers").resolves({ users: [], total: 0 });

      const result = await profileService.searchUsers("nonexistent", 1, 20);

      expect(result.data).to.be.an("array").that.is.empty;
      expect(result.pagination.total).to.equal(0);
    });

    it("should use default page=1 and limit=20 when not provided", async () => {
      const searchStub = sinon.stub(userRepository, "searchUsers").resolves({ users: [], total: 0 });

      await profileService.searchUsers();

      expect(searchStub.calledWith(undefined, 1, 20)).to.be.true;
    });

    it("should pass query string to repository", async () => {
      const searchStub = sinon.stub(userRepository, "searchUsers").resolves({ users: [], total: 0 });

      await profileService.searchUsers("alex", 1, 10);

      expect(searchStub.calledWith("alex", 1, 10)).to.be.true;
    });
  });
});