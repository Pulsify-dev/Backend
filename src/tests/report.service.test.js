import { expect } from "chai";
import sinon from "sinon";
import reportService from "../services/report.service.js";
import reportRepository from "../repositories/report.repository.js";
import { BadRequestError } from "../utils/errors.utils.js";

const MOCK_REPORTER_ID = "507f1f77bcf86cd799439011";
const MOCK_TARGET_USER_ID = "607f1f77bcf86cd799439022";
const MOCK_TRACK_ID = "707f1f77bcf86cd799439033";

describe("ReportService", () => {
  afterEach(() => sinon.restore());

  // ───────────────────────────────────────────────────────────────────────────
  // submitReport
  // ───────────────────────────────────────────────────────────────────────────
  describe("submitReport", () => {
    it("should successfully create a report for a Track", async () => {
      const payload = {
        entity_type: "Track",
        entity_id: MOCK_TRACK_ID,
        reason: "Copyright",
        description: "Contains uncleared samples.",
      };

      const mockCreatedReport = {
        _id: "report123",
        reporter_id: MOCK_REPORTER_ID,
        ...payload,
      };

      sinon.stub(reportRepository, "create").resolves(mockCreatedReport);

      const result = await reportService.submitReport(
        MOCK_REPORTER_ID,
        payload,
      );

      expect(result).to.have.property("_id", "report123");
      expect(result.entity_type).to.equal("Track");
      expect(result.reason).to.equal("Copyright");
    });

    it("should throw BadRequestError if a user tries to report their own account", async () => {
      const payload = {
        entity_type: "User",
        entity_id: MOCK_REPORTER_ID, // Matches reporter ID!
        reason: "Spam",
      };

      try {
        await reportService.submitReport(MOCK_REPORTER_ID, payload);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
        expect(err.message).to.include("You cannot report your own account");
      }
    });

    it("should successfully report another user", async () => {
      const payload = {
        entity_type: "User",
        entity_id: MOCK_TARGET_USER_ID, // Different ID, should pass
        reason: "Spam",
      };

      const mockCreatedReport = {
        _id: "report124",
        reporter_id: MOCK_REPORTER_ID,
        ...payload,
      };

      sinon.stub(reportRepository, "create").resolves(mockCreatedReport);

      const result = await reportService.submitReport(
        MOCK_REPORTER_ID,
        payload,
      );

      expect(result.entity_id).to.equal(MOCK_TARGET_USER_ID);
      expect(result.entity_type).to.equal("User");
    });
  });
});
