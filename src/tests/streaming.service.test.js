import { expect } from "chai";
import sinon from "sinon";
import streamingService from "../services/streaming.service.js";
import trackRepository from "../repositories/track.repository.js";
import playHistoryRepository from "../repositories/play-history.repository.js";
import { NotFoundError, ForbiddenError } from "../utils/errors.utils.js";

describe("StreamingService Unit Tests", () => {
  const MOCK_TRACK_ID = "607f1f77bcf86cd799439033";
  const MOCK_USER = { user_id: "507f1f77bcf86cd799439011", tier: "Free" };
  const MOCK_ARTIST_PRO = { user_id: "507f1f77bcf86cd799439022", tier: "Artist Pro" };

  const mockTrack = {
    _id: MOCK_TRACK_ID,
    audio_url: "https://pulsify-s3-dev.s3.amazonaws.com/tracks/audio/track.mp3",
    playback_state: "playable",
    visibility: "public",
    artist_id: "507f1f77bcf86cd799439022", 
    duration: 180,
  };

  afterEach(() => {
    sinon.restore();
  });

  describe("getStreamUrl()", () => {
    it("should return the public S3 URL for a playable track", async () => {
      sinon.stub(trackRepository, "findById").resolves(mockTrack);

      const result = await streamingService.getStreamUrl(MOCK_TRACK_ID, MOCK_USER);

      expect(result.url).to.equal(mockTrack.audio_url);
      expect(result.playback_state).to.equal("playable");
    });

    it("should throw ForbiddenError if track is private and user is not owner", async () => {
      const privateTrack = { ...mockTrack, visibility: "private" };
      sinon.stub(trackRepository, "findById").resolves(privateTrack);

      try {
        await streamingService.getStreamUrl(MOCK_TRACK_ID, MOCK_USER);
        expect.fail("Should have thrown ForbiddenError");
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
        expect(err.message).to.equal("You do not have access to this private track.");
      }
    });

    it("should return stream URL if track is private but user IS owner", async () => {
      const privateTrack = { ...mockTrack, visibility: "private" };
      sinon.stub(trackRepository, "findById").resolves(privateTrack);

      // Caller is the artist
      const artistUser = { user_id: privateTrack.artist_id, tier: "Artist" };
      const result = await streamingService.getStreamUrl(MOCK_TRACK_ID, artistUser);

      expect(result.url).to.equal(mockTrack.audio_url);
    });

    it("should throw ForbiddenError if track is blocked", async () => {
      const blockedTrack = { ...mockTrack, playback_state: "blocked" };
      sinon.stub(trackRepository, "findById").resolves(blockedTrack);

      try {
        await streamingService.getStreamUrl(MOCK_TRACK_ID, MOCK_USER);
        expect.fail("Should have thrown ForbiddenError");
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
      }
    });

    it("should return preview metadata if track is in preview state", async () => {
      const previewTrack = { ...mockTrack, playback_state: "preview" };
      sinon.stub(trackRepository, "findById").resolves(previewTrack);

      const result = await streamingService.getStreamUrl(MOCK_TRACK_ID, MOCK_USER);

      expect(result.playback_state).to.equal("preview");
      expect(result.preview_duration_seconds).to.equal(30);
    });
  });

  describe("getDownloadUrl()", () => {
    it("should return the download URL for Artist Pro users", async () => {
      sinon.stub(trackRepository, "findById").resolves(mockTrack);

      const result = await streamingService.getDownloadUrl(MOCK_TRACK_ID, MOCK_ARTIST_PRO);

      expect(result.url).to.equal(mockTrack.audio_url);
    });

    it("should throw ForbiddenError for non-Artist Pro users", async () => {
      try {
        await streamingService.getDownloadUrl(MOCK_TRACK_ID, MOCK_USER);
        expect.fail("Should have thrown ForbiddenError");
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
        expect(err.message).to.equal("Requires ArtistPro plan.");
      }
    });
  });

  describe("recordPlay()", () => {
    it("should successfully record a play if listened to enough", async () => {
      sinon.stub(trackRepository, "findById").resolves(mockTrack);
      sinon.stub(playHistoryRepository, "recordPlay").resolves({ _id: "history-123" });
      sinon.stub(playHistoryRepository, "incrementTrackPlayCount").resolves();

      const durationPlayedMs = 170000; // meets 50%
      const result = await streamingService.recordPlay(MOCK_USER.user_id, MOCK_TRACK_ID, durationPlayedMs);

      expect(result.counted).to.be.true;
      expect(result.data._id).to.equal("history-123");
      expect(playHistoryRepository.recordPlay.calledOnce).to.be.true;
      expect(playHistoryRepository.incrementTrackPlayCount.calledOnceWith(MOCK_TRACK_ID)).to.be.true;
    });

    it("should return counted: false if listen duration is too short", async () => {
      sinon.stub(trackRepository, "findById").resolves(mockTrack);
      sinon.stub(playHistoryRepository, "recordPlay").resolves();
      sinon.stub(playHistoryRepository, "incrementTrackPlayCount").resolves();

      const durationPlayedMs = 10000; // doesn't meet 50% or 30s
      const result = await streamingService.recordPlay(MOCK_USER.user_id, MOCK_TRACK_ID, durationPlayedMs);

      expect(result.counted).to.be.false;
      expect(playHistoryRepository.recordPlay.called).to.be.false;
      expect(playHistoryRepository.incrementTrackPlayCount.called).to.be.false;
    });

    it("should throw NotFoundError if track does not exist", async () => {
      sinon.stub(trackRepository, "findById").resolves(null);

      try {
        await streamingService.recordPlay(MOCK_USER.user_id, MOCK_TRACK_ID, 100000);
        expect.fail("Should have thrown NotFoundError");
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
      }
    });
  });

  describe("getHistory()", () => {
    it("should return history from repository", async () => {
      const mockHistory = { data: [], pagination: {} };
      sinon.stub(playHistoryRepository, "getHistory").resolves(mockHistory);

      const result = await streamingService.getHistory(MOCK_USER.user_id, 1, 10);

      expect(result).to.equal(mockHistory);
      expect(playHistoryRepository.getHistory.calledOnceWith(MOCK_USER.user_id, 1, 10)).to.be.true;
    });
  });

  describe("getRecentlyPlayed()", () => {
    it("should return unique recent tracks from repository", async () => {
      const mockRecent = { data: [], pagination: {} };
      sinon.stub(playHistoryRepository, "getRecentlyPlayed").resolves(mockRecent);

      const result = await streamingService.getRecentlyPlayed(MOCK_USER.user_id, 1, 10);

      expect(result).to.equal(mockRecent);
      expect(playHistoryRepository.getRecentlyPlayed.calledOnceWith(MOCK_USER.user_id, 1, 10)).to.be.true;
    });
  });

  describe("clearHistory()", () => {
    it("should call clearHistory on repository", async () => {
      sinon.stub(playHistoryRepository, "clearHistory").resolves();

      await streamingService.clearHistory(MOCK_USER.user_id);

      expect(playHistoryRepository.clearHistory.calledOnceWith(MOCK_USER.user_id)).to.be.true;
    });
  });
});
