import { expect } from "chai";
import sinon from "sinon";
import engagementService from "../services/engagement.service.js";
import likeRepository from "../repositories/like.repository.js";
import repostRepository from "../repositories/repost.repository.js";
import commentRepository from "../repositories/comment.repository.js";
import trackRepository from "../repositories/track.repository.js";
import albumRepository from "../repositories/album.repository.js";
import playlistRepository from "../repositories/playlist.repository.js";
import Track from "../models/track.model.js";
import Album from "../models/album.model.js";
import Comment from "../models/comment.model.js";
import { BadRequestError, ConflictError, NotFoundError, ForbiddenError } from "../utils/errors.utils.js";

describe("EngagementService", () => {
  const MOCK_USER_ID = "507f1f77bcf86cd799439011";
  const MOCK_TRACK_ID = "507f1f77bcf86cd799439021";
  const MOCK_ALBUM_ID = "507f1f77bcf86cd799439022";
  const MOCK_COMMENT_ID = "507f1f77bcf86cd799439031";
  
  const mockTrack = {
    _id: MOCK_TRACK_ID,
    artist_id: "507f1f77bcf86cd799439033",
    title: "Test Track",
    like_count: 2,
    repost_count: 1,
    duration: 300,
  };
  
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

  // ===== TRACK LIKES TESTS =====
  describe("likeTrack()", () => {
    it("should like a track and add to Likes playlist", async () => {
      sinon.stub(trackRepository, "findById").resolves(mockTrack);
      sinon.stub(likeRepository, "findLike").resolves(null);
      sinon.stub(likeRepository, "createLike").resolves();
      const trackUpdateStub = sinon.stub(Track, "findByIdAndUpdate").resolves();
      sinon.stub(trackRepository, "invalidateTrackCache").resolves();
      sinon.stub(playlistRepository, "findByCreatorIdAndTitle").resolves({ _id: "likes-id", track_count: 5 });
      sinon.stub(playlistRepository, "addTrackToPlaylist").resolves();

      const result = await engagementService.likeTrack(MOCK_USER_ID, MOCK_TRACK_ID);

      expect(result).to.deep.equal({ message: "Track liked successfully." });
      expect(trackUpdateStub.calledOnceWith(MOCK_TRACK_ID, { $inc: { like_count: 1 } })).to.be.true;
    });

    it("should like track even if Likes playlist doesn't exist", async () => {
      sinon.stub(trackRepository, "findById").resolves(mockTrack);
      sinon.stub(likeRepository, "findLike").resolves(null);
      sinon.stub(likeRepository, "createLike").resolves();
      sinon.stub(Track, "findByIdAndUpdate").resolves();
      sinon.stub(trackRepository, "invalidateTrackCache").resolves();
      sinon.stub(playlistRepository, "findByCreatorIdAndTitle").resolves(null);

      const result = await engagementService.likeTrack(MOCK_USER_ID, MOCK_TRACK_ID);

      expect(result).to.deep.equal({ message: "Track liked successfully." });
    });

    it("should throw ConflictError when track is already liked", async () => {
      sinon.stub(trackRepository, "findById").resolves(mockTrack);
      sinon.stub(likeRepository, "findLike").resolves({ _id: "like1" });

      try {
        await engagementService.likeTrack(MOCK_USER_ID, MOCK_TRACK_ID);
        expect.fail("Should have thrown ConflictError");
      } catch (error) {
        expect(error).to.be.instanceOf(ConflictError);
      }
    });

    it("should throw NotFoundError when track does not exist", async () => {
      sinon.stub(trackRepository, "findById").resolves(null);

      try {
        await engagementService.likeTrack(MOCK_USER_ID, MOCK_TRACK_ID);
        expect.fail("Should have thrown NotFoundError");
      } catch (error) {
        expect(error).to.be.instanceOf(NotFoundError);
      }
    });
  });

  describe("unlikeTrack()", () => {
    it("should unlike a track and remove from Likes playlist", async () => {
      sinon.stub(trackRepository, "findById").resolves(mockTrack);
      sinon.stub(likeRepository, "findLike").resolves({ _id: "like1" });
      sinon.stub(likeRepository, "deleteLike").resolves();
      const trackUpdateStub = sinon.stub(Track, "findByIdAndUpdate").resolves();
      sinon.stub(trackRepository, "invalidateTrackCache").resolves();
      sinon.stub(playlistRepository, "findByCreatorIdAndTitle").resolves({ _id: "likes-id" });
      sinon.stub(playlistRepository, "removeTrackFromPlaylist").resolves();

      const result = await engagementService.unlikeTrack(MOCK_USER_ID, MOCK_TRACK_ID);

      expect(result).to.deep.equal({ message: "Track unliked successfully." });
      expect(trackUpdateStub.calledOnceWith(MOCK_TRACK_ID, { $inc: { like_count: -1 } })).to.be.true;
    });

    it("should throw BadRequestError when track was not liked", async () => {
      sinon.stub(trackRepository, "findById").resolves(mockTrack);
      sinon.stub(likeRepository, "findLike").resolves(null);

      try {
        await engagementService.unlikeTrack(MOCK_USER_ID, MOCK_TRACK_ID);
        expect.fail("Should have thrown BadRequestError");
      } catch (error) {
        expect(error).to.be.instanceOf(BadRequestError);
      }
    });
  });

  describe("getLikesByTrack()", () => {
    it("should return track likers with pagination", async () => {
      sinon.stub(trackRepository, "findById").resolves({ ...mockTrack, like_count: 3 });
      sinon.stub(likeRepository, "getLikesByTrackId").resolves({
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

      const result = await engagementService.getLikesByTrack(MOCK_TRACK_ID, 1, 20);

      expect(result.track_id).to.equal(MOCK_TRACK_ID);
      expect(result.likes_count).to.equal(3);
      expect(result.likers[0].username).to.equal("listener");
    });

    it("should throw NotFoundError when track does not exist", async () => {
      sinon.stub(trackRepository, "findById").resolves(null);

      try {
        await engagementService.getLikesByTrack(MOCK_TRACK_ID, 1, 20);
        expect.fail("Should have thrown NotFoundError");
      } catch (error) {
        expect(error).to.be.instanceOf(NotFoundError);
      }
    });
  });

  describe("checkUserLikedTrack()", () => {
    it("should return true if user liked track", async () => {
      sinon.stub(likeRepository, "checkUserLikedTrack").resolves(true);

      const result = await engagementService.checkUserLikedTrack(MOCK_USER_ID, MOCK_TRACK_ID);

      expect(result).to.equal(true);
    });

    it("should return false if user did not like track", async () => {
      sinon.stub(likeRepository, "checkUserLikedTrack").resolves(false);

      const result = await engagementService.checkUserLikedTrack(MOCK_USER_ID, MOCK_TRACK_ID);

      expect(result).to.equal(false);
    });
  });

  // ===== TRACK REPOSTS TESTS =====
  describe("repostTrack()", () => {
    it("should repost a track", async () => {
      sinon.stub(trackRepository, "findById").resolves(mockTrack);
      sinon.stub(repostRepository, "findRepost").resolves(null);
      sinon.stub(repostRepository, "createRepost").resolves();
      const trackUpdateStub = sinon.stub(Track, "findByIdAndUpdate").resolves();

      const result = await engagementService.repostTrack(MOCK_USER_ID, MOCK_TRACK_ID);

      expect(result).to.deep.equal({ message: "Track reposted successfully." });
      expect(trackUpdateStub.calledOnceWith(MOCK_TRACK_ID, { $inc: { repost_count: 1 } })).to.be.true;
    });

    it("should throw ConflictError when track is already reposted", async () => {
      sinon.stub(trackRepository, "findById").resolves(mockTrack);
      sinon.stub(repostRepository, "findRepost").resolves({ _id: "repost1" });

      try {
        await engagementService.repostTrack(MOCK_USER_ID, MOCK_TRACK_ID);
        expect.fail("Should have thrown ConflictError");
      } catch (error) {
        expect(error).to.be.instanceOf(ConflictError);
      }
    });
  });

  describe("unrepostTrack()", () => {
    it("should unrepost a track", async () => {
      sinon.stub(trackRepository, "findById").resolves(mockTrack);
      sinon.stub(repostRepository, "findRepost").resolves({ _id: "repost1" });
      sinon.stub(repostRepository, "deleteRepost").resolves();
      const trackUpdateStub = sinon.stub(Track, "findByIdAndUpdate").resolves();

      const result = await engagementService.unrepostTrack(MOCK_USER_ID, MOCK_TRACK_ID);

      expect(result).to.deep.equal({ message: "Track unreposted successfully." });
      expect(trackUpdateStub.calledOnceWith(MOCK_TRACK_ID, { $inc: { repost_count: -1 } })).to.be.true;
    });

    it("should throw BadRequestError when track was not reposted", async () => {
      sinon.stub(trackRepository, "findById").resolves(mockTrack);
      sinon.stub(repostRepository, "findRepost").resolves(null);

      try {
        await engagementService.unrepostTrack(MOCK_USER_ID, MOCK_TRACK_ID);
        expect.fail("Should have thrown BadRequestError");
      } catch (error) {
        expect(error).to.be.instanceOf(BadRequestError);
      }
    });
  });

  describe("getRepostsByTrack()", () => {
    it("should return track reposters with pagination", async () => {
      sinon.stub(trackRepository, "findById").resolves({ ...mockTrack, repost_count: 4 });
      sinon.stub(repostRepository, "getRepostsByTrackId").resolves({
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

      const result = await engagementService.getRepostsByTrack(MOCK_TRACK_ID, 1, 20);

      expect(result.track_id).to.equal(MOCK_TRACK_ID);
      expect(result.reposts_count).to.equal(4);
      expect(result.reposters[0].username).to.equal("curator");
    });
  });

  describe("checkUserRepostedTrack()", () => {
    it("should return true if user reposted track", async () => {
      sinon.stub(repostRepository, "checkUserRepostedTrack").resolves(true);

      const result = await engagementService.checkUserRepostedTrack(MOCK_USER_ID, MOCK_TRACK_ID);

      expect(result).to.equal(true);
    });
  });

  // ===== ALBUM TESTS =====
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

  describe("checkUserLikedAlbum()", () => {
    it("should return true if user liked album", async () => {
      sinon.stub(likeRepository, "checkUserLikedAlbum").resolves(true);

      const result = await engagementService.checkUserLikedAlbum(MOCK_USER_ID, MOCK_ALBUM_ID);

      expect(result).to.equal(true);
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

  describe("unrepostAlbum()", () => {
    it("should unrepost an album", async () => {
      sinon.stub(albumRepository, "findById").resolves(mockAlbum);
      sinon.stub(repostRepository, "findAlbumRepost").resolves({ _id: "repost1" });
      sinon.stub(repostRepository, "deleteAlbumRepost").resolves();
      const albumUpdateStub = sinon.stub(Album, "findByIdAndUpdate").resolves();

      const result = await engagementService.unrepostAlbum(MOCK_USER_ID, MOCK_ALBUM_ID);

      expect(result).to.deep.equal({ message: "Album unreposted successfully." });
      expect(albumUpdateStub.calledOnceWith(MOCK_ALBUM_ID, { $inc: { repost_count: -1 } })).to.be.true;
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

  describe("checkUserRepostedAlbum()", () => {
    it("should return true if user reposted album", async () => {
      sinon.stub(repostRepository, "checkUserRepostedAlbum").resolves(true);

      const result = await engagementService.checkUserRepostedAlbum(MOCK_USER_ID, MOCK_ALBUM_ID);

      expect(result).to.equal(true);
    });
  });

  // ===== COMMENTS TESTS =====
  describe("createComment()", () => {
    it("should create a comment on a track with valid data", async () => {
      const commentData = { text: "Great track!", timestamp_seconds: 120 };
      const mockComment = { _id: MOCK_COMMENT_ID, ...commentData, user_id: MOCK_USER_ID };

      sinon.stub(trackRepository, "findById").resolves(mockTrack);
      sinon.stub(commentRepository, "createComment").resolves(mockComment);
      sinon.stub(Track, "findByIdAndUpdate").resolves();
      sinon.stub(trackRepository, "invalidateTrackCache").resolves();

      const result = await engagementService.createComment(MOCK_USER_ID, MOCK_TRACK_ID, commentData);

      expect(result).to.deep.equal({ message: "Comment created successfully." });
    });

    it("should create a reply to a parent comment", async () => {
      const parentCommentId = "507f1f77bcf86cd799439050";
      const commentData = { text: "I agree!", timestamp_seconds: 120, parent_comment_id: parentCommentId };

      sinon.stub(trackRepository, "findById").resolves(mockTrack);
      sinon.stub(commentRepository, "findCommentById").resolves({ _id: parentCommentId, track_id: MOCK_TRACK_ID });
      sinon.stub(commentRepository, "createComment").resolves();
      sinon.stub(Track, "findByIdAndUpdate").resolves();
      sinon.stub(trackRepository, "invalidateTrackCache").resolves();
      sinon.stub(commentRepository, "incrementCommentReplies").resolves();

      const result = await engagementService.createComment(MOCK_USER_ID, MOCK_TRACK_ID, commentData);

      expect(result).to.deep.equal({ message: "Comment created successfully." });
    });

    it("should throw NotFoundError if track does not exist", async () => {
      sinon.stub(trackRepository, "findById").resolves(null);

      try {
        await engagementService.createComment(MOCK_USER_ID, MOCK_TRACK_ID, { text: "Test", timestamp_seconds: 0 });
        expect.fail("Should have thrown NotFoundError");
      } catch (error) {
        expect(error).to.be.instanceOf(NotFoundError);
      }
    });

    it("should throw BadRequestError if text is empty", async () => {
      sinon.stub(trackRepository, "findById").resolves(mockTrack);

      try {
        await engagementService.createComment(MOCK_USER_ID, MOCK_TRACK_ID, { text: "", timestamp_seconds: 0 });
        expect.fail("Should have thrown BadRequestError");
      } catch (error) {
        expect(error).to.be.instanceOf(BadRequestError);
      }
    });

    it("should throw BadRequestError if timestamp is negative", async () => {
      sinon.stub(trackRepository, "findById").resolves(mockTrack);

      try {
        await engagementService.createComment(MOCK_USER_ID, MOCK_TRACK_ID, { text: "Test", timestamp_seconds: -1 });
        expect.fail("Should have thrown BadRequestError");
      } catch (error) {
        expect(error).to.be.instanceOf(BadRequestError);
      }
    });

    it("should throw BadRequestError if timestamp exceeds track duration", async () => {
      sinon.stub(trackRepository, "findById").resolves(mockTrack);

      try {
        await engagementService.createComment(MOCK_USER_ID, MOCK_TRACK_ID, { text: "Test", timestamp_seconds: 9999 });
        expect.fail("Should have thrown BadRequestError");
      } catch (error) {
        expect(error).to.be.instanceOf(BadRequestError);
      }
    });

    it("should throw NotFoundError if parent comment does not exist", async () => {
      sinon.stub(trackRepository, "findById").resolves(mockTrack);
      sinon.stub(commentRepository, "findCommentById").resolves(null);

      try {
        await engagementService.createComment(MOCK_USER_ID, MOCK_TRACK_ID, {
          text: "Reply",
          timestamp_seconds: 120,
          parent_comment_id: "nonexistent"
        });
        expect.fail("Should have thrown NotFoundError");
      } catch (error) {
        expect(error).to.be.instanceOf(NotFoundError);
      }
    });

    it("should throw BadRequestError if parent comment is not on same track", async () => {
      const parentCommentId = "507f1f77bcf86cd799439050";
      sinon.stub(trackRepository, "findById").resolves(mockTrack);
      sinon.stub(commentRepository, "findCommentById").resolves({
        _id: parentCommentId,
        track_id: "different-track-id"
      });

      try {
        await engagementService.createComment(MOCK_USER_ID, MOCK_TRACK_ID, {
          text: "Reply",
          timestamp_seconds: 120,
          parent_comment_id: parentCommentId
        });
        expect.fail("Should have thrown BadRequestError");
      } catch (error) {
        expect(error).to.be.instanceOf(BadRequestError);
      }
    });
  });

  describe("updateComment()", () => {
    it("should update a comment if user is owner", async () => {
      const mockComment = { _id: MOCK_COMMENT_ID, user_id: { _id: MOCK_USER_ID }, text: "Old text" };
      const updatedComment = { ...mockComment, text: "New text", is_edited: true };

      sinon.stub(commentRepository, "findCommentById").resolves(mockComment);
      sinon.stub(commentRepository, "updateCommentById").resolves(updatedComment);

      const result = await engagementService.updateComment(MOCK_USER_ID, MOCK_COMMENT_ID, { text: "New text" });

      expect(result).to.deep.equal({ message: "Comment updated successfully." });
    });

    it("should throw ForbiddenError if user is not owner", async () => {
      const mockComment = { _id: MOCK_COMMENT_ID, user_id: { _id: "other-user-id" }, text: "Old text" };

      sinon.stub(commentRepository, "findCommentById").resolves(mockComment);

      try {
        await engagementService.updateComment(MOCK_USER_ID, MOCK_COMMENT_ID, { text: "New text" });
        expect.fail("Should have thrown ForbiddenError");
      } catch (error) {
        expect(error).to.be.instanceOf(ForbiddenError);
      }
    });

    it("should throw NotFoundError if comment does not exist", async () => {
      sinon.stub(commentRepository, "findCommentById").resolves(null);

      try {
        await engagementService.updateComment(MOCK_USER_ID, MOCK_COMMENT_ID, { text: "New text" });
        expect.fail("Should have thrown NotFoundError");
      } catch (error) {
        expect(error).to.be.instanceOf(NotFoundError);
      }
    });

    it("should throw BadRequestError if text is empty", async () => {
      const mockComment = { _id: MOCK_COMMENT_ID, user_id: { _id: MOCK_USER_ID }, text: "Old text" };

      sinon.stub(commentRepository, "findCommentById").resolves(mockComment);

      try {
        await engagementService.updateComment(MOCK_USER_ID, MOCK_COMMENT_ID, { text: "" });
        expect.fail("Should have thrown BadRequestError");
      } catch (error) {
        expect(error).to.be.instanceOf(BadRequestError);
      }
    });
  });

  describe("deleteComment()", () => {
    it("should delete a comment if user is owner", async () => {
      const mockComment = { _id: MOCK_COMMENT_ID, user_id: { _id: MOCK_USER_ID }, track_id: MOCK_TRACK_ID };

      sinon.stub(commentRepository, "findCommentById").resolves(mockComment);
      sinon.stub(commentRepository, "updateCommentById").resolves();
      sinon.stub(Track, "findByIdAndUpdate").resolves();
      sinon.stub(trackRepository, "invalidateTrackCache").resolves();

      const result = await engagementService.deleteComment(MOCK_USER_ID, MOCK_COMMENT_ID);

      expect(result).to.deep.equal({ message: "Comment deleted successfully." });
    });

    it("should delete parent comment and decrement replies", async () => {
      const parentCommentId = "507f1f77bcf86cd799439050";
      const mockComment = {
        _id: MOCK_COMMENT_ID,
        user_id: { _id: MOCK_USER_ID },
        track_id: MOCK_TRACK_ID,
        parent_comment_id: parentCommentId
      };

      sinon.stub(commentRepository, "findCommentById").resolves(mockComment);
      sinon.stub(commentRepository, "updateCommentById").resolves();
      sinon.stub(Track, "findByIdAndUpdate").resolves();
      sinon.stub(trackRepository, "invalidateTrackCache").resolves();
      sinon.stub(commentRepository, "decrementCommentReplies").resolves();

      const result = await engagementService.deleteComment(MOCK_USER_ID, MOCK_COMMENT_ID);

      expect(result).to.deep.equal({ message: "Comment deleted successfully." });
    });

    it("should throw ForbiddenError if user is not owner", async () => {
      const mockComment = { _id: MOCK_COMMENT_ID, user_id: { _id: "other-user-id" }, track_id: MOCK_TRACK_ID };

      sinon.stub(commentRepository, "findCommentById").resolves(mockComment);

      try {
        await engagementService.deleteComment(MOCK_USER_ID, MOCK_COMMENT_ID);
        expect.fail("Should have thrown ForbiddenError");
      } catch (error) {
        expect(error).to.be.instanceOf(ForbiddenError);
      }
    });

    it("should throw NotFoundError if comment does not exist", async () => {
      sinon.stub(commentRepository, "findCommentById").resolves(null);

      try {
        await engagementService.deleteComment(MOCK_USER_ID, MOCK_COMMENT_ID);
        expect.fail("Should have thrown NotFoundError");
      } catch (error) {
        expect(error).to.be.instanceOf(NotFoundError);
      }
    });
  });

  describe("getCommentsByTrack()", () => {
    it("should return comments on a track with pagination", async () => {
      sinon.stub(trackRepository, "findById").resolves(mockTrack);
      sinon.stub(commentRepository, "getCommentsByTrackId").resolves({
        comments: [
          {
            _id: MOCK_COMMENT_ID,
            text: "Great track!",
            timestamp_seconds: 120,
            user_id: { _id: MOCK_USER_ID, username: "listener", display_name: "Listener", avatar_url: "avatar.png" },
            likes_count: 2,
            replies_count: 1,
            is_edited: false,
            createdAt: new Date("2026-04-23T10:00:00.000Z"),
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      });

      const result = await engagementService.getCommentsByTrack(MOCK_TRACK_ID, 1, 20);

      expect(result.track_id).to.equal(MOCK_TRACK_ID);
      expect(result.comments[0].text).to.equal("Great track!");
    });

    it("should throw NotFoundError if track does not exist", async () => {
      sinon.stub(trackRepository, "findById").resolves(null);

      try {
        await engagementService.getCommentsByTrack(MOCK_TRACK_ID, 1, 20);
        expect.fail("Should have thrown NotFoundError");
      } catch (error) {
        expect(error).to.be.instanceOf(NotFoundError);
      }
    });

    it("should handle pagination correctly", async () => {
      sinon.stub(trackRepository, "findById").resolves(mockTrack);
      sinon.stub(commentRepository, "getCommentsByTrackId").resolves({
        comments: [],
        total: 0,
        page: 2,
        limit: 20,
      });

      const result = await engagementService.getCommentsByTrack(MOCK_TRACK_ID, 2, 20);

      expect(result.pagination.page).to.equal(2);
      expect(result.pagination.limit).to.equal(20);
    });
  });

  describe("getCommentReplies()", () => {
    it("should return replies to a comment with pagination", async () => {
      const mockParentComment = { _id: MOCK_COMMENT_ID, replies_count: 2 };

      sinon.stub(commentRepository, "findCommentById").resolves(mockParentComment);
      sinon.stub(commentRepository, "getRepliesByCommentId").resolves({
        replies: [
          {
            _id: "reply-1",
            text: "I agree!",
            timestamp_seconds: 120,
            user_id: { _id: "user-2", username: "listener2", display_name: "Listener 2", avatar_url: "avatar2.png" },
            likes_count: 1,
            is_edited: false,
            createdAt: new Date("2026-04-23T10:30:00.000Z"),
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      });

      const result = await engagementService.getCommentReplies(MOCK_COMMENT_ID, 1, 20);

      expect(result.parent_comment_id).to.equal(MOCK_COMMENT_ID);
      expect(result.replies_count).to.equal(2);
      expect(result.replies[0].text).to.equal("I agree!");
    });

    it("should throw NotFoundError if parent comment does not exist", async () => {
      sinon.stub(commentRepository, "findCommentById").resolves(null);

      try {
        await engagementService.getCommentReplies(MOCK_COMMENT_ID, 1, 20);
        expect.fail("Should have thrown NotFoundError");
      } catch (error) {
        expect(error).to.be.instanceOf(NotFoundError);
      }
    });

    it("should handle pagination for replies", async () => {
      const mockParentComment = { _id: MOCK_COMMENT_ID, replies_count: 5 };

      sinon.stub(commentRepository, "findCommentById").resolves(mockParentComment);
      sinon.stub(commentRepository, "getRepliesByCommentId").resolves({
        replies: [],
        total: 5,
        page: 2,
        limit: 3,
      });

      const result = await engagementService.getCommentReplies(MOCK_COMMENT_ID, 2, 3);

      expect(result.pagination.page).to.equal(2);
      expect(result.pagination.total).to.equal(5);
    });
  });
});
