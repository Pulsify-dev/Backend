import Playlist from "../models/playlist.model.js";

const create = async (playlistData) => {
  const playlist = new Playlist(playlistData);
  return await playlist.save();
};

const findById = async (playlistId, populateFields = "") => {
  return Playlist.findById(playlistId).populate(populateFields);
};

const findByPermalinkAndCreator = async (
  permalink,
  creatorId,
  populateFields = ""
) => {
  return Playlist.findOne({ permalink, creator_id: creatorId }).populate(
    populateFields
  );
};

const findByPermalink = async (permalink, populateFields = "") => {
  return Playlist.findOne({ permalink }).populate(populateFields);
};

const findByCreatorId = async (creatorId, options = {}) => {
  const { skip = 0, limit = 20, sort = "-createdAt" } = options;
  return Playlist.find({ creator_id: creatorId })
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();
};

const findPublicPlaylists = async (options = {}) => {
  const { skip = 0, limit = 20, sort = "-createdAt" } = options;
  return Playlist.find({ is_private: false })
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();
};

const findBySecretToken = async (secretToken, populateFields = "") => {
  return Playlist.findOne({ secret_token: secretToken }).populate(
    populateFields
  );
};

const findWithTracks = async (playlistId) => {
  return Playlist.findById(playlistId)
    .populate({
      path: "tracks.track_id",
      select: "title artist_id duration artwork_url genre",
      populate: {
        path: "artist_id",
        select: "username display_name avatar_url",
      },
    })
    .populate("creator_id", "username display_name avatar_url");
};

const updateById = async (playlistId, updateData) => {
  return Playlist.findByIdAndUpdate(playlistId, updateData, {
    new: true,
    runValidators: true,
  });
};
const updatePrivacy = async (playlistId, isPrivate) => {
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new Error("Playlist not found");
  }

  if (isPrivate) {
    playlist.makePrivate();
  } else {
    playlist.makePublic();
  }
  return await playlist.save();
};

const regenerateSecretToken = async (playlistId) => {
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new Error("Playlist not found");
  }

  playlist.regenerateSecretToken();
  return await playlist.save();
};

const addTrackToPlaylist = async (playlistId, trackId, position) => {
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new Error("Playlist not found");
  }

  playlist.addTrack(trackId, position);
  return await playlist.save();
};

const removeTrackFromPlaylist = async (playlistId, trackId) => {
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new Error("Playlist not found");
  }

  playlist.removeTrack(trackId);
  return await playlist.save();
};

const reorderPlaylistTracks = async (playlistId, newOrder) => {
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new Error("Playlist not found");
  }

  playlist.reorderTracks(newOrder);
  return await playlist.save();
};

const moveTrackInPlaylist = async (playlistId, trackId, newPosition) => {
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new Error("Playlist not found");
  }

  const trackIndex = playlist.tracks.findIndex(
    (t) => t.track_id.toString() === trackId.toString()
  );
  if (trackIndex === -1) {
    throw new Error("Track not found in playlist");
  }

  const [track] = playlist.tracks.splice(trackIndex, 1);

  playlist.tracks.splice(newPosition, 0, track);
  playlist.tracks.forEach((t, index) => {
    t.position = index;
  });
  return await playlist.save();
};
const deleteById = async (playlistId) => {
  return Playlist.findByIdAndDelete(playlistId);
};

const deleteByCreatorId = async (creatorId) => {
  return Playlist.deleteMany({ creator_id: creatorId });
};

const countPlaylistsByCreator = async (creatorId) => {
  return Playlist.countDocuments({ creator_id: creatorId });
};

const getTotalTrackDuration = async (playlistId) => {
  const playlist = await Playlist.findById(playlistId)
    .populate({
      path: "tracks.track_id",
      select: "duration",
    });

  if (!playlist) {
    throw new Error("Playlist not found");
  }

  const totalDuration = playlist.tracks.reduce((sum, track) => {
    return sum + (track.track_id?.duration || 0);
  }, 0);

  return totalDuration;
};

const searchByTitle = async (title, creatorId = null, options = {}) => {
  const { skip = 0, limit = 20 } = options;
  const query = {
    title: { $regex: title, $options: "i" },
    ...(creatorId && { creator_id: creatorId }),
  };

  return Playlist.find(query).skip(skip).limit(limit).lean();
};

const findByCreatorIdAndTitle = async (creatorId, title) => {
  return Playlist.findOne({ creator_id: creatorId, title });
};

export default {
  create,
  findById,
  findByPermalinkAndCreator,
  findByPermalink,
  findByCreatorId,
  findPublicPlaylists,
  findBySecretToken,
  findWithTracks,
  updateById,
  updatePrivacy,
  regenerateSecretToken,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  reorderPlaylistTracks,
  moveTrackInPlaylist,
  deleteById,
  deleteByCreatorId,
  countPlaylistsByCreator,
  getTotalTrackDuration,
  searchByTitle,
  findByCreatorIdAndTitle,
};
