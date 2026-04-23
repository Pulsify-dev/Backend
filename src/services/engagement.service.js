import likeRepository from "../repositories/like.repository.js";
import repostRepository from "../repositories/repost.repository.js";
import commentRepository from "../repositories/comment.repository.js";
import trackRepository from "../repositories/track.repository.js";
import albumRepository from "../repositories/album.repository.js";
import playlistRepository from "../repositories/playlist.repository.js";
import Track from "../models/track.model.js";
import Album from "../models/album.model.js";
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from "../utils/errors.utils.js";


const likeTrack = async (userId, trackId) => {

  const track = await trackRepository.findById(trackId);
  if (!track) throw new NotFoundError("Track not found.");

  const existingLike = await likeRepository.findLike(userId, trackId);
  if (existingLike) {
    throw new ConflictError("You have already liked this track.");
  }
  await likeRepository.createLike(userId, trackId);

  await Track.findByIdAndUpdate(trackId, { $inc: { like_count: 1 } });
  await trackRepository.invalidateTrackCache(trackId);

  // Add track to likes playlist
  try {
    const likesPlaylist = await playlistRepository.findByCreatorIdAndTitle(userId, "Likes");
    if (likesPlaylist) {
      await playlistRepository.addTrackToPlaylist(likesPlaylist._id, trackId, likesPlaylist.track_count);
    }
  } catch (error) {
    console.error("Error adding track to likes playlist:", error);
    // Don't throw error - liking should succeed even if playlist update fails
  }

  return { message: "Track liked successfully." };
};

const unlikeTrack = async (userId, trackId) => {
  const track = await trackRepository.findById(trackId);
  if (!track) throw new NotFoundError("Track not found.");
  const existingLike = await likeRepository.findLike(userId, trackId);
  if (!existingLike) {
    throw new BadRequestError("You have not liked this track.");
  }
  await likeRepository.deleteLike(userId, trackId);
  await Track.findByIdAndUpdate(trackId, { $inc: { like_count: -1 } });
  await trackRepository.invalidateTrackCache(trackId);

  // Remove track from likes playlist
  try {
    const likesPlaylist = await playlistRepository.findByCreatorIdAndTitle(userId, "Likes");
    if (likesPlaylist) {
      await playlistRepository.removeTrackFromPlaylist(likesPlaylist._id, trackId);
    }
  } catch (error) {
    console.error("Error removing track from likes playlist:", error);
    // Don't throw error - unliking should succeed even if playlist update fails
  }

  return { message: "Track unliked successfully." };
};

const getLikesByTrack = async (trackId, page = 1, limit = 20) => {
  const track = await trackRepository.findById(trackId);
  if (!track) throw new NotFoundError("Track not found.");

  const result = await likeRepository.getLikesByTrackId(trackId, page, limit);

  return {
    track_id: trackId,
    likes_count: track.like_count,
    likers: result.likes.map((like) => ({
      user_id: like.user_id._id,
      username: like.user_id.username,
      display_name: like.user_id.display_name,
      avatar_url: like.user_id.avatar_url,
      liked_at: like.createdAt,
    })),
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      pages: Math.ceil(result.total / result.limit),
    },
  };
};

const checkUserLikedTrack = async (userId, trackId) => {
  return await likeRepository.checkUserLikedTrack(userId, trackId);
};

const likeAlbum = async (userId, albumId) => {
  const album = await albumRepository.findById(albumId);
  if (!album) throw new NotFoundError("Album not found.");

  const existingLike = await likeRepository.findAlbumLike(userId, albumId);
  if (existingLike) {
    throw new ConflictError("You have already liked this album.");
  }

  await likeRepository.createAlbumLike(userId, albumId);
  await Album.findByIdAndUpdate(albumId, { $inc: { like_count: 1 } });

  return { message: "Album liked successfully." };
};

const unlikeAlbum = async (userId, albumId) => {
  const album = await albumRepository.findById(albumId);
  if (!album) throw new NotFoundError("Album not found.");

  const existingLike = await likeRepository.findAlbumLike(userId, albumId);
  if (!existingLike) {
    throw new BadRequestError("You have not liked this album.");
  }

  await likeRepository.deleteAlbumLike(userId, albumId);
  await Album.findByIdAndUpdate(albumId, { $inc: { like_count: -1 } });

  return { message: "Album unliked successfully." };
};

const getLikesByAlbum = async (albumId, page = 1, limit = 20) => {
  const album = await albumRepository.findById(albumId);
  if (!album) throw new NotFoundError("Album not found.");

  const result = await likeRepository.getLikesByAlbumId(albumId, page, limit);

  return {
    album_id: albumId,
    likes_count: album.like_count,
    likers: result.likes.map((like) => ({
      user_id: like.user_id._id,
      username: like.user_id.username,
      display_name: like.user_id.display_name,
      avatar_url: like.user_id.avatar_url,
      liked_at: like.createdAt,
    })),
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      pages: Math.ceil(result.total / result.limit),
    },
  };
};

