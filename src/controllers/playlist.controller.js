import playlistService from "../services/playlist.service.js";
import s3Utils from "../utils/s3.utils.js";

const createPlaylist = async (req, res, next) => {
  try {
    const { title, description, is_private } = req.body;
    const userId = req.user._id || req.user.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: User not authenticated",
      });
    }

    if (!title) {
      return res.status(400).json({
        success: false,
        error: "Title is required",
      });
    }

    let cover_url = null;

    // Upload cover image if provided
    if (req.file) {
      const folderPath = `playlists/${userId}`;
      cover_url = await s3Utils.uploadToS3(req.file, folderPath);
    }

    const playlist = await playlistService.createPlaylist(userId, {
      title,
      description,
      is_private: is_private ?? false,
      cover_url,
    });

    res.status(201).json({
      success: true,
      data: playlist,
    });
  } catch (error) {
    next(error);
  }
};

const getUserPlaylists = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.user_id;
    const { page = 1, limit = 20 } = req.query;

    const skip = (page - 1) * limit;
    const playlists = await playlistService.getUserPlaylists(userId, {
      skip,
      limit: parseInt(limit),
    });

    res.status(200).json({
      success: true,
      count: playlists.length,
      data: playlists,
    });
  } catch (error) {
    next(error);
  }
};

const getPlaylist = async (req, res, next) => {
  try {
    const { playlistId } = req.params;
    const { token } = req.query;

    let playlist;

    if (token) {
      playlist = await playlistService.getPlaylistBySecretToken(token, playlistId);
    } else {
      playlist = await playlistService.getPlaylist(playlistId);
    }

    res.status(200).json({
      success: true,
      data: playlist,
    });
  } catch (error) {
    next(error);
  }
};

const getPlaylistByPermalink = async (req, res, next) => {
  try {
    const { permalink } = req.params;
    const { token } = req.query;

    let playlist;

    if (token) {
      const tokenPlaylist = await playlistService.getPlaylistBySecretToken(token);
      if (tokenPlaylist.permalink !== permalink) {
        throw new Error("Token does not match this playlist permalink");
      }
      playlist = tokenPlaylist;
    } else {
      playlist = await playlistService.getPlaylistByPermalink(permalink, false);
    }
    res.status(200).json({
      success: true,
      data: playlist,
    });
  } catch (error) {
    next(error);
  }
};

