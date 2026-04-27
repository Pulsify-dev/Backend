import { expect } from "chai";
import sinon from "sinon";
import trackService from "../services/track.service.js";
import subscriptionService from "../services/subscription.service.js";
import trackRepository from "../repositories/track.repository.js";
import audioUtils from "../utils/audio.utils.js";
import photoUtils from "../utils/photo.utils.js";
import S3Utils from "../utils/s3.utils.js";
import audioQueueService from "../jobs/audio.queue.js";
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
} from "../utils/errors.utils.js";

const MOCK_USER_ID = "507f1f77bcf86cd799439011";
const MOCK_OTHER_USER_ID = "507f1f77bcf86cd799439022";
const MOCK_TRACK_ID = "607f1f77bcf86cd799439033";

const mockTrack = {
  _id: MOCK_TRACK_ID,
  artist_id: MOCK_USER_ID,
  title: "Test Track",
  genre: "Electronic",
  description: "A test track",
  tags: ["test", "electronic"],
  audio_url: "https://s3.amazonaws.com/audio/test.mp3",
  artwork_url: "https://s3.amazonaws.com/artwork/test.jpg",
  format: "mp3",
  duration: 180,
  file_size_bytes: 5000000,
  bitrate: 320000,
  waveform: [0.1, 0.5, 0.8, 0.3],
  status: "finished",
  visibility: "public",
};

const mockAudioFile = {
  mimetype: "audio/mp3",
  size: 5 * 1024 * 1024, // 5 MB
  buffer: Buffer.from("fake audio data"),
};

const mockCoverFile = {
  mimetype: "image/jpeg",
  size: 2 * 1024 * 1024, // 2 MB
  buffer: Buffer.from("fake image data"),
};

const mockArtworkFile = {
  mimetype: "image/jpeg",
  size: 1 * 1024 * 1024, // 1 MB
  buffer: Buffer.from("fake artwork data"),
};

