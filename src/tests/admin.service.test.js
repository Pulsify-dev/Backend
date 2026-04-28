import { expect } from "chai";
import sinon from "sinon";
import adminService from "../services/admin.service.js";
import userRepository from "../repositories/user.repository.js";
import reportRepository from "../repositories/report.repository.js";
import trackRepository from "../repositories/track.repository.js";
import albumRepository from "../repositories/album.repository.js";
import playHistoryRepository from "../repositories/play-history.repository.js";
import S3Utils from "../utils/s3.utils.js";
import { NotFoundError, BadRequestError } from "../utils/errors.utils.js";

const MOCK_ADMIN_ID = "507f1f77bcf86cd799439011";
const MOCK_TARGET_USER_ID = "607f1f77bcf86cd799439022";
const MOCK_REPORT_ID = "707f1f77bcf86cd799439033";
const MOCK_TRACK_ID = "807f1f77bcf86cd799439044";
const MOCK_ALBUM_ID = "907f1f77bcf86cd799439055";

const mockUser = {
  _id: MOCK_TARGET_USER_ID,
  username: "targetuser",
  is_suspended: false,
  role: "User",
};

const mockReport = {
  _id: MOCK_REPORT_ID,
  status: "Pending",
  reason: "Spam",
  admin_notes: null,
};

const mockTrack = {
  _id: MOCK_TRACK_ID,
  title: "Test Track",
  playback_state: "playable",
  artwork_url: "http://example.com/art.png",
  audio_url: "http://example.com/audio.mp3",
};

const mockAlbum = {
  _id: MOCK_ALBUM_ID,
  title: "Test Album",
  is_hidden: false,
  artwork_url: "http://example.com/art.png",
};

