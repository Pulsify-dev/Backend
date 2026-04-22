import Track from "../models/track.model.js";
import cache from "../utils/cache.utils.js";

const TRACK_TTL = 5 * 60; // 5 minutes

const findById = async function (id, extraFields = "") {
  // Only cache default projections (no extra fields)
  if (!extraFields) {
    const cacheKey = `track:${id}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const track = await Track.findById(id).lean();
    if (track) await cache.set(cacheKey, track, TRACK_TTL);
    return track;
  }
  return Track.findById(id).select(extraFields).lean();
};

const findPublicById = function (id, extraFields = "") {
return Track.findOne({ _id: id, visibility: "public", is_hidden: false }).select(extraFields);}

const updateTrackById = async function (id, updatedPatch) {
  await cache.del(`track:${id}`);
  return Track.findByIdAndUpdate(id, updatedPatch, {
    returnDocument: "after",
    runValidators: true,
  });
};

const deleteById = async function (id) {
  await cache.del(`track:${id}`);
  return Track.findByIdAndDelete(id);
};

const createTrack = function (trackData) {
  return Track.create(trackData);
};

const findByPermalink = function (permalink, extraFields = "") {
  return Track.findOne({ permalink }).select(extraFields);
};

const searchTracks = async (q, page, limit) => {
  const filter = { is_hidden: false };

  if (q && q.trim()) {
    const regex = new RegExp(q.trim(), "i");
    filter.$or = [{ title: regex }, { description: regex }];
  }

  const tracks = await Track.find(filter)
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  const total = await Track.countDocuments(filter);

  return { tracks, total };
};

const findByArtistId = function (artistId, page = 1, limit = 20,extraFields = "") {
  const filter = { artist_id: artistId, is_hidden: false };
  const skip = (page - 1) * limit;
  return Track.find(filter).select(extraFields).skip(skip).limit(limit).lean();
};

const countByArtistId = function (artistId) {
  return Track.countDocuments({ artist_id: artistId });
};

const findByPermalinkAndArtist = function (permalink, artistId, extraFields = "") {
  return Track.findOne({ permalink, artist_id: artistId }).select(extraFields);
};

const findTrending = async function (page = 1, limit = 20, genre = null) {
  const filter = {
    visibility: "public",
    is_hidden: false,
    status: "finished",
    trending_score: { $gt: 0 },
  };
  if (genre) filter.genre = genre;

  const skip = (page - 1) * limit;
  const [tracks, total] = await Promise.all([
    Track.find(filter)
      .sort({ trending_score: -1 })
      .skip(skip)
      .limit(limit)
      .populate("artist_id", "username display_name avatar_url is_verified")
      .lean(),
    Track.countDocuments(filter),
  ]);

  return { tracks, total };
};

const findCharts = async function (limit = 50, genre = null) {
  const filter = {
    visibility: "public",
    is_hidden: false,
    status: "finished",
    trending_score: { $gt: 0 },
  };
  if (genre) filter.genre = genre;

  const tracks = await Track.find(filter)
    .sort({ trending_score: -1 })
    .limit(limit)
    .populate("artist_id", "username display_name avatar_url is_verified")
    .lean();

  return tracks;
};

const invalidateTrackCache = async (trackId) => {
  await cache.del(`track:${trackId}`);
};

export default {
  findById,
  updateTrackById,
  deleteById,
  findByPermalink,
  searchTracks,
  findByArtistId,
  countByArtistId,
  createTrack,
  findPublicById,
  findByPermalinkAndArtist,
  findTrending,
  findCharts,
  invalidateTrackCache,
};

