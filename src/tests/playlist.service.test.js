import { expect } from "chai";
import sinon from "sinon";
import playlistService from "../services/playlist.service.js";
import playlistRepository from "../repositories/playlist.repository.js";
import Track from "../models/track.model.js";
import S3Utils from "../utils/s3.utils.js";
import { NotFoundError, ForbiddenError, BadRequestError } from "../utils/errors.utils.js";

const MOCK_CREATOR_ID = "507f1f77bcf86cd799439011";
const MOCK_OTHER_USER_ID = "607f1f77bcf86cd799439012";
const MOCK_PLAYLIST_ID = "607f1f77bcf86cd799439033";
const MOCK_TRACK_ID = "607f1f77bcf86cd799439044";

const buildPlaylistDoc = (trackCount = 0, ownerId = MOCK_CREATOR_ID, isPrivate = false) => {
  const tracks = Array.from({ length: trackCount }, (_, index) => ({
    track_id: `track-${index}`,
    position: index,
  }));

  const playlistDoc = {
    _id: MOCK_PLAYLIST_ID,
    title: "Test Playlist",
    description: "A test playlist",
    creator_id: {
      toString: () => ownerId.toString(),
    },
    tracks,
    track_count: tracks.length,
    is_private: isPrivate,
    cover_url: "https://example.com/cover.jpg",
    permalink: "test-playlist-123",
    secret_token: "secret-token-123",
    addTrack(trackId) {
      this.tracks.push({
        track_id: trackId,
        position: this.tracks.length,
      });
    },
    removeTrack(trackId) {
      this.tracks = this.tracks.filter((t) => t.track_id.toString() !== trackId.toString());
    },
    reorderTracks(newOrder) {
      const reorderedTracks = newOrder.map((trackId) =>
        this.tracks.find((t) => t.track_id.toString() === trackId.toString())
      );
      this.tracks = reorderedTracks;
    },
    makePrivate() {
      this.is_private = true;
    },
    makePublic() {
      this.is_private = false;
    },
    regenerateSecretToken() {
      this.secret_token = "new-secret-token";
    },
    getEmbedCode(baseUrl) {
      return `<iframe src="${baseUrl}/playlists/${this.permalink}"></iframe>`;
    },
    save: sinon.stub().callsFake(async function () {
      return this;
    }),
  };

  return playlistDoc;
};