const updatePlaylist = async (req, res, next) => {
  try {
    const { playlistId } = req.params;
    const userId = req.user._id || req.user.user_id;
    const { title, description, cover_url } = req.body;

    const playlist = await playlistService.updatePlaylist(
      playlistId,
      userId,
      { title, description, cover_url }
    );
    res.status(200).json({
      success: true,
      data: playlist,
    });
  } catch (error) {
    next(error);
  }
};
const deletePlaylist = async (req, res, next) => {
  try {
    const { playlistId } = req.params;
    const userId = req.user._id || req.user.user_id;

    await playlistService.deletePlaylist(playlistId, userId);

    res.status(200).json({
      success: true,
      message: "Playlist deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
const addTrack = async (req, res, next) => {
  try {
    const { playlistId, trackId } = req.params;
    const userId = req.user._id || req.user.user_id;
    if (!trackId) {
      return res.status(400).json({
        success: false,
        error: "trackId is required in the URL",
      });
    }
    const playlist = await playlistService.addTrackToPlaylist(
      playlistId,
      trackId,
      userId
    );
    res.status(200).json({
      success: true,
      message: "Track added to playlist",
      data: playlist,
    });
  } catch (error) {
    next(error);
  }
};

const removeTrack = async (req, res, next) => {
  try {
    const { playlistId, trackId } = req.params;
    const userId = req.user._id || req.user.user_id;

    const playlist = await playlistService.removeTrackFromPlaylist(
      playlistId,
      trackId,
      userId
    );

    res.status(200).json({
      success: true,
      message: "Track removed from playlist",
      data: playlist,
    });
  } catch (error) {
    next(error);
  }
};

const reorderTracks = async (req, res, next) => {
  try {
    const { playlistId } = req.params;
    const { track_order } = req.body; // Array of track IDs in desired order
    const userId = req.user._id || req.user.user_id;

    if (!Array.isArray(track_order)) {
      return res.status(400).json({
        success: false,
        error: "track_order must be an array of track IDs",
      });
    }
    const playlist = await playlistService.reorderTracks(
      playlistId,
      userId,
      track_order
    );
    res.status(200).json({
      success: true,
      message: "Tracks reordered successfully",
      data: playlist,
    });
  } catch (error) {
    next(error);
  }
};

const moveTrack = async (req, res, next) => {
  try {
    const { playlistId, trackId } = req.params;
    const { new_position } = req.body;
    const userId = req.user._id || req.user.user_id;
    if (new_position === undefined || new_position === null) {
      return res.status(400).json({
        success: false,
        error: "new_position is required",
      });
    }

    const playlist = await playlistService.moveTrack(
      playlistId,
      trackId,
      new_position,
      userId
    );
    res.status(200).json({
      success: true,
      message: "Track moved successfully",
      data: playlist,
    });
  } catch (error) {
    next(error);
  }
};
const updatePlaylistPrivacy = async (req, res, next) => {
  try {
    const { playlistId } = req.params;
    const { is_private } = req.body;
    const userId = req.user._id || req.user.user_id;
    if (typeof is_private !== "boolean") {
      return res.status(400).json({
        success: false,
        error: "is_private must be a boolean",
      });
    }
    const playlist = await playlistService.updatePlaylistPrivacy(
      playlistId,
      userId,
      is_private
    );
    res.status(200).json({
      success: true,
      message: `Playlist is now ${is_private ? "private" : "public"}`,
      data: playlist,
    });
  } catch (error) {
    next(error);
  }
};

const regenerateSecretToken = async (req, res, next) => {
  try {
    const { playlistId } = req.params;
    const userId = req.user._id || req.user.user_id;
    const playlist = await playlistService.regeneratePlaylistToken(
      playlistId,
      userId
    );
    res.status(200).json({
      success: true,
      message: "Secret token regenerated successfully",
      data: {
        playlistId: playlist._id,
        secret_token: playlist.secret_token,
        permalink: playlist.permalink,
      },
    });
  } catch (error) {
    next(error);
  }
};
//Embed
const getEmbedCode = async (req, res, next) => {
  try {
    const { playlistId } = req.params;
    const userId = req.user._id || req.user.user_id;
    const { base_url } = req.query;

    const embedData = await playlistService.getEmbedCode(
      playlistId,
      userId,
      base_url
    );

    res.status(200).json({
      success: true,
      data: embedData,
    });
  } catch (error) {
    next(error);
  }
};

const getPublicPlaylists = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const skip = (page - 1) * limit;
    const playlists = await playlistService.getPublicPlaylists({
      skip,
      limit: parseInt(limit),
    });

    res.status(200).json({
      success: true,
      count: playlists.length,
      data: playlists,
    });
  } catch (error) {
    next(error);
  }
};

const searchPlaylists = async (req, res, next) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: "Search query is required",
      });
    }

    const skip = (page - 1) * limit;
    const playlists = await playlistService.searchPlaylists(q, null, {
      skip,
      limit: parseInt(limit),
    });

    res.status(200).json({
      success: true,
      count: playlists.length,
      data: playlists,
    });
  } catch (error) {
    next(error);
  }
};

const updatePlaylistCover = async (req, res, next) => {
  try {
    const { playlistId } = req.params;
    const userId = req.user._id || req.user.user_id;

    if (!playlistId) {
      return res.status(400).json({
        success: false,
        error: "Playlist ID is required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "Cover image file is required",
      });
    }

    // Get the playlist first to check ownership
    const playlist = await playlistService.getPlaylist(playlistId);
    
    // Get creator_id - handle both populated and unpopulated cases
    const creatorId = playlist.creator_id._id || playlist.creator_id;
    
    if (creatorId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: "You can only update your own playlist cover",
      });
    }

    // Upload new cover to S3
    const folderPath = `playlists/${userId}`;
    const cover_url = await s3Utils.uploadToS3(req.file, folderPath);

    // Update playlist with new cover URL
    const updatedPlaylist = await playlistService.updatePlaylist(
      playlistId,
      userId,
      { cover_url }
    );

    res.status(200).json({
      success: true,
      message: "Playlist cover updated successfully",
      data: updatedPlaylist,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createPlaylist,
  getUserPlaylists,
  getPlaylist,
  getPlaylistByPermalink,
  updatePlaylist,
  deletePlaylist,
  addTrack,
  removeTrack,
  reorderTracks,
  moveTrack,
  updatePlaylistPrivacy,
  regenerateSecretToken,
  getEmbedCode,
  getPublicPlaylists,
  searchPlaylists,
  updatePlaylistCover,
};