const checkUserLikedAlbum = async (userId, albumId) => {
  return await likeRepository.checkUserLikedAlbum(userId, albumId);
};

const repostTrack = async (userId, trackId) => {

  const track = await trackRepository.findById(trackId);
  if (!track) throw new NotFoundError("Track not found.");
  const existingRepost = await repostRepository.findRepost(userId, trackId);
  if (existingRepost) {
    throw new ConflictError("You have already reposted this track.");
  }
  await repostRepository.createRepost(userId, trackId);
  await Track.findByIdAndUpdate(trackId, { $inc: { repost_count: 1 } });
  await trackRepository.invalidateTrackCache(trackId);

  return { message: "Track reposted successfully." };
};

const unrepostTrack = async (userId, trackId) => {
  const track = await trackRepository.findById(trackId);
  if (!track) throw new NotFoundError("Track not found.");
  const existingRepost = await repostRepository.findRepost(userId, trackId);
  if (!existingRepost) {
    throw new BadRequestError("You have not reposted this track.");
  }

  await repostRepository.deleteRepost(userId, trackId);
  await Track.findByIdAndUpdate(trackId, { $inc: { repost_count: -1 } });
  await trackRepository.invalidateTrackCache(trackId);

  return { message: "Track unreposted successfully." };
};

const getRepostsByTrack = async (trackId, page = 1, limit = 20) => {
  const track = await trackRepository.findById(trackId);
  if (!track) throw new NotFoundError("Track not found.");

  const result = await repostRepository.getRepostsByTrackId(trackId, page, limit);

  return {
    track_id: trackId,
    reposts_count: track.repost_count,
    reposters: result.reposts.map((repost) => ({
      user_id: repost.user_id._id,
      username: repost.user_id.username,
      display_name: repost.user_id.display_name,
      avatar_url: repost.user_id.avatar_url,
      reposted_at: repost.createdAt,
    })),
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      pages: Math.ceil(result.total / result.limit),
    },
  };
};

const checkUserRepostedTrack = async (userId, trackId) => {
  return await repostRepository.checkUserRepostedTrack(userId, trackId);
};

const repostAlbum = async (userId, albumId) => {
  const album = await albumRepository.findById(albumId);
  if (!album) throw new NotFoundError("Album not found.");

  const existingRepost = await repostRepository.findAlbumRepost(userId, albumId);
  if (existingRepost) {
    throw new ConflictError("You have already reposted this album.");
  }

  await repostRepository.createAlbumRepost(userId, albumId);
  await Album.findByIdAndUpdate(albumId, { $inc: { repost_count: 1 } });

  return { message: "Album reposted successfully." };
};

const unrepostAlbum = async (userId, albumId) => {
  const album = await albumRepository.findById(albumId);
  if (!album) throw new NotFoundError("Album not found.");

  const existingRepost = await repostRepository.findAlbumRepost(userId, albumId);
  if (!existingRepost) {
    throw new BadRequestError("You have not reposted this album.");
  }

  await repostRepository.deleteAlbumRepost(userId, albumId);
  await Album.findByIdAndUpdate(albumId, { $inc: { repost_count: -1 } });

  return { message: "Album unreposted successfully." };
};

const getRepostsByAlbum = async (albumId, page = 1, limit = 20) => {
  const album = await albumRepository.findById(albumId);
  if (!album) throw new NotFoundError("Album not found.");

  const result = await repostRepository.getRepostsByAlbumId(albumId, page, limit);

  return {
    album_id: albumId,
    reposts_count: album.repost_count,
    reposters: result.reposts.map((repost) => ({
      user_id: repost.user_id._id,
      username: repost.user_id.username,
      display_name: repost.user_id.display_name,
      avatar_url: repost.user_id.avatar_url,
      reposted_at: repost.createdAt,
    })),
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      pages: Math.ceil(result.total / result.limit),
    },
  };
};

const checkUserRepostedAlbum = async (userId, albumId) => {
  return await repostRepository.checkUserRepostedAlbum(userId, albumId);
};



