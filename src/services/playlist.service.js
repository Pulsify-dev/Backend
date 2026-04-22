import playlistRepository from "../repositories/playlist.repository.js";
import Track from "../models/track.model.js";
import subscriptionService from "./subscription.service.js";
import { ForbiddenError } from "../utils/errors.utils.js";

const enforcePlaylistCreationQuota = async (creatorId) => {
  const entitlement = await subscriptionService.getPlanLimitForUser(creatorId);
  if (Number.isInteger(entitlement.planLimit.playlist_limit)) {
    const playlistCount = await playlistRepository.countManagedPlaylistsByCreator(
      creatorId,
    );

    if (playlistCount >= entitlement.planLimit.playlist_limit) {
      throw new ForbiddenError(
        `Playlist limit reached for ${entitlement.effectivePlan} plan (${entitlement.planLimit.playlist_limit} playlists).`,
      );
    }
  }
};

const enforcePlaylistTrackQuota = async (creatorId, currentTrackCount) => {
  const entitlement = await subscriptionService.getPlanLimitForUser(creatorId);
  if (Number.isInteger(entitlement.planLimit.playlist_track_limit)) {
    if (currentTrackCount >= entitlement.planLimit.playlist_track_limit) {
      throw new ForbiddenError(
        `Playlist track limit reached for ${entitlement.effectivePlan} plan (${entitlement.planLimit.playlist_track_limit} tracks per playlist).`,
      );
    }
  }
};

const createPlaylist = async (creatorId, playlistData) => {
  await enforcePlaylistCreationQuota(creatorId);

  const playlist = await playlistRepository.create({
    ...playlistData,
    creator_id: creatorId,
  });
  return playlist;
};

const getPlaylist = async (playlistId) => {
  const playlist = await playlistRepository.findWithTracks(playlistId);
  if (!playlist) {
    throw new Error("Playlist not found");
  }
  return playlist;
};

const getPlaylistByPermalink = async (permalink, includePrivate = false) => {
  const playlist = await playlistRepository.findByPermalink(
    permalink,
    "creator_id"
  );

  if (!playlist) {
    throw new Error("Playlist not found");
  }

  if (playlist.is_private && !includePrivate) {
    throw new Error("This is a private playlist");
  }

  return await playlistRepository.findWithTracks(playlist._id);
};

const getPlaylistBySecretToken = async (secretToken, playlistId = null) => {
  const playlist = await playlistRepository.findBySecretToken(
    secretToken,
    "creator_id"
  );

  if (!playlist) {
    throw new Error("Invalid secret token");
  }
  if (playlistId && playlist._id.toString() !== playlistId.toString()) {
    throw new Error("Token does not match this playlist");
  }

  return await playlistRepository.findWithTracks(playlist._id);
};

const updatePlaylist = async (playlistId, creatorId, updateData) => {
  const playlist = await playlistRepository.findById(playlistId);

  if (!playlist) {
    throw new Error("Playlist not found");
  }
  if (playlist.creator_id.toString() !== creatorId.toString()) {
    throw new Error("Unauthorized: You can only update your own playlists");
  }
  const allowedFields = ["title", "description", "cover_url"];
  allowedFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      playlist[field] = updateData[field];
    }
  });

  return await playlist.save();
};

const deletePlaylist = async (playlistId, creatorId) => {
  const playlist = await playlistRepository.findById(playlistId);

  if (!playlist) {
    throw new Error("Playlist not found");
  }

  if (playlist.creator_id.toString() !== creatorId.toString()) {
    throw new Error("Unauthorized: You can only delete your own playlists");
  }
  return await playlistRepository.deleteById(playlistId);
};

const getUserPlaylists = async (userId, options = {}) => {
  return playlistRepository.findByCreatorId(userId, options);
};

const addTrackToPlaylist = async (playlistId, trackId, creatorId) => {
  const playlist = await playlistRepository.findById(playlistId);
  if (!playlist) {
    throw new Error("Playlist not found");
  }

  if (playlist.creator_id.toString() !== creatorId.toString()) {
    throw new Error("Unauthorized: You can only modify your own playlists");
  }

  const track = await Track.findById(trackId);
  if (!track) {
    throw new Error("Track not found");
  }

  await enforcePlaylistTrackQuota(creatorId, playlist.tracks.length);

  playlist.addTrack(trackId);
  playlist.track_count = playlist.tracks.length;

  return await playlist.save();
};

