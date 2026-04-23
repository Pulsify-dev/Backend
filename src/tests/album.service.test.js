import { expect } from "chai";
import sinon from "sinon";
import albumService from "../services/album.service.js";
import trackService from "../services/track.service.js";
import albumRepository from "../repositories/album.repository.js";
import trackRepository from "../repositories/track.repository.js";
import photoUtils from "../utils/photo.utils.js";
import S3Utils from "../utils/s3.utils.js";
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from "../utils/errors.utils.js";

const MOCK_USER_ID = "507f1f77bcf86cd799439011";
const MOCK_OTHER_USER_ID = "507f1f77bcf86cd799439022";
const MOCK_ALBUM_ID = "607f1f77bcf86cd799439033";
const MOCK_TRACK_ID = "707f1f77bcf86cd799439044";

const mockAlbum = {
  _id: MOCK_ALBUM_ID,
  artist_id: MOCK_USER_ID,
  title: "Test Album",
  genre: "Electronic",
  description: "A test album",
  type: "Album",
  visibility: "public",
  is_hidden: false,
  artwork_url: "https://s3.amazonaws.com/artwork/test.jpg",
  tracks: [
    { track_id: { _id: MOCK_TRACK_ID }, position: 0 }
  ],
};

const mockCoverFile = {
  mimetype: "image/jpeg",
  size: 2 * 1024 * 1024,
  buffer: Buffer.from("fake image data"),
};

const mockAudioFile = {
  mimetype: "audio/mp3",
  size: 5 * 1024 * 1024,
  buffer: Buffer.from("fake audio data 1"),
};

const secondMockAudioFile = {
  mimetype: "audio/mp3",
  size: 4 * 1024 * 1024,
  buffer: Buffer.from("fake audio data 2"),
};