describe("PlaylistService Unit Tests", () => {
  afterEach(() => {
    sinon.restore();
  });

  // ===== PLAYLIST CRUD TESTS =====
  describe("createPlaylist()", () => {
    it("should create a playlist with creator and metadata", async () => {
      const playlistData = {
        title: "My Playlist",
        description: "Test playlist",
        is_private: false,
        cover_url: "https://example.com/cover.jpg",
      };

      sinon.stub(playlistRepository, "create").resolves({
        _id: MOCK_PLAYLIST_ID,
        ...playlistData,
        creator_id: MOCK_CREATOR_ID,
      });

      const result = await playlistService.createPlaylist(MOCK_CREATOR_ID, playlistData);

      expect(result._id).to.equal(MOCK_PLAYLIST_ID);
      expect(result.title).to.equal("My Playlist");
      expect(result.creator_id).to.equal(MOCK_CREATOR_ID);
    });
  });

  describe("getPlaylist()", () => {
    it("should retrieve a playlist with tracks", async () => {
      const playlistDoc = buildPlaylistDoc(3, MOCK_CREATOR_ID);

      sinon.stub(playlistRepository, "findWithTracks").resolves(playlistDoc);

      const result = await playlistService.getPlaylist(MOCK_PLAYLIST_ID);

      expect(result._id).to.equal(MOCK_PLAYLIST_ID);
      expect(result.tracks.length).to.equal(3);
    });

    it("should throw NotFoundError if playlist does not exist", async () => {
      sinon.stub(playlistRepository, "findWithTracks").resolves(null);

      try {
        await playlistService.getPlaylist(MOCK_PLAYLIST_ID);
        expect.fail("Should have thrown NotFoundError");
      } catch (error) {
        expect(error).to.be.instanceOf(NotFoundError);
      }
    });
  });

  describe("getPlaylistByPermalink()", () => {
    it("should retrieve a public playlist by permalink", async () => {
      const playlistDoc = buildPlaylistDoc(2, MOCK_CREATOR_ID, false);

      sinon.stub(playlistRepository, "findByPermalink").resolves(playlistDoc);
      sinon.stub(playlistRepository, "findWithTracks").resolves(playlistDoc);

      const result = await playlistService.getPlaylistByPermalink("test-playlist-123");

      expect(result.permalink).to.equal("test-playlist-123");
      expect(result.is_private).to.be.false;
    });

    it("should throw ForbiddenError for private playlist without permission", async () => {
      const playlistDoc = buildPlaylistDoc(2, MOCK_OTHER_USER_ID, true);

      sinon.stub(playlistRepository, "findByPermalink").resolves(playlistDoc);

      try {
        await playlistService.getPlaylistByPermalink("private-playlist");
        expect.fail("Should have thrown ForbiddenError");
      } catch (error) {
        expect(error).to.be.instanceOf(ForbiddenError);
        expect(error.message).to.include("private");
      }
    });

    it("should throw NotFoundError if playlist does not exist", async () => {
      sinon.stub(playlistRepository, "findByPermalink").resolves(null);

      try {
        await playlistService.getPlaylistByPermalink("nonexistent");
        expect.fail("Should have thrown NotFoundError");
      } catch (error) {
        expect(error).to.be.instanceOf(NotFoundError);
      }
    });
  });

  describe("getPlaylistBySecretToken()", () => {
    it("should retrieve a private playlist with valid secret token", async () => {
      const playlistDoc = buildPlaylistDoc(2, MOCK_CREATOR_ID, true);

      sinon.stub(playlistRepository, "findBySecretToken").resolves(playlistDoc);
      sinon.stub(playlistRepository, "findWithTracks").resolves(playlistDoc);

      const result = await playlistService.getPlaylistBySecretToken("secret-token-123", MOCK_PLAYLIST_ID);

      expect(result._id).to.equal(MOCK_PLAYLIST_ID);
      expect(result.is_private).to.be.true;
    });

    it("should throw ForbiddenError with invalid secret token", async () => {
      sinon.stub(playlistRepository, "findBySecretToken").resolves(null);

      try {
        await playlistService.getPlaylistBySecretToken("invalid-token");
        expect.fail("Should have thrown ForbiddenError");
      } catch (error) {
        expect(error).to.be.instanceOf(ForbiddenError);
      }
    });

    it("should throw ForbiddenError if token does not match playlist", async () => {
      const playlistDoc = buildPlaylistDoc(2, MOCK_CREATOR_ID, true);
      playlistDoc._id = "different-playlist-id";

      sinon.stub(playlistRepository, "findBySecretToken").resolves(playlistDoc);

      try {
        await playlistService.getPlaylistBySecretToken("secret-token-123", MOCK_PLAYLIST_ID);
        expect.fail("Should have thrown ForbiddenError");
      } catch (error) {
        expect(error).to.be.instanceOf(ForbiddenError);
      }
    });
  });

  describe("updatePlaylist()", () => {
    it("should update playlist title and description if owner", async () => {
      const playlistDoc = buildPlaylistDoc(2, MOCK_CREATOR_ID);

      sinon.stub(playlistRepository, "findById").resolves(playlistDoc);

      const result = await playlistService.updatePlaylist(MOCK_PLAYLIST_ID, MOCK_CREATOR_ID, {
        title: "Updated Title",
        description: "Updated Description",
      });

      expect(result.title).to.equal("Updated Title");
      expect(result.description).to.equal("Updated Description");
      expect(playlistDoc.save.calledOnce).to.be.true;
    });

    it("should throw ForbiddenError if not owner", async () => {
      const playlistDoc = buildPlaylistDoc(2, MOCK_CREATOR_ID);

      sinon.stub(playlistRepository, "findById").resolves(playlistDoc);

      try {
        await playlistService.updatePlaylist(MOCK_PLAYLIST_ID, MOCK_OTHER_USER_ID, {
          title: "Hacked",
        });
        expect.fail("Should have thrown ForbiddenError");
      } catch (error) {
        expect(error).to.be.instanceOf(ForbiddenError);
      }
    });

    it("should throw NotFoundError if playlist does not exist", async () => {
      sinon.stub(playlistRepository, "findById").resolves(null);

      try {
        await playlistService.updatePlaylist(MOCK_PLAYLIST_ID, MOCK_CREATOR_ID, {
          title: "Test",
        });
        expect.fail("Should have thrown NotFoundError");
      } catch (error) {
        expect(error).to.be.instanceOf(NotFoundError);
      }
    });
  });

  describe("deletePlaylist()", () => {
    it("should delete playlist if owner", async () => {
      const playlistDoc = buildPlaylistDoc(2, MOCK_CREATOR_ID);

      sinon.stub(playlistRepository, "findById").resolves(playlistDoc);
      sinon.stub(S3Utils, "deleteFromS3").resolves();
      sinon.stub(playlistRepository, "deleteById").resolves({ deletedCount: 1 });

      const result = await playlistService.deletePlaylist(MOCK_PLAYLIST_ID, MOCK_CREATOR_ID);

      expect(result.deletedCount).to.equal(1);
    });

    it("should throw ForbiddenError if not owner", async () => {
      const playlistDoc = buildPlaylistDoc(2, MOCK_CREATOR_ID);

      sinon.stub(playlistRepository, "findById").resolves(playlistDoc);

      try {
        await playlistService.deletePlaylist(MOCK_PLAYLIST_ID, MOCK_OTHER_USER_ID);
        expect.fail("Should have thrown ForbiddenError");
      } catch (error) {
        expect(error).to.be.instanceOf(ForbiddenError);
      }
    });

    it("should throw NotFoundError if playlist does not exist", async () => {
      sinon.stub(playlistRepository, "findById").resolves(null);

      try {
        await playlistService.deletePlaylist(MOCK_PLAYLIST_ID, MOCK_CREATOR_ID);
        expect.fail("Should have thrown NotFoundError");
      } catch (error) {
        expect(error).to.be.instanceOf(NotFoundError);
      }
    });
  });

  describe("getUserPlaylists()", () => {
    it("should retrieve all playlists for a user with pagination", async () => {
      const playlists = [
        buildPlaylistDoc(2, MOCK_CREATOR_ID),
        buildPlaylistDoc(3, MOCK_CREATOR_ID),
      ];

      sinon.stub(playlistRepository, "findByCreatorId").resolves(playlists);

      const result = await playlistService.getUserPlaylists(MOCK_CREATOR_ID, { skip: 0, limit: 20 });

      expect(result.length).to.equal(2);
    });
  });

  // ===== TRACK MANAGEMENT TESTS =====
  describe("addTrackToPlaylist()", () => {
    it("should add a track to playlist if owner", async () => {
      const playlistDoc = buildPlaylistDoc(2, MOCK_CREATOR_ID);

      sinon.stub(playlistRepository, "findById").resolves(playlistDoc);
      sinon.stub(Track, "findById").resolves({ _id: MOCK_TRACK_ID });

      const result = await playlistService.addTrackToPlaylist(
        MOCK_PLAYLIST_ID,
        MOCK_TRACK_ID,
        MOCK_CREATOR_ID
      );

      expect(result.track_count).to.equal(3);
      expect(playlistDoc.save.calledOnce).to.be.true;
    });

    it("should throw ForbiddenError if not owner", async () => {
      const playlistDoc = buildPlaylistDoc(2, MOCK_CREATOR_ID);

      sinon.stub(playlistRepository, "findById").resolves(playlistDoc);

      try {
        await playlistService.addTrackToPlaylist(MOCK_PLAYLIST_ID, MOCK_TRACK_ID, MOCK_OTHER_USER_ID);
        expect.fail("Should have thrown ForbiddenError");
      } catch (error) {
        expect(error).to.be.instanceOf(ForbiddenError);
      }
    });

    it("should throw NotFoundError if track does not exist", async () => {
      const playlistDoc = buildPlaylistDoc(2, MOCK_CREATOR_ID);

      sinon.stub(playlistRepository, "findById").resolves(playlistDoc);
      sinon.stub(Track, "findById").resolves(null);

      try {
        await playlistService.addTrackToPlaylist(MOCK_PLAYLIST_ID, MOCK_TRACK_ID, MOCK_CREATOR_ID);
        expect.fail("Should have thrown NotFoundError");
      } catch (error) {
        expect(error).to.be.instanceOf(NotFoundError);
      }
    });
  });

  describe("removeTrackFromPlaylist()", () => {
    it("should remove a track from playlist if owner", async () => {
      const playlistDoc = buildPlaylistDoc(3, MOCK_CREATOR_ID);

      sinon.stub(playlistRepository, "findById").resolves(playlistDoc);

      const result = await playlistService.removeTrackFromPlaylist(
        MOCK_PLAYLIST_ID,
        "track-0",
        MOCK_CREATOR_ID
      );

      expect(result.track_count).to.equal(2);
      expect(playlistDoc.save.calledOnce).to.be.true;
    });

    it("should throw ForbiddenError if not owner", async () => {
      const playlistDoc = buildPlaylistDoc(3, MOCK_CREATOR_ID);

      sinon.stub(playlistRepository, "findById").resolves(playlistDoc);

      try {
        await playlistService.removeTrackFromPlaylist(MOCK_PLAYLIST_ID, "track-0", MOCK_OTHER_USER_ID);
        expect.fail("Should have thrown ForbiddenError");
      } catch (error) {
        expect(error).to.be.instanceOf(ForbiddenError);
      }
    });
  });

  describe("reorderTracks()", () => {
    it("should reorder tracks if owner", async () => {
      const playlistDoc = buildPlaylistDoc(3, MOCK_CREATOR_ID);

      sinon.stub(playlistRepository, "findById").resolves(playlistDoc);

      const newOrder = ["track-2", "track-0", "track-1"];
      const result = await playlistService.reorderTracks(MOCK_PLAYLIST_ID, MOCK_CREATOR_ID, newOrder);

      expect(result.tracks[0].track_id).to.equal("track-2");
      expect(playlistDoc.save.calledOnce).to.be.true;
    });

    it("should throw BadRequestError if order array length does not match", async () => {
      const playlistDoc = buildPlaylistDoc(3, MOCK_CREATOR_ID);

      sinon.stub(playlistRepository, "findById").resolves(playlistDoc);

      try {
        await playlistService.reorderTracks(MOCK_PLAYLIST_ID, MOCK_CREATOR_ID, ["track-0", "track-1"]);
        expect.fail("Should have thrown BadRequestError");
      } catch (error) {
        expect(error).to.be.instanceOf(BadRequestError);
      }
    });

    it("should throw BadRequestError if order is not an array", async () => {
      const playlistDoc = buildPlaylistDoc(3, MOCK_CREATOR_ID);

      sinon.stub(playlistRepository, "findById").resolves(playlistDoc);

      try {
        await playlistService.reorderTracks(MOCK_PLAYLIST_ID, MOCK_CREATOR_ID, "not-an-array");
        expect.fail("Should have thrown BadRequestError");
      } catch (error) {
        expect(error).to.be.instanceOf(BadRequestError);
      }
    });
  });

  describe("moveTrack()", () => {
    it("should move a track to new position if owner", async () => {
      const playlistDoc = buildPlaylistDoc(3, MOCK_CREATOR_ID);

      sinon.stub(playlistRepository, "findById").resolves(playlistDoc);

      const result = await playlistService.moveTrack(
        MOCK_PLAYLIST_ID,
        "track-0",
        2,
        MOCK_CREATOR_ID
      );

      expect(result.tracks[2].track_id).to.equal("track-0");
      expect(playlistDoc.save.calledOnce).to.be.true;
    });

    it("should throw BadRequestError if position is invalid", async () => {
      const playlistDoc = buildPlaylistDoc(3, MOCK_CREATOR_ID);

      sinon.stub(playlistRepository, "findById").resolves(playlistDoc);

      try {
        await playlistService.moveTrack(MOCK_PLAYLIST_ID, "track-0", 10, MOCK_CREATOR_ID);
        expect.fail("Should have thrown BadRequestError");
      } catch (error) {
        expect(error).to.be.instanceOf(BadRequestError);
      }
    });

    it("should throw NotFoundError if track not in playlist", async () => {
      const playlistDoc = buildPlaylistDoc(3, MOCK_CREATOR_ID);

      sinon.stub(playlistRepository, "findById").resolves(playlistDoc);

      try {
        await playlistService.moveTrack(MOCK_PLAYLIST_ID, "nonexistent-track", 1, MOCK_CREATOR_ID);
        expect.fail("Should have thrown NotFoundError");
      } catch (error) {
        expect(error).to.be.instanceOf(NotFoundError);
      }
    });
  });

  // ===== PRIVACY & TOKENS TESTS =====
  describe("updatePlaylistPrivacy()", () => {
    it("should make playlist private if owner", async () => {
      const playlistDoc = buildPlaylistDoc(2, MOCK_CREATOR_ID, false);

      sinon.stub(playlistRepository, "findById").resolves(playlistDoc);

      const result = await playlistService.updatePlaylistPrivacy(
        MOCK_PLAYLIST_ID,
        MOCK_CREATOR_ID,
        true
      );

      expect(result.is_private).to.be.true;
      expect(playlistDoc.save.calledOnce).to.be.true;
    });

    it("should make playlist public if owner", async () => {
      const playlistDoc = buildPlaylistDoc(2, MOCK_CREATOR_ID, true);

      sinon.stub(playlistRepository, "findById").resolves(playlistDoc);

      const result = await playlistService.updatePlaylistPrivacy(
        MOCK_PLAYLIST_ID,
        MOCK_CREATOR_ID,
        false
      );

      expect(result.is_private).to.be.false;
    });

    it("should throw ForbiddenError if not owner", async () => {
      const playlistDoc = buildPlaylistDoc(2, MOCK_CREATOR_ID);

      sinon.stub(playlistRepository, "findById").resolves(playlistDoc);

      try {
        await playlistService.updatePlaylistPrivacy(MOCK_PLAYLIST_ID, MOCK_OTHER_USER_ID, true);
        expect.fail("Should have thrown ForbiddenError");
      } catch (error) {
        expect(error).to.be.instanceOf(ForbiddenError);
      }
    });
  });

  describe("regeneratePlaylistToken()", () => {
    it("should generate new secret token for private playlist if owner", async () => {
      const playlistDoc = buildPlaylistDoc(2, MOCK_CREATOR_ID, true);
      const oldToken = playlistDoc.secret_token;

      sinon.stub(playlistRepository, "findById").resolves(playlistDoc);

      const result = await playlistService.regeneratePlaylistToken(MOCK_PLAYLIST_ID, MOCK_CREATOR_ID);

      expect(result.secret_token).to.not.equal(oldToken);
      expect(playlistDoc.save.calledOnce).to.be.true;
    });

    it("should throw BadRequestError if playlist is public", async () => {
      const playlistDoc = buildPlaylistDoc(2, MOCK_CREATOR_ID, false);

      sinon.stub(playlistRepository, "findById").resolves(playlistDoc);

      try {
        await playlistService.regeneratePlaylistToken(MOCK_PLAYLIST_ID, MOCK_CREATOR_ID);
        expect.fail("Should have thrown BadRequestError");
      } catch (error) {
        expect(error).to.be.instanceOf(BadRequestError);
      }
    });

    it("should throw ForbiddenError if not owner", async () => {
      const playlistDoc = buildPlaylistDoc(2, MOCK_CREATOR_ID, true);

      sinon.stub(playlistRepository, "findById").resolves(playlistDoc);

      try {
        await playlistService.regeneratePlaylistToken(MOCK_PLAYLIST_ID, MOCK_OTHER_USER_ID);
        expect.fail("Should have thrown ForbiddenError");
      } catch (error) {
        expect(error).to.be.instanceOf(ForbiddenError);
      }
    });
  });

  // ===== EMBED & SEARCH TESTS =====
  describe("getEmbedCode()", () => {
    it("should return embed code for public playlist", async () => {
      const playlistDoc = buildPlaylistDoc(2, MOCK_CREATOR_ID, false);

      sinon.stub(playlistRepository, "findById").resolves(playlistDoc);

      const result = await playlistService.getEmbedCode(MOCK_PLAYLIST_ID, MOCK_OTHER_USER_ID);

      expect(result.embedCode).to.include("<iframe");
      expect(result.embedUrl).to.include("test-playlist-123");
      expect(result.playlistPermalink).to.equal("test-playlist-123");
    });

    it("should return embed code for own private playlist", async () => {
      const playlistDoc = buildPlaylistDoc(2, MOCK_CREATOR_ID, true);

      sinon.stub(playlistRepository, "findById").resolves(playlistDoc);

      const result = await playlistService.getEmbedCode(MOCK_PLAYLIST_ID, MOCK_CREATOR_ID);

      expect(result.embedCode).to.include("<iframe");
      expect(result.embedUrl).to.include("secret-token-123");
    });

    it("should throw ForbiddenError for private playlist if not owner", async () => {
      const playlistDoc = buildPlaylistDoc(2, MOCK_CREATOR_ID, true);

      sinon.stub(playlistRepository, "findById").resolves(playlistDoc);

      try {
        await playlistService.getEmbedCode(MOCK_PLAYLIST_ID, MOCK_OTHER_USER_ID);
        expect.fail("Should have thrown ForbiddenError");
      } catch (error) {
        expect(error).to.be.instanceOf(ForbiddenError);
      }
    });
  });

  describe("getPublicPlaylists()", () => {
    it("should retrieve public playlists with pagination", async () => {
      const playlists = [buildPlaylistDoc(2), buildPlaylistDoc(3)];

      sinon.stub(playlistRepository, "findPublicPlaylists").resolves(playlists);

      const result = await playlistService.getPublicPlaylists({ skip: 0, limit: 20 });

      expect(result.length).to.equal(2);
    });
  });

  describe("searchPlaylists()", () => {
    it("should search playlists by title", async () => {
      const playlists = [buildPlaylistDoc(2)];

      sinon.stub(playlistRepository, "searchByTitle").resolves(playlists);

      const result = await playlistService.searchPlaylists("test", null, { skip: 0, limit: 20 });

      expect(result.length).to.equal(1);
    });
  });
});
