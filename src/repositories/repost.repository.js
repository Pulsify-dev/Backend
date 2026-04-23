import Repost from "../models/repost.model.js";
import AlbumRepost from "../models/album-repost.model.js";

const createRepost = async (userId, trackId) => {
  return Repost.create({ user_id: userId, track_id: trackId });
};

const findRepost = async (userId, trackId) => {
  return Repost.findOne({ user_id: userId, track_id: trackId });
};

const deleteRepost = async (userId, trackId) => {
  return Repost.deleteOne({ user_id: userId, track_id: trackId });
};

const getRepostCountByTrackId = async (trackId) => {
  return Repost.countDocuments({ track_id: trackId });
};

const getRepostsByTrackId = async (trackId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const reposts = await Repost.find({ track_id: trackId })
    .populate("user_id", "username display_name avatar_url")
    .skip(skip)
    .limit(limit)
    .lean();
  
  const total = await Repost.countDocuments({ track_id: trackId });
  
  return { reposts, total, page, limit };
};

const checkUserRepostedTrack = async (userId, trackId) => {
  const repost = await Repost.findOne({ user_id: userId, track_id: trackId });
  return !!repost;
};

const getUserRepostedTracks = async (userId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const tracks = await Repost.find({ user_id: userId })
    .populate("track_id")
    .skip(skip)
    .limit(limit)
    .lean();
  
  const total = await Repost.countDocuments({ user_id: userId });
  
  return { tracks, total, page, limit };
};

const createAlbumRepost = async (userId, albumId) => {
  return AlbumRepost.create({ user_id: userId, album_id: albumId });
};

const findAlbumRepost = async (userId, albumId) => {
  return AlbumRepost.findOne({ user_id: userId, album_id: albumId });
};

const deleteAlbumRepost = async (userId, albumId) => {
  return AlbumRepost.deleteOne({ user_id: userId, album_id: albumId });
};

const getRepostsByAlbumId = async (albumId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const reposts = await AlbumRepost.find({ album_id: albumId })
    .populate("user_id", "username display_name avatar_url")
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await AlbumRepost.countDocuments({ album_id: albumId });

  return { reposts, total, page, limit };
};

const checkUserRepostedAlbum = async (userId, albumId) => {
  const repost = await AlbumRepost.findOne({ user_id: userId, album_id: albumId });
  return !!repost;
};

export default {
  createRepost,
  findRepost,
  deleteRepost,
  getRepostCountByTrackId,
  getRepostsByTrackId,
  checkUserRepostedTrack,
  getUserRepostedTracks,
  createAlbumRepost,
  findAlbumRepost,
  deleteAlbumRepost,
  getRepostsByAlbumId,
  checkUserRepostedAlbum,
};