const createComment = async (userId, trackId, commentData) => {
  const track = await trackRepository.findById(trackId);
  if (!track) throw new NotFoundError("Track not found.");

  const { text, timestamp_seconds, parent_comment_id } = commentData;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    throw new BadRequestError("Comment text is required.");
  }
  if (timestamp_seconds === undefined || timestamp_seconds === null) {
    throw new BadRequestError("Timestamp is required.");
  }

  if (typeof timestamp_seconds !== "number" || !Number.isInteger(timestamp_seconds)) {
    throw new BadRequestError("Timestamp must be an integer.");
  }
  if (timestamp_seconds < 0) {
    throw new BadRequestError("Timestamp cannot be negative.");
  }

  if (timestamp_seconds > track.duration) {
    throw new BadRequestError(
      `Timestamp cannot exceed track duration of ${track.duration} seconds.`
    );
  }
  if (parent_comment_id) {
    const parentComment = await commentRepository.findCommentById(parent_comment_id);
    if (!parentComment) {
      throw new NotFoundError("Parent comment not found.");
    }
    if (parentComment.track_id.toString() !== trackId) {
      throw new BadRequestError("Parent comment is not on this track.");
    }
  }
  await commentRepository.createComment({
    user_id: userId,
    track_id: trackId,
    text,
    timestamp_seconds,
    parent_comment_id: parent_comment_id || null,
  });
  await Track.findByIdAndUpdate(trackId, { $inc: { comment_count: 1 } });
  await trackRepository.invalidateTrackCache(trackId);
  if (parent_comment_id) {
    await commentRepository.incrementCommentReplies(parent_comment_id);
  }

  return { message: "Comment created successfully." };
};

const updateComment = async (userId, commentId, updateData) => {
  const comment = await commentRepository.findCommentById(commentId);
  if (!comment) throw new NotFoundError("Comment not found.");
  if (comment.user_id._id.toString() !== userId.toString()) {
    throw new ForbiddenError("You can only edit your own comments.");
  }
  const { text } = updateData;
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    throw new BadRequestError("Comment text is required.");
  }
  await commentRepository.updateCommentById(commentId, {
    text,
    is_edited: true,
  });
  return { message: "Comment updated successfully." };
};

const deleteComment = async (userId, commentId) => {
  const comment = await commentRepository.findCommentById(commentId);
  if (!comment) throw new NotFoundError("Comment not found.");
  if (comment.user_id._id.toString() !== userId.toString()) {
    throw new ForbiddenError("You can only delete your own comments.");
  }
  await commentRepository.updateCommentById(commentId, { is_deleted: true });
  await Track.findByIdAndUpdate(comment.track_id, { $inc: { comment_count: -1 } });
  await trackRepository.invalidateTrackCache(comment.track_id);

  if (comment.parent_comment_id) {
    await commentRepository.decrementCommentReplies(comment.parent_comment_id);
  }

  return { message: "Comment deleted successfully." };
};

const getCommentsByTrack = async (trackId, page = 1, limit = 20) => {
  const track = await trackRepository.findById(trackId);
  if (!track) throw new NotFoundError("Track not found.");

  const result = await commentRepository.getCommentsByTrackId(
    trackId,
    page,
    limit
  );

  return {
    track_id: trackId,
    comments_count: track.comment_count,
    comments: result.comments.map((comment) => ({
      comment_id: comment._id,
      user_id: comment.user_id._id,
      username: comment.user_id.username,
      display_name: comment.user_id.display_name,
      avatar_url: comment.user_id.avatar_url,
      text: comment.text,
      timestamp_seconds: comment.timestamp_seconds,
      likes_count: comment.likes_count,
      replies_count: comment.replies_count,
      is_edited: comment.is_edited,
      created_at: comment.createdAt,
    })),
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      pages: Math.ceil(result.total / result.limit),
    },
  };
};

const getCommentReplies = async (commentId, page = 1, limit = 20) => {
  const comment = await commentRepository.findCommentById(commentId);
  if (!comment) throw new NotFoundError("Comment not found.");

  const result = await commentRepository.getRepliesByCommentId(
    commentId,
    page,
    limit
  );

  return {
    parent_comment_id: commentId,
    replies_count: comment.replies_count,
    replies: result.replies.map((reply) => ({
      comment_id: reply._id,
      user_id: reply.user_id._id,
      username: reply.user_id.username,
      display_name: reply.user_id.display_name,
      avatar_url: reply.user_id.avatar_url,
      text: reply.text,
      timestamp_seconds: reply.timestamp_seconds,
      likes_count: reply.likes_count,
      is_edited: reply.is_edited,
      created_at: reply.createdAt,
    })),
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      pages: Math.ceil(result.total / result.limit),
    },
  };
};

export default { 
  likeTrack,
  unlikeTrack,
  getLikesByTrack,
  checkUserLikedTrack,
  likeAlbum,
  unlikeAlbum,
  getLikesByAlbum,
  checkUserLikedAlbum,
  repostTrack,
  unrepostTrack,
  getRepostsByTrack,
  checkUserRepostedTrack,
  repostAlbum,
  unrepostAlbum,
  getRepostsByAlbum,
  checkUserRepostedAlbum,
  createComment,
  updateComment,
  deleteComment,
  getCommentsByTrack,
  getCommentReplies,
};
