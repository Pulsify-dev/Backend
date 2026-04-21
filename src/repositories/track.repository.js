import Track from "../models/track.model.js";

const findById = function (id, extraFields = "") {
  return Track.findById(id).select(extraFields);
};

const findPublicById = function (id, extraFields = "") {
return Track.findOne({ _id: id, visibility: "public", is_hidden: false }).select(extraFields);}

const updateTrackById = function (id, updatedPatch) {
  return Track.findByIdAndUpdate(id, updatedPatch, {
    returnDocument: "after",
    runValidators: true,
  });
};

const deleteById = function (id) {
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
};