describe("AdminService", () => {
  afterEach(() => sinon.restore());

  // ───────────────────────────────────────────────────────────────────────────
  // suspendUser
  // ───────────────────────────────────────────────────────────────────────────
  describe("suspendUser", () => {
    it("should successfully suspend a user", async () => {
      sinon.stub(userRepository, "findById").resolves(mockUser);
      const suspendedUser = { ...mockUser, is_suspended: true };
      sinon.stub(userRepository, "updateById").resolves(suspendedUser);

      const result = await adminService.suspendUser(
        MOCK_ADMIN_ID,
        MOCK_TARGET_USER_ID,
      );

      expect(result.is_suspended).to.be.true;
    });

    it("should throw BadRequestError if admin tries to suspend themselves", async () => {
      try {
        await adminService.suspendUser(MOCK_ADMIN_ID, MOCK_ADMIN_ID);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
        expect(err.message).to.include("Admins cannot suspend their own accounts");
      }
    });

    it("should throw NotFoundError if target user does not exist", async () => {
      sinon.stub(userRepository, "findById").resolves(null);

      try {
        await adminService.suspendUser(MOCK_ADMIN_ID, MOCK_TARGET_USER_ID);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
      }
    });

    it("should throw BadRequestError if target user is an admin", async () => {
      sinon.stub(userRepository, "findById").resolves({ ...mockUser, role: "Admin" });

      try {
        await adminService.suspendUser(MOCK_ADMIN_ID, MOCK_TARGET_USER_ID);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
        expect(err.message).to.include("Cannot suspend another admin");
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // restoreUser
  // ───────────────────────────────────────────────────────────────────────────
  describe("restoreUser", () => {
    it("should successfully restore a suspended user", async () => {
      const restoredUser = { ...mockUser, is_suspended: false };
      sinon.stub(userRepository, "updateById").resolves(restoredUser);

      const result = await adminService.restoreUser(MOCK_TARGET_USER_ID);

      expect(result.is_suspended).to.be.false;
    });

    it("should throw NotFoundError if target user does not exist", async () => {
      sinon.stub(userRepository, "updateById").resolves(null);

      try {
        await adminService.restoreUser(MOCK_TARGET_USER_ID);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // resolveReport
  // ───────────────────────────────────────────────────────────────────────────
  describe("resolveReport", () => {
    it("should successfully resolve a report and save admin notes", async () => {
      const resolvedReport = {
        ...mockReport,
        status: "Resolved",
        admin_notes: "Track deleted.",
      };
      sinon.stub(reportRepository, "updateById").resolves(resolvedReport);

      const result = await adminService.resolveReport(
        MOCK_REPORT_ID,
        "Resolved",
        "Track deleted.",
      );

      expect(result.status).to.equal("Resolved");
      expect(result.admin_notes).to.equal("Track deleted.");
    });

    it("should throw BadRequestError if an invalid status is provided", async () => {
      try {
        await adminService.resolveReport(MOCK_REPORT_ID, "Pending", "Notes");
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
        expect(err.message).to.include("Status must be either 'Resolved' or 'Dismissed'");
      }
    });

    it("should throw NotFoundError if report does not exist", async () => {
      sinon.stub(reportRepository, "updateById").resolves(null);

      try {
        await adminService.resolveReport(MOCK_REPORT_ID, "Resolved", "Notes");
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // getReports
  // ───────────────────────────────────────────────────────────────────────────
  describe("getReports", () => {
    it("should return paginated reports with correct structure", async () => {
      sinon.stub(reportRepository, "findPaginated").resolves({
        reports: [mockReport],
        total: 1,
      });

      const result = await adminService.getReports("Pending", 1, 20);

      expect(result).to.have.property("reports");
      expect(result).to.have.property("total");
      expect(result.total).to.equal(1);
    });

    it("should pass status filter to repository if provided", async () => {
      const searchStub = sinon
        .stub(reportRepository, "findPaginated")
        .resolves({ reports: [], total: 0 });

      await adminService.getReports("Resolved", 2, 10);

      expect(searchStub.firstCall.args[0]).to.deep.equal({
        status: "Resolved",
      });
      expect(searchStub.firstCall.args[1]).to.equal(2);
      expect(searchStub.firstCall.args[2]).to.equal(10);
    });

    it("should pass empty filter to repository if status is not provided", async () => {
      const searchStub = sinon
        .stub(reportRepository, "findPaginated")
        .resolves({ reports: [], total: 0 });

      await adminService.getReports(undefined, 1, 20);

      expect(searchStub.firstCall.args[0]).to.deep.equal({});
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // blockTrack
  // ───────────────────────────────────────────────────────────────────────────
  describe("blockTrack", () => {
    it("should successfully block a track", async () => {
      const blockedTrack = { ...mockTrack, playback_state: "blocked" };
      sinon.stub(trackRepository, "updateTrackById").resolves(blockedTrack);

      const result = await adminService.blockTrack(MOCK_TRACK_ID);
      expect(result.playback_state).to.equal("blocked");
    });

    it("should throw NotFoundError if track not found", async () => {
      sinon.stub(trackRepository, "updateTrackById").resolves(null);

      try {
        await adminService.blockTrack(MOCK_TRACK_ID);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // unblockTrack
  // ───────────────────────────────────────────────────────────────────────────
  describe("unblockTrack", () => {
    it("should successfully unblock a track", async () => {
      const unblockedTrack = { ...mockTrack, playback_state: "playable" };
      sinon.stub(trackRepository, "updateTrackById").resolves(unblockedTrack);

      const result = await adminService.unblockTrack(MOCK_TRACK_ID);
      expect(result.playback_state).to.equal("playable");
    });

    it("should throw NotFoundError if track not found", async () => {
      sinon.stub(trackRepository, "updateTrackById").resolves(null);

      try {
        await adminService.unblockTrack(MOCK_TRACK_ID);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // deleteTrack
  // ───────────────────────────────────────────────────────────────────────────
  describe("deleteTrack", () => {
    it("should delete track and its S3 files if track found", async () => {
      sinon.stub(trackRepository, "findById").resolves(mockTrack);
      const deleteS3Stub = sinon.stub(S3Utils, "deleteFromS3").resolves();
      const deleteTrackStub = sinon.stub(trackRepository, "deleteById").resolves();

      const result = await adminService.deleteTrack(MOCK_TRACK_ID);
      expect(result.message).to.include("successfully deleted");
      expect(deleteS3Stub.calledTwice).to.be.true; // once for artwork, once for audio
      expect(deleteTrackStub.calledOnce).to.be.true;
    });

    it("should delete track but not S3 files if using default artwork and no audio", async () => {
      sinon.stub(trackRepository, "findById").resolves({ ...mockTrack, artwork_url: "Default.png", audio_url: null });
      const deleteS3Stub = sinon.stub(S3Utils, "deleteFromS3").resolves();
      sinon.stub(trackRepository, "deleteById").resolves();

      const result = await adminService.deleteTrack(MOCK_TRACK_ID);
      expect(result.message).to.include("successfully deleted");
      expect(deleteS3Stub.called).to.be.false;
    });

    it("should throw NotFoundError if track not found", async () => {
      sinon.stub(trackRepository, "findById").resolves(null);

      try {
        await adminService.deleteTrack(MOCK_TRACK_ID);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // blockAlbum
  // ───────────────────────────────────────────────────────────────────────────
  describe("blockAlbum", () => {
    it("should successfully block an album", async () => {
      const blockedAlbum = { ...mockAlbum, is_hidden: true };
      sinon.stub(albumRepository, "update").resolves(blockedAlbum);

      const result = await adminService.blockAlbum(MOCK_ALBUM_ID);
      expect(result.is_hidden).to.be.true;
    });

    it("should throw NotFoundError if album not found", async () => {
      sinon.stub(albumRepository, "update").resolves(null);

      try {
        await adminService.blockAlbum(MOCK_ALBUM_ID);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // unblockAlbum
  // ───────────────────────────────────────────────────────────────────────────
  describe("unblockAlbum", () => {
    it("should successfully unblock an album", async () => {
      const unblockedAlbum = { ...mockAlbum, is_hidden: false };
      sinon.stub(albumRepository, "update").resolves(unblockedAlbum);

      const result = await adminService.unblockAlbum(MOCK_ALBUM_ID);
      expect(result.is_hidden).to.be.false;
    });

    it("should throw NotFoundError if album not found", async () => {
      sinon.stub(albumRepository, "update").resolves(null);

      try {
        await adminService.unblockAlbum(MOCK_ALBUM_ID);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // deleteAlbum
  // ───────────────────────────────────────────────────────────────────────────
  describe("deleteAlbum", () => {
    it("should delete album and its S3 artwork if found", async () => {
      sinon.stub(albumRepository, "findById").resolves(mockAlbum);
      const deleteS3Stub = sinon.stub(S3Utils, "deleteFromS3").resolves();
      const deleteAlbumStub = sinon.stub(albumRepository, "delete").resolves();

      const result = await adminService.deleteAlbum(MOCK_ALBUM_ID);
      expect(result.message).to.include("successfully deleted");
      expect(deleteS3Stub.calledOnce).to.be.true;
      expect(deleteAlbumStub.calledOnce).to.be.true;
    });

    it("should delete album but not S3 artwork if using Default.png", async () => {
      sinon.stub(albumRepository, "findById").resolves({ ...mockAlbum, artwork_url: "Default.png" });
      const deleteS3Stub = sinon.stub(S3Utils, "deleteFromS3").resolves();
      sinon.stub(albumRepository, "delete").resolves();

      const result = await adminService.deleteAlbum(MOCK_ALBUM_ID);
      expect(result.message).to.include("successfully deleted");
      expect(deleteS3Stub.called).to.be.false;
    });

    it("should throw NotFoundError if album not found", async () => {
      sinon.stub(albumRepository, "findById").resolves(null);

      try {
        await adminService.deleteAlbum(MOCK_ALBUM_ID);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // updateUserRole
  // ───────────────────────────────────────────────────────────────────────────
  describe("updateUserRole", () => {
    it("should successfully update user role", async () => {
      sinon.stub(userRepository, "findById").resolves(mockUser);
      sinon.stub(userRepository, "updateById").resolves({ ...mockUser, role: "Admin" });

      const result = await adminService.updateUserRole(MOCK_ADMIN_ID, MOCK_TARGET_USER_ID, "Admin");
      expect(result.role).to.equal("Admin");
    });

    it("should throw BadRequestError if admin tries to modify their own role", async () => {
      try {
        await adminService.updateUserRole(MOCK_ADMIN_ID, MOCK_ADMIN_ID, "User");
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
        expect(err.message).to.include("Admins cannot modify their own role");
      }
    });

    it("should throw BadRequestError for invalid role", async () => {
      try {
        await adminService.updateUserRole(MOCK_ADMIN_ID, MOCK_TARGET_USER_ID, "InvalidRole");
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
        expect(err.message).to.include("Invalid role");
      }
    });

    it("should throw NotFoundError if user not found", async () => {
      sinon.stub(userRepository, "findById").resolves(null);

      try {
        await adminService.updateUserRole(MOCK_ADMIN_ID, MOCK_TARGET_USER_ID, "Admin");
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
      }
    });

    it("should throw BadRequestError if trying to promote suspended user to Admin", async () => {
      sinon.stub(userRepository, "findById").resolves({ ...mockUser, is_suspended: true });

      try {
        await adminService.updateUserRole(MOCK_ADMIN_ID, MOCK_TARGET_USER_ID, "Admin");
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
        expect(err.message).to.include("Cannot promote a suspended user");
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // getAnalytics
  // ───────────────────────────────────────────────────────────────────────────
  describe("getAnalytics", () => {
    it("should fetch and return aggregated analytics data", async () => {
      sinon.stub(userRepository, "getUserAdminStats").resolves({ total: 100 });
      sinon.stub(trackRepository, "getTotalStorageUsage").resolves(5000);
      sinon.stub(playHistoryRepository, "getPlatformPlayStats").resolves({ total_plays: 200 });
      sinon.stub(trackRepository, "getTrackModerationStats").resolves({ total_blocked: 5 });
      sinon.stub(albumRepository, "getAlbumModerationStats").resolves({ total_hidden: 2 });
      sinon.stub(reportRepository, "getReportStats").resolves({ pending: 10 });

      const result = await adminService.getAnalytics();
      expect(result.users).to.deep.equal({ total: 100 });
      expect(result.content_moderation.hidden_tracks).to.equal(5);
      expect(result.content_moderation.hidden_albums).to.equal(2);
      expect(result.reports).to.deep.equal({ pending: 10 });
      expect(result.platform.total_storage_bytes).to.equal(5000);
      expect(result.platform.play_statistics.total_plays).to.equal(200);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // getUsers
  // ───────────────────────────────────────────────────────────────────────────
  describe("getUsers", () => {
    it("should pass suspended filter to repository if status is suspended", async () => {
      const searchStub = sinon.stub(userRepository, "findPaginatedUsers").resolves({ users: [], total: 0 });

      await adminService.getUsers("suspended", 1, 10);
      expect(searchStub.firstCall.args[0]).to.deep.equal({ is_suspended: true });
    });

    it("should pass empty filter if status is not suspended", async () => {
      const searchStub = sinon.stub(userRepository, "findPaginatedUsers").resolves({ users: [], total: 0 });

      await adminService.getUsers("active", 1, 10);
      expect(searchStub.firstCall.args[0]).to.deep.equal({});
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // getTracks
  // ───────────────────────────────────────────────────────────────────────────
  describe("getTracks", () => {
    it("should pass blocked filter to repository if status is blocked", async () => {
      const searchStub = sinon.stub(trackRepository, "findPaginatedTracks").resolves({ tracks: [], total: 0 });

      await adminService.getTracks("blocked", 1, 10);
      expect(searchStub.firstCall.args[0]).to.deep.equal({ playback_state: "blocked" });
    });

    it("should pass empty filter if status is not blocked", async () => {
      const searchStub = sinon.stub(trackRepository, "findPaginatedTracks").resolves({ tracks: [], total: 0 });

      await adminService.getTracks("all", 1, 10);
      expect(searchStub.firstCall.args[0]).to.deep.equal({});
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // getAlbums
  // ───────────────────────────────────────────────────────────────────────────
  describe("getAlbums", () => {
    it("should pass hidden filter to repository if status is hidden", async () => {
      const searchStub = sinon.stub(albumRepository, "findPaginatedAlbums").resolves({ albums: [], total: 0 });

      await adminService.getAlbums("hidden", 1, 10);
      expect(searchStub.firstCall.args[0]).to.deep.equal({ is_hidden: true });
    });

    it("should pass empty filter if status is not hidden", async () => {
      const searchStub = sinon.stub(albumRepository, "findPaginatedAlbums").resolves({ albums: [], total: 0 });

      await adminService.getAlbums("all", 1, 10);
      expect(searchStub.firstCall.args[0]).to.deep.equal({});
    });
  });
});