const removeTrackFromPlaylist = async (playlistId, trackId, creatorId) => {
  const playlist = await playlistRepository.findById(playlistId);

  if (!playlist) {
    throw new Error("Playlist not found");
  }

  if (playlist.creator_id.toString() !== creatorId.toString()) {
    throw new Error("Unauthorized: You can only modify your own playlists");
  }

  playlist.removeTrack(trackId);
  playlist.track_count = playlist.tracks.length;

  return await playlist.save();
};

const reorderTracks = async (playlistId, creatorId, newOrder) => {
  const playlist = await playlistRepository.findById(playlistId);

  if (!playlist) {
    throw new Error("Playlist not found");
  }

  if (playlist.creator_id.toString() !== creatorId.toString()) {
    throw new Error("Unauthorized: You can only modify your own playlists");
  }

  if (!Array.isArray(newOrder)) {
    throw new Error("Order must be an array of track IDs");
  }

  if (newOrder.length !== playlist.tracks.length) {
    throw new Error("Order array length must match number of tracks");
  }

  playlist.reorderTracks(newOrder);

  return await playlist.save();
};

const moveTrack = async (playlistId, trackId, newPosition, creatorId) => {
  const playlist = await playlistRepository.findById(playlistId);

  if (!playlist) {
    throw new Error("Playlist not found");
  }

  if (playlist.creator_id.toString() !== creatorId.toString()) {
    throw new Error("Unauthorized: You can only modify your own playlists");
  }

  if (newPosition < 0 || newPosition >= playlist.tracks.length) {
    throw new Error("Invalid position");
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

const updatePlaylistPrivacy = async (playlistId, creatorId, isPrivate) => {
  const playlist = await playlistRepository.findById(playlistId);

  if (!playlist) {
    throw new Error("Playlist not found");
  }

  if (playlist.creator_id.toString() !== creatorId.toString()) {
    throw new Error(
      "Unauthorized: You can only change privacy settings for your own playlists"
    );
  }

  if (isPrivate) {
    playlist.makePrivate();
  } else {
    playlist.makePublic();
  }

  return await playlist.save();
};

const regeneratePlaylistToken = async (playlistId, creatorId) => {
  const playlist = await playlistRepository.findById(playlistId);

  if (!playlist) {
    throw new Error("Playlist not found");
  }

  if (playlist.creator_id.toString() !== creatorId.toString()) {
    throw new Error("Unauthorized: You can only modify your own playlists");
  }
  if (!playlist.is_private) {
    throw new Error("Secret tokens are only for private playlists");
  }
  playlist.regenerateSecretToken();
  return await playlist.save();
};

const getEmbedCode = async (playlistId, creatorId, baseUrl = "https://pulsify.page") => {
  const playlist = await playlistRepository.findById(playlistId);

  if (!playlist) {
    throw new Error("Playlist not found");
  }

  // For public playlists, anyone can get embed code
  // For private playlists, only creator can get embed code
  if (playlist.is_private && playlist.creator_id.toString() !== creatorId.toString()) {
    throw new Error(
      "Unauthorized: You can only get embed code for your own private playlists"
    );
  }

  return {
    embedCode: playlist.getEmbedCode(baseUrl),
    embedUrl: playlist.is_private
      ? `${baseUrl}/playlists/${playlist.permalink}?token=${playlist.secret_token}`
      : `${baseUrl}/playlists/${playlist.permalink}`,
    playlistPermalink: playlist.permalink,
  };
};
const getPublicPlaylists = async (options = {}) => {
  return playlistRepository.findPublicPlaylists(options);
};

const searchPlaylists = async (query, creatorId = null, options = {}) => {
  return playlistRepository.searchByTitle(query, creatorId, options);
};

export default {
  createPlaylist,
  getPlaylist,
  getPlaylistByPermalink,
  getPlaylistBySecretToken,
  updatePlaylist,
  deletePlaylist,
  getUserPlaylists,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  reorderTracks,
  moveTrack,
  updatePlaylistPrivacy,
  regeneratePlaylistToken,
  getEmbedCode,
  getPublicPlaylists,
  searchPlaylists,
};
