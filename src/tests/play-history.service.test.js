import { expect } from "chai";
import sinon from "sinon";
import PlayHistoryService from "../services/play-history.service.js";
import { NotFoundError } from "../utils/errors.js";

describe("PlayHistoryService Unit Tests", () => {
  let playHistoryService;
  let mockPlayHistoryRepository;
  let mockTrackRepository;

  const MOCK_USER_ID = "507f1f77bcf86cd799439011";
  const MOCK_TRACK_ID = "607f1f77bcf86cd799439033";

  const mockTrack = {
    _id: MOCK_TRACK_ID,
    duration: 180, // 3 minutes
  };

  beforeEach(() => {
    mockPlayHistoryRepository = {
      recordPlay: sinon.stub(),
      getHistory: sinon.stub(),
      getRecentlyPlayed: sinon.stub(),
      clearHistory: sinon.stub(),
    };

    mockTrackRepository = {
      findById: sinon.stub(),
      updateTrackById: sinon.stub(),
    };

    playHistoryService = new PlayHistoryService(
      mockPlayHistoryRepository,
      mockTrackRepository
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("recordPlay()", () => {
    it("should successfully record a play and increment track play count", async () => {
      mockTrackRepository.findById.resolves(mockTrack);
      mockPlayHistoryRepository.recordPlay.resolves({ _id: "history-123" });
      mockTrackRepository.updateTrackById.resolves();

      const durationPlayedMs = 170000; // ~94% of 180s
      const result = await playHistoryService.recordPlay(MOCK_USER_ID, MOCK_TRACK_ID, durationPlayedMs);

      expect(result._id).to.equal("history-123");
      expect(mockTrackRepository.findById.calledOnceWith(MOCK_TRACK_ID)).to.be.true;
      expect(mockPlayHistoryRepository.recordPlay.calledOnce).to.be.true;
      
      // Check if duration was converted to ms correctly (180 * 1000)
      const recordPlayArgs = mockPlayHistoryRepository.recordPlay.firstCall.args;
      expect(recordPlayArgs[3]).to.equal(180000);

      // Check increment
      expect(mockTrackRepository.updateTrackById.calledOnceWith(MOCK_TRACK_ID, sinon.match({ $inc: { play_count: 1 } }))).to.be.true;
    });

    it("should throw NotFoundError if track does not exist", async () => {
      mockTrackRepository.findById.resolves(null);

      try {
        await playHistoryService.recordPlay(MOCK_USER_ID, MOCK_TRACK_ID, 1000);
        expect.fail("Should have thrown NotFoundError");
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
        expect(err.message).to.equal("Track not found");
      }
    });
  });

  describe("getHistory()", () => {
    it("should return history from repository", async () => {
      const mockHistory = { data: [], pagination: {} };
      mockPlayHistoryRepository.getHistory.resolves(mockHistory);

      const result = await playHistoryService.getHistory(MOCK_USER_ID, 1, 10);

      expect(result).to.equal(mockHistory);
      expect(mockPlayHistoryRepository.getHistory.calledOnceWith(MOCK_USER_ID, 1, 10)).to.be.true;
    });
  });

  describe("getRecentlyPlayed()", () => {
    it("should return unique recent tracks from repository", async () => {
      const mockRecent = { data: [], pagination: {} };
      mockPlayHistoryRepository.getRecentlyPlayed.resolves(mockRecent);

      const result = await playHistoryService.getRecentlyPlayed(MOCK_USER_ID, 1, 10);

      expect(result).to.equal(mockRecent);
      expect(mockPlayHistoryRepository.getRecentlyPlayed.calledOnceWith(MOCK_USER_ID, 1, 10)).to.be.true;
    });
  });

  describe("clearHistory()", () => {
    it("should call clearHistory on repository", async () => {
      mockPlayHistoryRepository.clearHistory.resolves();

      await playHistoryService.clearHistory(MOCK_USER_ID);

      expect(mockPlayHistoryRepository.clearHistory.calledOnceWith(MOCK_USER_ID)).to.be.true;
    });
  });
});
