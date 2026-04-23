import Like from "../models/like.model.js";
import AlbumLike from "../models/album-like.model.js";

const createLike = async (userId, trackId) => {
  return Like.create({ user_id: userId, track_id: trackId });
};

const findLike = async (userId, trackId) => {
  return Like.findOne({ user_id: userId, track_id: trackId });
};

const deleteLike = async (userId, trackId) => {
  return Like.deleteOne({ user_id: userId, track_id: trackId });
};

const getLikeCountByTrackId = async (trackId) => {
  return Like.countDocuments({ track_id: trackId });
};

const getLikesByTrackId = async (trackId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const likes = await Like.find({ track_id: trackId })
    .populate("user_id", "username display_name avatar_url")
    .skip(skip)
    .limit(limit)
    .lean();
  
  const total = await Like.countDocuments({ track_id: trackId });
  
  return { likes, total, page, limit };
};

const checkUserLikedTrack = async (userId, trackId) => {
  const like = await Like.findOne({ user_id: userId, track_id: trackId });
  return !!like;
};

const getUserLikedTracks = async (userId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const tracks = await Like.find({ user_id: userId })
    .populate("track_id")
    .skip(skip)
    .limit(limit)
    .lean();
  
  const total = await Like.countDocuments({ user_id: userId });
  
  return { tracks, total, page, limit };
};

const createAlbumLike = async (userId, albumId) => {
  return AlbumLike.create({ user_id: userId, album_id: albumId });
};

const findAlbumLike = async (userId, albumId) => {
  return AlbumLike.findOne({ user_id: userId, album_id: albumId });
};

const deleteAlbumLike = async (userId, albumId) => {
  return AlbumLike.deleteOne({ user_id: userId, album_id: albumId });
};

const getLikesByAlbumId = async (albumId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const likes = await AlbumLike.find({ album_id: albumId })
    .populate("user_id", "username display_name avatar_url")
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await AlbumLike.countDocuments({ album_id: albumId });

  return { likes, total, page, limit };
};

const checkUserLikedAlbum = async (userId, albumId) => {
  const like = await AlbumLike.findOne({ user_id: userId, album_id: albumId });
  return !!like;
};

export default {
  createLike,
  findLike,
  deleteLike,
  getLikeCountByTrackId,
  getLikesByTrackId,
  checkUserLikedTrack,
  getUserLikedTracks,
  createAlbumLike,
  findAlbumLike,
  deleteAlbumLike,
  getLikesByAlbumId,
  checkUserLikedAlbum,
};