describe("AlbumService", () => {
  afterEach(() => sinon.restore());

  describe("createAlbum()", () => {
    it("should successfully create a new album with cover file and initial tracks", async () => {
      sinon.stub(photoUtils, "validateImageFile").returns(true);
      sinon.stub(S3Utils, "uploadToS3").resolves("https://s3.amazonaws.com/artwork/new.jpg");
      sinon.stub(trackRepository, "findById").resolves({ _id: MOCK_TRACK_ID, artist_id: MOCK_USER_ID, duration: 180 });
      sinon.stub(albumRepository, "create").resolves(mockAlbum);

      const result = await albumService.createAlbum(
        MOCK_USER_ID, 
        { title: "Test Album", genre: "Electronic", track_ids: [MOCK_TRACK_ID] }, 
        mockCoverFile
      );
      expect(result.title).to.equal("Test Album");
      expect(albumRepository.create.firstCall.args[0].total_duration).to.equal(180);
      expect(albumRepository.create.firstCall.args[0].track_count).to.equal(1);
    });

    it("should create an album without cover file", async () => {
      sinon.stub(albumRepository, "create").resolves(mockAlbum);

      const result = await albumService.createAlbum(MOCK_USER_ID, { title: "Test Album", genre: "Electronic" }, null);
      expect(result.title).to.equal("Test Album");
    });

    it("should throw BadRequestError if title is missing", async () => {
      try {
        await albumService.createAlbum(MOCK_USER_ID, { genre: "Electronic" }, mockCoverFile);
        expect.fail("Should throw");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
      }
    });

    it("should throw BadRequestError if genre is missing", async () => {
      try {
        await albumService.createAlbum(MOCK_USER_ID, { title: "Test Album" }, mockCoverFile);
        expect.fail("Should throw");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
      }
    });

    it("should create an album with existing track_ids supplied as a JSON string", async () => {
      sinon.stub(trackRepository, "findById")
        .onFirstCall().resolves({ _id: "track-1", artist_id: MOCK_USER_ID, duration: 120 })
        .onSecondCall().resolves({ _id: "track-2", artist_id: MOCK_USER_ID, duration: 200 });
      sinon.stub(albumRepository, "create").resolves(mockAlbum);

      await albumService.createAlbum(
        MOCK_USER_ID,
        {
          title: "Hybrid Album",
          genre: "Electronic",
          track_ids: JSON.stringify(["track-1", "track-2"]),
        },
        null,
        [],
        [],
      );

      expect(albumRepository.create.firstCall.args[0].track_count).to.equal(2);
      expect(albumRepository.create.firstCall.args[0].total_duration).to.equal(320);
    });

    it("should throw BadRequestError when tracks_metadata is malformed JSON", async () => {
      try {
        await albumService.createAlbum(
          MOCK_USER_ID,
          {
            title: "Hybrid Album",
            genre: "Electronic",
            tracks_metadata: "[{bad json]",
          },
          null,
          [],
          [],
        );
        expect.fail("Should throw");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
        expect(err.message).to.equal("tracks_metadata must be a valid JSON array.");
      }
    });

    it("should create an album with brand-new uploaded tracks", async () => {
      sinon.stub(trackService, "createTrackFromUpload")
        .onFirstCall().resolves({ _id: "new-track-1", duration: 111 })
        .onSecondCall().resolves({ _id: "new-track-2", duration: 222 });
      sinon.stub(albumRepository, "create").resolves(mockAlbum);

      await albumService.createAlbum(
        MOCK_USER_ID,
        {
          title: "Hybrid Album",
          genre: "Electronic",
          tracks_metadata: JSON.stringify([
            { title: "Intro", audio_index: 0 },
            { title: "Finale", audio_index: 1 },
          ]),
        },
        null,
        [mockAudioFile, secondMockAudioFile],
        [],
      );

      expect(trackService.createTrackFromUpload.callCount).to.equal(2);
      expect(albumRepository.create.firstCall.args[0].track_count).to.equal(2);
      expect(albumRepository.create.firstCall.args[0].total_duration).to.equal(333);
    });

    it("should append newly uploaded tracks after existing track_ids", async () => {
      sinon.stub(trackRepository, "findById").resolves({
        _id: "existing-1",
        artist_id: MOCK_USER_ID,
        duration: 100,
      });
      sinon.stub(trackService, "createTrackFromUpload").resolves({
        _id: "new-track-1",
        duration: 111,
      });
      sinon.stub(albumRepository, "create").resolves(mockAlbum);

      await albumService.createAlbum(
        MOCK_USER_ID,
        {
          title: "Hybrid Album",
          genre: "Electronic",
          track_ids: JSON.stringify(["existing-1"]),
          tracks_metadata: JSON.stringify([{ title: "Intro", audio_index: 0 }]),
        },
        null,
        [mockAudioFile],
        [],
      );

      expect(
        albumRepository.create.firstCall.args[0].tracks.map((t) => t.track_id),
      ).to.deep.equal(["existing-1", "new-track-1"]);
    });

    it("should pass album artwork to inline tracks when no track artwork is provided", async () => {
      sinon.stub(photoUtils, "validateImageFile").returns(true);
      sinon.stub(S3Utils, "uploadToS3").resolves("https://s3.amazonaws.com/albums/artwork/album.jpg");
      const createTrackStub = sinon.stub(trackService, "createTrackFromUpload").resolves({
        _id: "new-track-1",
        duration: 111,
      });
      sinon.stub(albumRepository, "create").resolves(mockAlbum);

      await albumService.createAlbum(
        MOCK_USER_ID,
        {
          title: "Hybrid Album",
          genre: "Electronic",
          tracks_metadata: JSON.stringify([{ title: "Intro", audio_index: 0 }]),
        },
        mockCoverFile,
        [mockAudioFile],
        [],
      );

      expect(createTrackStub.firstCall.args[1].artwork_url).to.equal(
        "https://s3.amazonaws.com/albums/artwork/album.jpg",
      );
      expect(createTrackStub.firstCall.args[3]).to.equal(undefined);
    });

    it("should throw BadRequestError when audio_index points to a missing upload", async () => {
      try {
        await albumService.createAlbum(
          MOCK_USER_ID,
          {
            title: "Hybrid Album",
            genre: "Electronic",
            tracks_metadata: JSON.stringify([{ title: "Intro", audio_index: 3 }]),
          },
          null,
          [mockAudioFile],
          [],
        );
        expect.fail("Should throw");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
        expect(err.message).to.equal(
          "tracks_metadata[0].audio_index does not match an uploaded audio file.",
        );
      }
    });

    it("should throw BadRequestError when artwork_index points to a missing track artwork upload", async () => {
      try {
        await albumService.createAlbum(
          MOCK_USER_ID,
          {
            title: "Hybrid Album",
            genre: "Electronic",
            tracks_metadata: JSON.stringify([
              { title: "Intro", audio_index: 0, artwork_index: 2 },
            ]),
          },
          null,
          [mockAudioFile],
          [],
        );
        expect.fail("Should throw");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
        expect(err.message).to.equal(
          "tracks_metadata[0].artwork_index does not match an uploaded track artwork file.",
        );
      }
    });

    it("should throw BadRequestError when audio_index is duplicated in the same request", async () => {
      try {
        await albumService.createAlbum(
          MOCK_USER_ID,
          {
            title: "Hybrid Album",
            genre: "Electronic",
            tracks_metadata: JSON.stringify([
              { title: "Intro", audio_index: 0 },
              { title: "Outro", audio_index: 0 },
            ]),
          },
          null,
          [mockAudioFile],
          [],
        );
        expect.fail("Should throw");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
        expect(err.message).to.equal(
          "tracks_metadata[1].audio_index is duplicated in this request.",
        );
      }
    });

    it("should rollback newly created tracks and album artwork if album creation fails", async () => {
      sinon.stub(photoUtils, "validateImageFile").returns(true);
      sinon.stub(S3Utils, "uploadToS3").resolves("https://s3.amazonaws.com/albums/artwork/album.jpg");
      sinon.stub(trackService, "createTrackFromUpload").resolves({
        _id: "new-track-1",
        audio_url: "https://s3.amazonaws.com/tracks/audio/intro.mp3",
        artwork_url: "https://s3.amazonaws.com/albums/artwork/album.jpg",
        duration: 111,
      });
      const deleteTrackStub = sinon.stub(trackRepository, "deleteById").resolves();
      const deleteS3Stub = sinon.stub(S3Utils, "deleteFromS3").resolves();
      sinon.stub(albumRepository, "create").rejects(new Error("album create failed"));

      try {
        await albumService.createAlbum(
          MOCK_USER_ID,
          {
            title: "Hybrid Album",
            genre: "Electronic",
            tracks_metadata: JSON.stringify([{ title: "Intro", audio_index: 0 }]),
          },
          mockCoverFile,
          [mockAudioFile],
          [],
        );
        expect.fail("Should throw");
      } catch (err) {
        expect(err.message).to.equal("album create failed");
        expect(deleteTrackStub.calledWith("new-track-1")).to.equal(true);
        expect(deleteS3Stub.called).to.equal(true);
      }
    });
  });

  describe("getAlbumById()", () => {
    it("should return public album", async () => {
      sinon.stub(albumRepository, "findById").resolves(mockAlbum);
      const result = await albumService.getAlbumById(MOCK_ALBUM_ID);
      expect(result._id).to.equal(MOCK_ALBUM_ID);
    });

    it("should throw NotFoundError if album does not exist", async () => {
      sinon.stub(albumRepository, "findById").resolves(null);
      try {
        await albumService.getAlbumById(MOCK_ALBUM_ID);
        expect.fail();
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
      }
    });

    it("should throw ForbiddenError if album is private and requester is not owner", async () => {
      const privateAlbum = { ...mockAlbum, visibility: "private" };
      sinon.stub(albumRepository, "findById").resolves(privateAlbum);
      try {
        await albumService.getAlbumById(MOCK_ALBUM_ID, MOCK_OTHER_USER_ID);
        expect.fail();
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
      }
    });
  });

  describe("getArtistAlbums()", () => {
    it("should return artist albums", async () => {
      sinon.stub(albumRepository, "findByArtist").resolves({ albums: [mockAlbum], total: 1 });
      const result = await albumService.getArtistAlbums(MOCK_USER_ID, 1, 20);
      expect(result.total).to.equal(1);
    });
  });

  describe("updateAlbum()", () => {
    it("should update an album", async () => {
      sinon.stub(albumRepository, "findById").resolves(mockAlbum);
      sinon.stub(albumRepository, "update").resolves({ ...mockAlbum, title: "Updated" });

      const result = await albumService.updateAlbum(MOCK_USER_ID, MOCK_ALBUM_ID, { title: "Updated" });
      expect(result.title).to.equal("Updated");
    });

    it("should throw ForbiddenError if not owner", async () => {
      sinon.stub(albumRepository, "findById").resolves(mockAlbum);
      try {
        await albumService.updateAlbum(MOCK_OTHER_USER_ID, MOCK_ALBUM_ID, { title: "Updated" });
        expect.fail();
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
      }
    });

    it("should throw BadRequestError if no valid fields", async () => {
      sinon.stub(albumRepository, "findById").resolves(mockAlbum);
      try {
        await albumService.updateAlbum(MOCK_USER_ID, MOCK_ALBUM_ID, { invalid_field: "value" });
        expect.fail();
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
      }
    });
  });

  describe("updateArtwork()", () => {
    it("should update artwork and delete old one", async () => {
      sinon.stub(albumRepository, "findById").resolves(mockAlbum);
      sinon.stub(photoUtils, "validateImageFile").returns(true);
      const deleteStub = sinon.stub(S3Utils, "deleteFromS3").resolves();
      sinon.stub(S3Utils, "uploadToS3").resolves("new-url");
      sinon.stub(albumRepository, "update").resolves({ ...mockAlbum, artwork_url: "new-url" });

      const result = await albumService.updateArtwork(MOCK_USER_ID, MOCK_ALBUM_ID, mockCoverFile);
      expect(result.artwork_url).to.equal("new-url");
      expect(deleteStub.calledOnce).to.be.true;
    });

    it("should throw BadRequestError if cover missing", async () => {
      try {
        await albumService.updateArtwork(MOCK_USER_ID, MOCK_ALBUM_ID, null);
        expect.fail();
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
      }
    });
  });

  describe("deleteAlbum()", () => {
    it("should delete an album", async () => {
      sinon.stub(albumRepository, "findById").resolves(mockAlbum);
      const deleteStub = sinon.stub(S3Utils, "deleteFromS3").resolves();
      sinon.stub(albumRepository, "delete").resolves();

      const result = await albumService.deleteAlbum(MOCK_USER_ID, MOCK_ALBUM_ID);
      expect(result.message).to.equal("Album deleted successfully.");
      expect(deleteStub.calledOnce).to.be.true;
    });
  });

  describe("addTracks()", () => {
    it("should add tracks to album", async () => {
      sinon.stub(albumRepository, "findById").resolves(mockAlbum);
      const track = { _id: "new_track", artist_id: MOCK_USER_ID, duration: 200 };
      sinon.stub(trackRepository, "findById").resolves(track);
      sinon.stub(albumRepository, "addTracks").resolves({ 
        ...mockAlbum, 
        tracks: [...mockAlbum.tracks, { track_id: "new_track", position: 1 }],
        total_duration: (mockAlbum.total_duration || 0) + 200
      });

      const result = await albumService.addTracks(MOCK_USER_ID, MOCK_ALBUM_ID, ["new_track"]);
      expect(result.tracks.length).to.equal(2);
      expect(albumRepository.addTracks.firstCall.args[2]).to.equal((mockAlbum.total_duration || 0) + 200);
    });

    it("should throw BadRequestError if trackIds is empty", async () => {
      try {
        await albumService.addTracks(MOCK_USER_ID, MOCK_ALBUM_ID, []);
        expect.fail();
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
      }
    });

    it("should throw ForbiddenError if track does not belong to owner", async () => {
      sinon.stub(albumRepository, "findById").resolves(mockAlbum);
      const track = { _id: "new_track", artist_id: MOCK_OTHER_USER_ID };
      sinon.stub(trackRepository, "findById").resolves(track);

      try {
        await albumService.addTracks(MOCK_USER_ID, MOCK_ALBUM_ID, ["new_track"]);
        expect.fail();
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
      }
    });

    it("should throw BadRequestError if track is already in album", async () => {
      sinon.stub(albumRepository, "findById").resolves(mockAlbum);
      const track = { _id: MOCK_TRACK_ID, artist_id: MOCK_USER_ID };
      sinon.stub(trackRepository, "findById").resolves(track);

      try {
        await albumService.addTracks(MOCK_USER_ID, MOCK_ALBUM_ID, [MOCK_TRACK_ID]);
        expect.fail();
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
      }
    });
  });

  describe("removeTrack()", () => {
    it("should remove a track", async () => {
      sinon.stub(albumRepository, "findById").resolves(mockAlbum);
      sinon.stub(trackRepository, "findById").resolves({ _id: MOCK_TRACK_ID, duration: 180 });
      sinon.stub(albumRepository, "removeTrack").resolves({ ...mockAlbum, tracks: [], total_duration: 0 });

      const result = await albumService.removeTrack(MOCK_USER_ID, MOCK_ALBUM_ID, MOCK_TRACK_ID);
      expect(result.tracks.length).to.equal(0);
      expect(albumRepository.removeTrack.firstCall.args[2]).to.equal(0);
    });
  });

  describe("reorderTracks()", () => {
    it("should reorder tracks", async () => {
      sinon.stub(albumRepository, "findById").resolves(mockAlbum);
      sinon.stub(albumRepository, "reorderTracks").resolves(mockAlbum);

      const result = await albumService.reorderTracks(MOCK_USER_ID, MOCK_ALBUM_ID, [MOCK_TRACK_ID]);
      expect(result._id).to.equal(MOCK_ALBUM_ID);
    });

    it("should throw BadRequestError if length mismatch", async () => {
      sinon.stub(albumRepository, "findById").resolves(mockAlbum);
      try {
        await albumService.reorderTracks(MOCK_USER_ID, MOCK_ALBUM_ID, [MOCK_TRACK_ID, "extra_track"]);
        expect.fail();
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
      }
    });

    it("should throw BadRequestError if orderedIds are not an array", async () => {
      try {
        await albumService.reorderTracks(MOCK_USER_ID, MOCK_ALBUM_ID, "not-array");
        expect.fail();
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
      }
    });

    it("should throw BadRequestError if orderedIds contains track not in album", async () => {
      sinon.stub(albumRepository, "findById").resolves(mockAlbum);
      try {
        await albumService.reorderTracks(MOCK_USER_ID, MOCK_ALBUM_ID, ["wrong_track_id"]);
        expect.fail();
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
      }
    });
  });
});