describe("TrackService", () => {
  afterEach(() => sinon.restore());

  /* -------------------------------------------------------------------------- */
  /* CREATE TRACK                                                               */
  /* -------------------------------------------------------------------------- */
  describe("createTrack()", () => {
    const validTrackData = {
      title: "New Track",
      genre: "Electronic",
      description: "My new track",
      tags: ["electronic", "dance"],
    };

    beforeEach(() => {
      sinon.stub(subscriptionService, "getPlanLimitForUser").resolves({
        effectivePlan: "Free",
        planLimit: {
          can_upload: true,
          upload_track_limit: 3,
        },
      });
      sinon.stub(trackRepository, "countByArtistId").resolves(0);
      sinon.stub(audioQueueService, "addAudioJob").resolves();
    });

    it("should successfully create a new track", async () => {
      sinon.stub(photoUtils, "validateImageFile").returns(true);
      sinon.stub(audioUtils, "extractAudioMetadata").resolves({
        format: "mp3",
        duration: 180,
        bitrate: 320000,
      });
      sinon.stub(S3Utils, "uploadToS3")
        .onFirstCall().resolves("https://s3.amazonaws.com/audio/new.mp3")
        .onSecondCall().resolves("https://s3.amazonaws.com/artwork/new.jpg");
      sinon.stub(trackRepository, "createTrack").resolves({
        ...mockTrack,
        title: validTrackData.title,
      });

      const result = await trackService.createTrack(
        MOCK_USER_ID,
        validTrackData,
        mockAudioFile,
        mockCoverFile
      );

      expect(result.title).to.equal(validTrackData.title);
      expect(trackRepository.createTrack.calledOnce).to.be.true;
    });

    it("should accept preview_start_seconds on create", async () => {
      sinon.stub(photoUtils, "validateImageFile").returns(true);
      sinon.stub(audioUtils, "extractAudioMetadata").resolves({
        format: "mp3",
        duration: 180,
        bitrate: 320000,
      });
      sinon.stub(S3Utils, "uploadToS3")
        .onFirstCall().resolves("https://s3.amazonaws.com/audio/new.mp3")
        .onSecondCall().resolves("https://s3.amazonaws.com/artwork/new.jpg");
      sinon
        .stub(trackRepository, "createTrack")
        .callsFake(async (payload) => payload);

      const result = await trackService.createTrack(
        MOCK_USER_ID,
        {
          ...validTrackData,
          preview_start_seconds: 45,
        },
        mockAudioFile,
        mockCoverFile,
      );

      expect(result.preview_start_seconds).to.equal(45);
    });

    it("should clamp preview_start_seconds on create", async () => {
      sinon.stub(photoUtils, "validateImageFile").returns(true);
      sinon.stub(audioUtils, "extractAudioMetadata").resolves({
        format: "mp3",
        duration: 50,
        bitrate: 320000,
      });
      sinon.stub(S3Utils, "uploadToS3")
        .onFirstCall().resolves("https://s3.amazonaws.com/audio/new.mp3")
        .onSecondCall().resolves("https://s3.amazonaws.com/artwork/new.jpg");
      sinon
        .stub(trackRepository, "createTrack")
        .callsFake(async (payload) => payload);

      const result = await trackService.createTrack(
        MOCK_USER_ID,
        {
          ...validTrackData,
          preview_start_seconds: 100,
        },
        mockAudioFile,
        mockCoverFile,
      );

      expect(result.preview_start_seconds).to.equal(20);
    });

    it("should throw BadRequestError for invalid preview_start_seconds on create", async () => {
      sinon.stub(photoUtils, "validateImageFile").returns(true);
      sinon.stub(audioUtils, "extractAudioMetadata").resolves({
        format: "mp3",
        duration: 180,
        bitrate: 320000,
      });

      try {
        await trackService.createTrack(
          MOCK_USER_ID,
          {
            ...validTrackData,
            preview_start_seconds: "abc",
          },
          mockAudioFile,
          mockCoverFile,
        );
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
        expect(err.message).to.equal("preview_start_seconds must be an integer.");
      }
    });

    it("should throw BadRequestError if audio file is missing", async () => {
      try {
        await trackService.createTrack(MOCK_USER_ID, validTrackData, null, mockCoverFile);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
        expect(err.message).to.equal("Audio file is required.");
      }
    });

    it("should throw BadRequestError if audio format is invalid", async () => {
      const invalidAudioFile = { ...mockAudioFile, mimetype: "audio/ogg" };

      try {
        await trackService.createTrack(MOCK_USER_ID, validTrackData, invalidAudioFile, mockCoverFile);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
        expect(err.message).to.include("Invalid audio format");
      }
    });

    it("should throw BadRequestError if audio file exceeds 30 MB", async () => {
      const oversizedAudioFile = { ...mockAudioFile, size: 35 * 1024 * 1024 }; // 35 MB

      try {
        await trackService.createTrack(MOCK_USER_ID, validTrackData, oversizedAudioFile, mockCoverFile);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
        expect(err.message).to.include("30 MB");
      }
    });

    it("should successfully create a track without a cover file", async () => {
      sinon.stub(audioUtils, "extractAudioMetadata").resolves({
        format: "mp3",
        duration: 180,
        bitrate: 320000,
      });
      sinon.stub(S3Utils, "uploadToS3").resolves("https://s3.amazonaws.com/audio/new.mp3"); // Only audio uploaded
      sinon.stub(trackRepository, "createTrack").resolves({
        ...mockTrack,
        title: validTrackData.title,
        artwork_url: undefined // Default artwork is used
      });

      const result = await trackService.createTrack(MOCK_USER_ID, validTrackData, mockAudioFile, null);

      expect(result.title).to.equal(validTrackData.title);
      expect(trackRepository.createTrack.calledOnce).to.be.true;
    });

    it("should accept exactly 30 MB audio file (boundary)", async () => {
      const boundaryAudioFile = { ...mockAudioFile, size: 30 * 1024 * 1024 }; // exactly 30 MB
      sinon.stub(photoUtils, "validateImageFile").returns(true);
      sinon.stub(audioUtils, "extractAudioMetadata").resolves({
        format: "mp3",
        duration: 180,
        bitrate: 320000,
      });
      sinon.stub(S3Utils, "uploadToS3").resolves("https://s3.amazonaws.com/test.mp3");
      sinon.stub(trackRepository, "createTrack").resolves(mockTrack);

      const result = await trackService.createTrack(
        MOCK_USER_ID,
        validTrackData,
        boundaryAudioFile,
        mockCoverFile
      );

      expect(result).to.have.property("_id");
    });

    it("should throw ForbiddenError when upload quota is reached", async () => {
      trackRepository.countByArtistId.resolves(3);
      sinon.stub(audioUtils, "extractAudioMetadata").resolves({
        format: "mp3",
        duration: 180,
        bitrate: 320000,
      });

      try {
        await trackService.createTrack(
          MOCK_USER_ID,
          validTrackData,
          mockAudioFile,
          null,
        );
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
        expect(err.message).to.equal(
          "Track upload limit reached for Free plan (3 tracks).",
        );
      }
    });

    it("should throw ForbiddenError when plan does not allow uploads", async () => {
      subscriptionService.getPlanLimitForUser.resolves({
        effectivePlan: "Free",
        planLimit: {
          can_upload: false,
          upload_track_limit: 3,
        },
      });
      sinon.stub(audioUtils, "extractAudioMetadata").resolves({
        format: "mp3",
        duration: 180,
        bitrate: 320000,
      });

      try {
        await trackService.createTrack(
          MOCK_USER_ID,
          validTrackData,
          mockAudioFile,
          null,
        );
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
        expect(err.message).to.equal(
          "Track uploads are not available on the Free plan.",
        );
      }
    });

    it("should rollback S3 uploads when DB createTrack throws", async () => {
      sinon.stub(photoUtils, "validateImageFile").returns(true);
      sinon.stub(audioUtils, "extractAudioMetadata").resolves({
        format: "mp3",
        duration: 180,
        bitrate: 320000,
      });
      sinon.stub(S3Utils, "uploadToS3")
        .onFirstCall().resolves("https://s3.amazonaws.com/audio/new.mp3")
        .onSecondCall().resolves("https://s3.amazonaws.com/artwork/new.jpg");
      sinon.stub(trackRepository, "createTrack").rejects(new Error("DB failure"));
      const deleteStub = sinon.stub(S3Utils, "deleteFromS3").resolves();

      try {
        await trackService.createTrack(
          MOCK_USER_ID,
          validTrackData,
          mockAudioFile,
          mockCoverFile,
        );
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err.message).to.equal("DB failure");
        expect(deleteStub.calledTwice).to.be.true;
      }
    });
  });

  describe("createTrackFromUpload()", () => {
    const validTrackData = {
      title: "Inline Track",
      genre: "Electronic",
      description: "Inline upload track",
      tags: ["inline"],
    };

    beforeEach(() => {
      sinon.stub(subscriptionService, "getPlanLimitForUser").resolves({
        effectivePlan: "Artist Pro",
        planLimit: {
          can_upload: true,
          upload_track_limit: null,
        },
      });
      sinon.stub(audioQueueService, "addAudioJob").resolves();
    });

    it("should create a track from explicit file inputs and metadata overrides", async () => {
      sinon.stub(photoUtils, "validateImageFile").returns(true);
      sinon.stub(audioUtils, "extractAudioMetadata").resolves({
        format: "MPEG",
        duration: 181,
        bitrate: 192000,
      });
      sinon.stub(S3Utils, "uploadToS3")
        .onFirstCall().resolves("https://s3.amazonaws.com/tracks/audio/test.mp3")
        .onSecondCall().resolves("https://s3.amazonaws.com/tracks/artwork/test.jpg");
      sinon.stub(trackRepository, "createTrack").callsFake(async (payload) => ({
        _id: "new-track-id",
        ...payload,
      }));

      const result = await trackService.createTrackFromUpload(
        MOCK_USER_ID,
        validTrackData,
        mockAudioFile,
        mockArtworkFile,
      );

      expect(result._id).to.equal("new-track-id");
      expect(trackRepository.createTrack.firstCall.args[0].title).to.equal(
        "Inline Track",
      );
      expect(trackRepository.createTrack.firstCall.args[0].artwork_url).to.equal(
        "https://s3.amazonaws.com/tracks/artwork/test.jpg",
      );
    });

    it("should rollback uploaded files if DB createTrack fails in createTrackFromUpload", async () => {
      sinon.stub(photoUtils, "validateImageFile").returns(true);
      sinon.stub(audioUtils, "extractAudioMetadata").resolves({
        format: "MPEG",
        duration: 181,
        bitrate: 192000,
      });
      sinon.stub(S3Utils, "uploadToS3")
        .onFirstCall().resolves("https://s3.amazonaws.com/tracks/audio/test.mp3")
        .onSecondCall().resolves("https://s3.amazonaws.com/tracks/artwork/test.jpg");
      const deleteStub = sinon.stub(S3Utils, "deleteFromS3").resolves();
      sinon.stub(trackRepository, "createTrack").rejects(new Error("DB down"));

      try {
        await trackService.createTrackFromUpload(
          MOCK_USER_ID,
          validTrackData,
          mockAudioFile,
          mockArtworkFile,
        );
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err.message).to.equal("DB down");
        expect(deleteStub.calledTwice).to.equal(true);
      }
    });

    it("should reuse a provided artwork_url without uploading a cover file", async () => {
      sinon.stub(audioUtils, "extractAudioMetadata").resolves({
        format: "MPEG",
        duration: 181,
        bitrate: 192000,
      });
      const uploadStub = sinon.stub(S3Utils, "uploadToS3")
        .onFirstCall().resolves("https://s3.amazonaws.com/tracks/audio/test.mp3");
      sinon.stub(trackRepository, "createTrack").callsFake(async (payload) => payload);

      const result = await trackService.createTrackFromUpload(
        MOCK_USER_ID,
        {
          ...validTrackData,
          artwork_url: "https://s3.amazonaws.com/albums/artwork/shared.jpg",
        },
        mockAudioFile,
        null,
      );

      expect(result.artwork_url).to.equal(
        "https://s3.amazonaws.com/albums/artwork/shared.jpg",
      );
      expect(uploadStub.calledOnce).to.equal(true);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* GET TRACK BY ID                                                            */
  /* -------------------------------------------------------------------------- */
  describe("getTrackById()", () => {
    it("should return a public track for any user", async () => {
      sinon.stub(trackRepository, "findById").resolves(mockTrack); // Updated from findPublicById to match actual service call

      const result = await trackService.getTrackById(MOCK_TRACK_ID, null);

      expect(result.title).to.equal("Test Track");
      expect(trackRepository.findById.calledOnceWith(MOCK_TRACK_ID)).to.be.true;
    });

    it("should return a private track to its owner", async () => {
      const privateTrack = { ...mockTrack, visibility: "private" };
      sinon.stub(trackRepository, "findById").resolves(privateTrack);

      const result = await trackService.getTrackById(MOCK_TRACK_ID, MOCK_USER_ID);

      expect(result.title).to.equal("Test Track");
    });

    it("should throw ForbiddenError if non-owner tries to access private track", async () => {
      const privateTrack = { ...mockTrack, visibility: "private" };
      sinon.stub(trackRepository, "findById").resolves(privateTrack);

      try {
        await trackService.getTrackById(MOCK_TRACK_ID, MOCK_OTHER_USER_ID);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
        expect(err.message).to.equal("You do not have access to this private track."); // Synced with service
      }
    });

    it("should throw NotFoundError if track does not exist", async () => {
      sinon.stub(trackRepository, "findById").resolves(null); // Updated from findPublicById

      try {
        await trackService.getTrackById(MOCK_TRACK_ID, null);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
        expect(err.message).to.equal("Track not found.");
      }
    });

    it("should throw NotFoundError if authenticated user's track does not exist", async () => {
      sinon.stub(trackRepository, "findById").resolves(null);

      try {
        await trackService.getTrackById(MOCK_TRACK_ID, MOCK_USER_ID);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
      }
    });
  });

  /* -------------------------------------------------------------------------- */
  /* UPDATE TRACK                                                               */
  /* -------------------------------------------------------------------------- */
  describe("updateTrack()", () => {
    it("should update valid fields and return updated track", async () => {
      const updatedTrack = { ...mockTrack, title: "Updated Title" };
      sinon.stub(trackRepository, "findById").resolves(mockTrack);
      sinon.stub(trackRepository, "updateTrackById").resolves(updatedTrack);

      const result = await trackService.updateTrack(MOCK_TRACK_ID, MOCK_USER_ID, {
        title: "Updated Title",
      });

      expect(result.title).to.equal("Updated Title");
    });

    it("should throw NotFoundError if track does not exist", async () => {
      sinon.stub(trackRepository, "findById").resolves(null);

      try {
        await trackService.updateTrack(MOCK_TRACK_ID, MOCK_USER_ID, { title: "New" });
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
      }
    });

    it("should throw ForbiddenError if user is not the owner", async () => {
      sinon.stub(trackRepository, "findById").resolves(mockTrack);

      try {
        await trackService.updateTrack(MOCK_TRACK_ID, MOCK_OTHER_USER_ID, { title: "Hacked" });
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
        expect(err.message).to.equal("You are not the owner of this track.");
      }
    });

    it("should throw BadRequestError if no update data is provided", async () => {
      sinon.stub(trackRepository, "findById").resolves(mockTrack);

      try {
        await trackService.updateTrack(MOCK_TRACK_ID, MOCK_USER_ID, null);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
        expect(err.message).to.equal("No update data provided.");
      }
    });

    it("should throw BadRequestError if no valid fields are provided", async () => {
      sinon.stub(trackRepository, "findById").resolves(mockTrack);

      try {
        await trackService.updateTrack(MOCK_TRACK_ID, MOCK_USER_ID, {
          audio_url: "hacked-url",  // not an allowed field
          artist_id: "hacked-id",   // not an allowed field
        });
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
        expect(err.message).to.equal("No valid fields to update.");
      }
    });

    it("should strip non-allowed fields from update", async () => {
      sinon.stub(trackRepository, "findById").resolves(mockTrack);
      const updateStub = sinon.stub(trackRepository, "updateTrackById").resolves(mockTrack);

      await trackService.updateTrack(MOCK_TRACK_ID, MOCK_USER_ID, {
        title: "Valid Title",
        audio_url: "hacked-url",  // should be stripped
        artist_id: "hacked-id",   // should be stripped
      });

      const calledWith = updateStub.firstCall.args[1];
      expect(calledWith).to.have.property("title", "Valid Title");
      expect(calledWith).to.not.have.property("audio_url");
      expect(calledWith).to.not.have.property("artist_id");
    });

    it("should allow updating visibility field", async () => {
      sinon.stub(trackRepository, "findById").resolves(mockTrack);
      const updateStub = sinon.stub(trackRepository, "updateTrackById").resolves({
        ...mockTrack,
        visibility: "private",
      });

      const result = await trackService.updateTrack(MOCK_TRACK_ID, MOCK_USER_ID, {
        visibility: "private",
      });

      expect(result.visibility).to.equal("private");
    });

    it("should clamp preview_start_seconds on update", async () => {
      const shortTrack = { ...mockTrack, duration: 50 };
      sinon.stub(trackRepository, "findById").resolves(shortTrack);
      const updateStub = sinon.stub(trackRepository, "updateTrackById").resolves({
        ...shortTrack,
        preview_start_seconds: 20,
      });

      await trackService.updateTrack(MOCK_TRACK_ID, MOCK_USER_ID, {
        preview_start_seconds: 100,
      });

      expect(updateStub.firstCall.args[1].preview_start_seconds).to.equal(20);
    });

    it("should throw BadRequestError for invalid preview_start_seconds on update", async () => {
      sinon.stub(trackRepository, "findById").resolves(mockTrack);

      try {
        await trackService.updateTrack(MOCK_TRACK_ID, MOCK_USER_ID, {
          preview_start_seconds: "abc",
        });
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
        expect(err.message).to.equal("preview_start_seconds must be an integer.");
      }
    });
  });

  /* -------------------------------------------------------------------------- */
  /* DELETE TRACK                                                               */
  /* -------------------------------------------------------------------------- */
  describe("deleteTrack()", () => {
    it("should delete track and return confirmation message", async () => {
      sinon.stub(trackRepository, "findById").resolves(mockTrack);
      sinon.stub(S3Utils, "deleteFromS3").resolves();
      sinon.stub(trackRepository, "deleteById").resolves();

      const result = await trackService.deleteTrack(MOCK_TRACK_ID, MOCK_USER_ID);

      expect(result.message).to.equal("Track successfully deleted.");
    });

    it("should throw NotFoundError if track does not exist", async () => {
      sinon.stub(trackRepository, "findById").resolves(null);

      try {
        await trackService.deleteTrack(MOCK_TRACK_ID, MOCK_USER_ID);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
      }
    });

    it("should throw ForbiddenError if user is not the owner", async () => {
      sinon.stub(trackRepository, "findById").resolves(mockTrack);

      try {
        await trackService.deleteTrack(MOCK_TRACK_ID, MOCK_OTHER_USER_ID);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
      }
    });

    it("should delete both audio and artwork from S3", async () => {
      sinon.stub(trackRepository, "findById").resolves(mockTrack);
      const s3Stub = sinon.stub(S3Utils, "deleteFromS3").resolves();
      sinon.stub(trackRepository, "deleteById").resolves();

      await trackService.deleteTrack(MOCK_TRACK_ID, MOCK_USER_ID);

      expect(s3Stub.calledTwice).to.be.true;
    });

    it("should not delete default artwork from S3", async () => {
      const trackWithDefaultArtwork = {
        ...mockTrack,
        artwork_url: "Default.png",
      };
      sinon.stub(trackRepository, "findById").resolves(trackWithDefaultArtwork);
      const s3Stub = sinon.stub(S3Utils, "deleteFromS3").resolves();
      sinon.stub(trackRepository, "deleteById").resolves();

      await trackService.deleteTrack(MOCK_TRACK_ID, MOCK_USER_ID);

      // Should only delete audio, not default artwork
      expect(s3Stub.calledOnce).to.be.true;
    });

    it("should throw UnauthorizedError when userId is falsy", async () => {
      try {
        await trackService.deleteTrack(MOCK_TRACK_ID, null);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(UnauthorizedError);
      }
    });
  });

  /* -------------------------------------------------------------------------- */
  /* GET TRACKS BY ARTIST ID                                                    */
  /* -------------------------------------------------------------------------- */
  describe("getTracksByArtistId()", () => {
    it("should return paginated tracks for an artist", async () => {
      sinon.stub(trackRepository, "findByArtistId").resolves([mockTrack]);
      sinon.stub(trackRepository, "countByArtistId").resolves(1);

      const result = await trackService.getTracksByArtistId(MOCK_USER_ID, 1, 20);

      expect(result.tracks).to.have.lengthOf(1);
      expect(result.total).to.equal(1);
    });

    it("should throw BadRequestError if artist ID is missing", async () => {
      try {
        await trackService.getTracksByArtistId(null, 1, 20);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
        expect(err.message).to.equal("Artist ID is required.");
      }
    });

    it("should return empty array when artist has no tracks", async () => {
      sinon.stub(trackRepository, "findByArtistId").resolves([]);
      sinon.stub(trackRepository, "countByArtistId").resolves(0);

      const result = await trackService.getTracksByArtistId(MOCK_USER_ID, 1, 20);

      expect(result.tracks).to.be.an("array").that.is.empty;
      expect(result.total).to.equal(0);
    });

    it("should pass pagination parameters to repository", async () => {
      const findStub = sinon.stub(trackRepository, "findByArtistId").resolves([]);
      sinon.stub(trackRepository, "countByArtistId").resolves(0);

      await trackService.getTracksByArtistId(MOCK_USER_ID, 2, 10);

      expect(findStub.calledWith(MOCK_USER_ID, 2, 10)).to.be.true;
    });
  });

  /* -------------------------------------------------------------------------- */
  /* GET TRACK STATUS                                                           */
  /* -------------------------------------------------------------------------- */
  describe("getTrackStatus()", () => {
    it("should return track status for the owner", async () => {
      sinon.stub(trackRepository, "findById").resolves(mockTrack);

      const result = await trackService.getTrackStatus(MOCK_TRACK_ID, MOCK_USER_ID);

      expect(result.track_id).to.equal(MOCK_TRACK_ID);
      expect(result.status).to.equal("finished");
      expect(result).to.have.property("progress_percent");
      expect(result).to.have.property("error_message");
    });

    it("should throw NotFoundError if track does not exist", async () => {
      sinon.stub(trackRepository, "findById").resolves(null);

      try {
        await trackService.getTrackStatus(MOCK_TRACK_ID, MOCK_USER_ID);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
      }
    });

    it("should throw ForbiddenError if user is not the owner", async () => {
      sinon.stub(trackRepository, "findById").resolves(mockTrack);

      try {
        await trackService.getTrackStatus(MOCK_TRACK_ID, MOCK_OTHER_USER_ID);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
      }
    });
  });

  /* -------------------------------------------------------------------------- */
  /* GET WAVEFORM                                                               */
  /* -------------------------------------------------------------------------- */
  describe("getWaveform()", () => {
    it("should return waveform data for a track", async () => {
      sinon.stub(trackRepository, "findById").resolves(mockTrack);

      const result = await trackService.getWaveform(MOCK_TRACK_ID);

      expect(result.track_id).to.equal(MOCK_TRACK_ID);
      expect(result.peaks).to.deep.equal(mockTrack.waveform);
      expect(result.samples).to.equal(mockTrack.waveform.length);
    });

    it("should throw NotFoundError if track does not exist", async () => {
      sinon.stub(trackRepository, "findById").resolves(null);

      try {
        await trackService.getWaveform(MOCK_TRACK_ID);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
      }
    });

    it("should return empty peaks array if waveform is not set", async () => {
      const trackWithoutWaveform = { ...mockTrack, waveform: null };
      sinon.stub(trackRepository, "findById").resolves(trackWithoutWaveform);

      const result = await trackService.getWaveform(MOCK_TRACK_ID);

      expect(result.peaks).to.deep.equal([]);
      expect(result.samples).to.equal(0);
    });

    it("should request waveform field explicitly (select: false)", async () => {
      const findStub = sinon.stub(trackRepository, "findById").resolves(mockTrack);

      await trackService.getWaveform(MOCK_TRACK_ID);

      expect(findStub.calledWith(MOCK_TRACK_ID, "+waveform")).to.be.true;
    });
  });

  /* -------------------------------------------------------------------------- */
  /* UPDATE ARTWORK                                                             */
  /* -------------------------------------------------------------------------- */
  describe("updateArtwork()", () => {
    it("should successfully update track artwork", async () => {
      sinon.stub(photoUtils, "validateImageFile").returns(true);
      sinon.stub(trackRepository, "findById").resolves(mockTrack);
      sinon.stub(S3Utils, "deleteFromS3").resolves();
      sinon.stub(S3Utils, "uploadToS3").resolves("https://s3.amazonaws.com/artwork/new.jpg");
      sinon.stub(trackRepository, "updateTrackById").resolves({
        ...mockTrack,
        artwork_url: "https://s3.amazonaws.com/artwork/new.jpg",
      });

      const result = await trackService.updateArtwork(
        MOCK_TRACK_ID,
        MOCK_USER_ID,
        mockArtworkFile
      );

      expect(result.artwork_url).to.equal("https://s3.amazonaws.com/artwork/new.jpg");
    });

    it("should throw BadRequestError if artwork file is missing", async () => {
      try {
        await trackService.updateArtwork(MOCK_TRACK_ID, MOCK_USER_ID, null);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
        expect(err.message).to.equal("Artwork file is required.");
      }
    });

    it("should throw NotFoundError if track does not exist", async () => {
      sinon.stub(photoUtils, "validateImageFile").returns(true);
      sinon.stub(trackRepository, "findById").resolves(null);

      try {
        await trackService.updateArtwork(MOCK_TRACK_ID, MOCK_USER_ID, mockArtworkFile);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
      }
    });

    it("should throw ForbiddenError if user is not the owner", async () => {
      sinon.stub(photoUtils, "validateImageFile").returns(true);
      sinon.stub(trackRepository, "findById").resolves(mockTrack);

      try {
        await trackService.updateArtwork(MOCK_TRACK_ID, MOCK_OTHER_USER_ID, mockArtworkFile);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
      }
    });

    it("should delete old artwork from S3 before uploading new one", async () => {
      sinon.stub(photoUtils, "validateImageFile").returns(true);
      sinon.stub(trackRepository, "findById").resolves(mockTrack);
      const deleteStub = sinon.stub(S3Utils, "deleteFromS3").resolves();
      sinon.stub(S3Utils, "uploadToS3").resolves("https://s3.amazonaws.com/new.jpg");
      sinon.stub(trackRepository, "updateTrackById").resolves(mockTrack);

      await trackService.updateArtwork(MOCK_TRACK_ID, MOCK_USER_ID, mockArtworkFile);

      expect(deleteStub.calledOnce).to.be.true;
      expect(deleteStub.calledWith(mockTrack.artwork_url)).to.be.true;
    });

    it("should not delete default artwork from S3", async () => {
      const trackWithDefaultArtwork = {
        ...mockTrack,
        artwork_url: "Default.png",
      };
      sinon.stub(photoUtils, "validateImageFile").returns(true);
      sinon.stub(trackRepository, "findById").resolves(trackWithDefaultArtwork);
      const deleteStub = sinon.stub(S3Utils, "deleteFromS3").resolves();
      sinon.stub(S3Utils, "uploadToS3").resolves("https://s3.amazonaws.com/new.jpg");
      sinon.stub(trackRepository, "updateTrackById").resolves(mockTrack);

      await trackService.updateArtwork(MOCK_TRACK_ID, MOCK_USER_ID, mockArtworkFile);

      expect(deleteStub.called).to.be.false;
    });

    it("should update artwork_url in database", async () => {
      sinon.stub(photoUtils, "validateImageFile").returns(true);
      sinon.stub(trackRepository, "findById").resolves(mockTrack);
      sinon.stub(S3Utils, "deleteFromS3").resolves();
      sinon.stub(S3Utils, "uploadToS3").resolves("https://s3.amazonaws.com/new.jpg");
      const updateStub = sinon.stub(trackRepository, "updateTrackById").resolves(mockTrack);

      await trackService.updateArtwork(MOCK_TRACK_ID, MOCK_USER_ID, mockArtworkFile);

      const updateArgs = updateStub.firstCall.args[1];
      expect(updateArgs).to.have.property("artwork_url", "https://s3.amazonaws.com/new.jpg");
    });
  });
});
