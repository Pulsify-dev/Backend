import { expect } from "chai";
import sinon from "sinon";
import engagementService from "../services/engagement.service.js";
import likeRepository from "../repositories/like.repository.js";
import repostRepository from "../repositories/repost.repository.js";
import albumRepository from "../repositories/album.repository.js";
import playlistRepository from "../repositories/playlist.repository.js";
import Album from "../models/album.model.js";
import { BadRequestError, ConflictError, NotFoundError } from "../utils/errors.utils.js";

describe("EngagementService", () => {
  const MOCK_USER_ID = "507f1f77bcf86cd799439011";
  const MOCK_ALBUM_ID = "507f1f77bcf86cd799439022";
  const mockAlbum = {
    _id: MOCK_ALBUM_ID,
    artist_id: "507f1f77bcf86cd799439033",
    title: "Test Album",
    like_count: 2,
    repost_count: 1,
  };

  afterEach(() => {
    sinon.restore();
  });

  describe("likeAlbum()", () => {
    it("should like an album without touching the Likes playlist", async () => {
      sinon.stub(albumRepository, "findById").resolves(mockAlbum);
      sinon.stub(likeRepository, "findAlbumLike").resolves(null);
      sinon.stub(likeRepository, "createAlbumLike").resolves();
      const albumUpdateStub = sinon.stub(Album, "findByIdAndUpdate").resolves();
      const playlistLookupStub = sinon.stub(playlistRepository, "findByCreatorIdAndTitle").resolves(null);

      const result = await engagementService.likeAlbum(MOCK_USER_ID, MOCK_ALBUM_ID);

      expect(result).to.deep.equal({ message: "Album liked successfully." });
      expect(albumUpdateStub.calledOnceWith(MOCK_ALBUM_ID, { $inc: { like_count: 1 } })).to.be.true;
      expect(playlistLookupStub.called).to.be.false;
    });

    it("should throw ConflictError when album is already liked", async () => {
      sinon.stub(albumRepository, "findById").resolves(mockAlbum);
      sinon.stub(likeRepository, "findAlbumLike").resolves({ _id: "like1" });

      try {
        await engagementService.likeAlbum(MOCK_USER_ID, MOCK_ALBUM_ID);
        expect.fail("Should have thrown ConflictError");
      } catch (error) {
        expect(error).to.be.instanceOf(ConflictError);
      }
    });
  });

  describe("unlikeAlbum()", () => {
    it("should unlike an album", async () => {
      sinon.stub(albumRepository, "findById").resolves(mockAlbum);
      sinon.stub(likeRepository, "findAlbumLike").resolves({ _id: "like1" });
      sinon.stub(likeRepository, "deleteAlbumLike").resolves();
      const albumUpdateStub = sinon.stub(Album, "findByIdAndUpdate").resolves();

      const result = await engagementService.unlikeAlbum(MOCK_USER_ID, MOCK_ALBUM_ID);

      expect(result).to.deep.equal({ message: "Album unliked successfully." });
      expect(albumUpdateStub.calledOnceWith(MOCK_ALBUM_ID, { $inc: { like_count: -1 } })).to.be.true;
    });

    it("should throw BadRequestError when album was not liked", async () => {
      sinon.stub(albumRepository, "findById").resolves(mockAlbum);
      sinon.stub(likeRepository, "findAlbumLike").resolves(null);

      try {
        await engagementService.unlikeAlbum(MOCK_USER_ID, MOCK_ALBUM_ID);
        expect.fail("Should have thrown BadRequestError");
      } catch (error) {
        expect(error).to.be.instanceOf(BadRequestError);
      }
    });
  });

  describe("getLikesByAlbum()", () => {
    it("should return album likers with pagination", async () => {
      sinon.stub(albumRepository, "findById").resolves({ ...mockAlbum, like_count: 3 });
      sinon.stub(likeRepository, "getLikesByAlbumId").resolves({
        likes: [
          {
            user_id: {
              _id: "user-2",
              username: "listener",
              display_name: "Listener",
              avatar_url: "avatar.png",
            },
            createdAt: new Date("2026-04-23T10:00:00.000Z"),
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      });

      const result = await engagementService.getLikesByAlbum(MOCK_ALBUM_ID, 1, 20);

      expect(result.album_id).to.equal(MOCK_ALBUM_ID);
      expect(result.likes_count).to.equal(3);
      expect(result.likers[0].username).to.equal("listener");
      expect(result.pagination.total).to.equal(1);
    });

    it("should throw NotFoundError when album does not exist", async () => {
      sinon.stub(albumRepository, "findById").resolves(null);

      try {
        await engagementService.getLikesByAlbum(MOCK_ALBUM_ID, 1, 20);
        expect.fail("Should have thrown NotFoundError");
      } catch (error) {
        expect(error).to.be.instanceOf(NotFoundError);
      }
    });
  });

  describe("repostAlbum()", () => {
    it("should repost an album", async () => {
      sinon.stub(albumRepository, "findById").resolves(mockAlbum);
      sinon.stub(repostRepository, "findAlbumRepost").resolves(null);
      sinon.stub(repostRepository, "createAlbumRepost").resolves();
      const albumUpdateStub = sinon.stub(Album, "findByIdAndUpdate").resolves();

      const result = await engagementService.repostAlbum(MOCK_USER_ID, MOCK_ALBUM_ID);

      expect(result).to.deep.equal({ message: "Album reposted successfully." });
      expect(albumUpdateStub.calledOnceWith(MOCK_ALBUM_ID, { $inc: { repost_count: 1 } })).to.be.true;
    });
  });

  describe("getRepostsByAlbum()", () => {
    it("should return album reposters with pagination", async () => {
      sinon.stub(albumRepository, "findById").resolves({ ...mockAlbum, repost_count: 4 });
      sinon.stub(repostRepository, "getRepostsByAlbumId").resolves({
        reposts: [
          {
            user_id: {
              _id: "user-3",
              username: "curator",
              display_name: "Curator",
              avatar_url: "avatar-2.png",
            },
            createdAt: new Date("2026-04-23T11:00:00.000Z"),
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      });

      const result = await engagementService.getRepostsByAlbum(MOCK_ALBUM_ID, 1, 20);

      expect(result.album_id).to.equal(MOCK_ALBUM_ID);
      expect(result.reposts_count).to.equal(4);
      expect(result.reposters[0].username).to.equal("curator");
      expect(result.pagination.total).to.equal(1);
    });
  });

  describe("checkUserLikedAlbum()", () => {
    it("should delegate to the album like repository", async () => {
      sinon.stub(likeRepository, "checkUserLikedAlbum").resolves(true);

      const result = await engagementService.checkUserLikedAlbum(MOCK_USER_ID, MOCK_ALBUM_ID);

      expect(result).to.equal(true);
    });
  });

  describe("checkUserRepostedAlbum()", () => {
    it("should delegate to the album repost repository", async () => {
      sinon.stub(repostRepository, "checkUserRepostedAlbum").resolves(true);

      const result = await engagementService.checkUserRepostedAlbum(MOCK_USER_ID, MOCK_ALBUM_ID);

      expect(result).to.equal(true);
    });
  });
});
