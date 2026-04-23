import { expect } from "chai";
import sinon from "sinon";
import playlistService from "../services/playlist.service.js";
import playlistRepository from "../repositories/playlist.repository.js";
import Track from "../models/track.model.js";

const MOCK_CREATOR_ID = "507f1f77bcf86cd799439011";
const MOCK_PLAYLIST_ID = "607f1f77bcf86cd799439033";
const MOCK_TRACK_ID = "607f1f77bcf86cd799439044";

const buildPlaylistDoc = (trackCount = 0, ownerId = MOCK_CREATOR_ID) => {
  const tracks = Array.from({ length: trackCount }, (_, index) => ({
    track_id: `track-${index}`,
    position: index,
  }));

  const playlistDoc = {
    _id: MOCK_PLAYLIST_ID,
    creator_id: {
      toString: () => ownerId.toString(),
    },
    tracks,
    track_count: tracks.length,
    addTrack(trackId) {
      this.tracks.push({
        track_id: trackId,
        position: this.tracks.length,
      });
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

  describe("createPlaylist()", () => {
    it("should create a playlist without any quota enforcement", async () => {
      const createStub = sinon.stub(playlistRepository, "create").resolves({
        _id: MOCK_PLAYLIST_ID,
        title: "My Playlist",
        creator_id: MOCK_CREATOR_ID,
      });

      const result = await playlistService.createPlaylist(MOCK_CREATOR_ID, {
        title: "My Playlist",
        description: "Test playlist",
        is_private: false,
      });

      expect(result._id).to.equal(MOCK_PLAYLIST_ID);
      expect(createStub.calledOnce).to.be.true;
    });
  });

  describe("addTrackToPlaylist()", () => {
    it("should add a track without any quota enforcement", async () => {
      const playlistDoc = buildPlaylistDoc(4);

      sinon.stub(playlistRepository, "findById").resolves(playlistDoc);
      sinon.stub(Track, "findById").resolves({ _id: MOCK_TRACK_ID });

      const result = await playlistService.addTrackToPlaylist(
        MOCK_PLAYLIST_ID,
        MOCK_TRACK_ID,
        MOCK_CREATOR_ID,
      );

      expect(result.track_count).to.equal(5);
      expect(playlistDoc.save.calledOnce).to.be.true;
    });
  });
});
