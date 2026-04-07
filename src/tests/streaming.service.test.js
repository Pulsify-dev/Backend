import { expect } from "chai";
import sinon from "sinon";
import StreamingService from "../services/streaming.service.js";
import S3Utils from "../utils/s3.utils.js";
import { NotFoundError, ForbiddenError } from "../utils/errors.js";

describe("StreamingService Unit Tests", () => {
  let streamingService;
  let mockTrackRepository;

  const MOCK_TRACK_ID = "607f1f77bcf86cd799439033";
  const MOCK_USER = { user_id: "507f1f77bcf86cd799439011", tier: "Free" };
  const MOCK_ARTIST_PRO = { user_id: "507f1f77bcf86cd799439022", tier: "Artist Pro" };

  const mockTrack = {
    _id: MOCK_TRACK_ID,
    audio_url: "https://s3.amazonaws.com/bucket/track.mp3",
    playback_state: "playable",
  };

  beforeEach(() => {
    mockTrackRepository = {
      findById: sinon.stub(),
    };

    streamingService = new StreamingService(mockTrackRepository);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("getStreamUrl()", () => {
    it("should generate a signed URL for a playable track", async () => {
      mockTrackRepository.findById.resolves(mockTrack);
      sinon.stub(S3Utils, "getPresignedUrl").resolves("https://signed-url.com");

      const result = await streamingService.getStreamUrl(MOCK_TRACK_ID, MOCK_USER);

      expect(result.url).to.equal("https://signed-url.com");
      expect(result.playback_state).to.equal("playable");
      expect(S3Utils.getPresignedUrl.calledOnceWith(mockTrack.audio_url, 900)).to.be.true;
    });

    it("should throw ForbiddenError if track is blocked", async () => {
      const blockedTrack = { ...mockTrack, playback_state: "blocked" };
      mockTrackRepository.findById.resolves(blockedTrack);

      try {
        await streamingService.getStreamUrl(MOCK_TRACK_ID, MOCK_USER);
        expect.fail("Should have thrown ForbiddenError");
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
        expect(err.message).to.equal("Track is blocked.");
      }
    });

    it("should return preview metadata if track is in preview state", async () => {
      const previewTrack = { ...mockTrack, playback_state: "preview" };
      mockTrackRepository.findById.resolves(previewTrack);
      sinon.stub(S3Utils, "getPresignedUrl").resolves("https://signed-url.com");

      const result = await streamingService.getStreamUrl(MOCK_TRACK_ID, MOCK_USER);

      expect(result.playback_state).to.equal("preview");
      expect(result.preview_duration_seconds).to.equal(30);
    });

    it("should throw NotFoundError if track does not exist", async () => {
      mockTrackRepository.findById.resolves(null);

      try {
        await streamingService.getStreamUrl(MOCK_TRACK_ID, MOCK_USER);
        expect.fail("Should have thrown NotFoundError");
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
      }
    });
  });

  describe("getDownloadUrl()", () => {
    it("should generate a download URL for Artist Pro users", async () => {
      mockTrackRepository.findById.resolves(mockTrack);
      sinon.stub(S3Utils, "getPresignedUrl").resolves("https://download-url.com");

      const result = await streamingService.getDownloadUrl(MOCK_TRACK_ID, MOCK_ARTIST_PRO);

      expect(result.url).to.equal("https://download-url.com");
    });

    it("should throw ForbiddenError for non-Artist Pro users", async () => {
      try {
        await streamingService.getDownloadUrl(MOCK_TRACK_ID, MOCK_USER); // MOCK_USER is Free
        expect.fail("Should have thrown ForbiddenError");
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
        expect(err.message).to.equal("Requires Artist Pro plan.");
      }
    });
  });
});
