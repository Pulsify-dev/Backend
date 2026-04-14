import { expect } from "chai";
import sinon from "sinon";
import adminService from "../services/admin.service.js";
import userRepository from "../repositories/user.repository.js";
import reportRepository from "../repositories/report.repository.js";
import { NotFoundError, BadRequestError } from "../utils/errors.utils.js";

const MOCK_ADMIN_ID = "507f1f77bcf86cd799439011";
const MOCK_TARGET_USER_ID = "607f1f77bcf86cd799439022";
const MOCK_REPORT_ID = "707f1f77bcf86cd799439033";

const mockUser = {
  _id: MOCK_TARGET_USER_ID,
  username: "targetuser",
  is_suspended: false,
};

const mockReport = {
  _id: MOCK_REPORT_ID,
  status: "Pending",
  reason: "Spam",
  admin_notes: null,
};

describe("AdminService", () => {
  afterEach(() => sinon.restore());

  // ───────────────────────────────────────────────────────────────────────────
  // suspendUser
  // ───────────────────────────────────────────────────────────────────────────
  describe("suspendUser", () => {
    it("should successfully suspend a user", async () => {
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
        expect(err.message).to.include(
          "Admins cannot suspend their own accounts",
        );
      }
    });

    it("should throw NotFoundError if target user does not exist", async () => {
      sinon.stub(userRepository, "updateById").resolves(null);

      try {
        await adminService.suspendUser(MOCK_ADMIN_ID, MOCK_TARGET_USER_ID);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
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
        expect(err.message).to.include(
          "Status must be either 'Resolved' or 'Dismissed'",
        );
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
});
