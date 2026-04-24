import userRepository from "../repositories/user.repository.js";
import reportRepository from "../repositories/report.repository.js";
import trackRepository from "../repositories/track.repository.js";
import albumRepository from "../repositories/album.repository.js";
import playHistoryRepository from "../repositories/play-history.repository.js";
import S3Utils from "../utils/s3.utils.js";
import { NotFoundError, BadRequestError, ForbiddenError } from "../utils/errors.utils.js";
const suspendUser = async (adminId, targetUserId) => {
  if (adminId.toString() === targetUserId.toString()) {
    throw new BadRequestError(
      "Security Policy: Admins cannot suspend their own accounts.",
    );
  }

  const targetUser = await userRepository.findById(targetUserId);
  if (!targetUser) throw new NotFoundError("User not found.");
  if (targetUser.role === "Admin") {
    throw new BadRequestError("Security Policy: Cannot suspend another admin.");
  }

  const user = await userRepository.updateById(targetUserId, {
    is_suspended: true,
  });
  return user;
};

const restoreUser = async (userId) => {
  const user = await userRepository.updateById(userId, { is_suspended: false });
  if (!user) throw new NotFoundError("User not found.");
  return user;
};

const getReports = async (status, page, limit) => {
  const filter = status ? { status } : {};
  return await reportRepository.findPaginated(filter, page, limit);
};
const resolveReport = async (reportId, status, adminNotes) => {
  if (!["Resolved", "Dismissed"].includes(status)) {
    throw new BadRequestError(
      "Status must be either 'Resolved' or 'Dismissed'",
    );
  }

  const updatedReport = await reportRepository.updateById(reportId, {
    status: status,
    admin_notes: adminNotes,
  });

  if (!updatedReport) throw new NotFoundError("Report not found.");
  return updatedReport;
};

const blockTrack = async (trackId) => {
  const track = await trackRepository.updateTrackById(trackId, {
    playback_state: "blocked",
  });
  if (!track) throw new NotFoundError("Track not found.");
  return track;
};

const unblockTrack = async (trackId) => {
  const track = await trackRepository.updateTrackById(trackId, {
    playback_state: "playable",
  });
  if (!track) throw new NotFoundError("Track not found.");
  return track;
};

const deleteTrack = async (trackId) => {
  const track = await trackRepository.findById(trackId);
  if (!track) throw new NotFoundError("Track not found.");

  if (track.artwork_url && !track.artwork_url.includes("default-artwork")) {
    await S3Utils.deleteFromS3(track.artwork_url).catch(() => {});
  }
  if (track.audio_url) {
    await S3Utils.deleteFromS3(track.audio_url).catch(() => {});
  }
  await trackRepository.deleteById(trackId);

  return { message: "Track successfully deleted by admin." };
};

const blockAlbum = async (albumId) => {
  const album = await albumRepository.update(albumId, { is_hidden: true });
  if (!album) throw new NotFoundError("Album not found.");
  return album;
};

const unblockAlbum = async (albumId) => {
  const album = await albumRepository.update(albumId, { is_hidden: false });
  if (!album) throw new NotFoundError("Album not found.");
  return album;
};

const deleteAlbum = async (albumId) => {
  const album = await albumRepository.findById(albumId);
  if (!album) throw new NotFoundError("Album not found.");

  if (album.artwork_url && !album.artwork_url.includes("default-album-artwork")) {
    await S3Utils.deleteFromS3(album.artwork_url).catch(() => {});
  }
  
  await albumRepository.delete(albumId);
  return { message: "Album successfully deleted by admin." };
};

const updateUserRole = async (adminId, targetUserId, role) => {
  if (adminId.toString() === targetUserId.toString()) {
    throw new BadRequestError("Admins cannot modify their own role.");
  }
  
  if (!["Admin", "User"].includes(role)) {
    throw new BadRequestError("Invalid role. Must be 'Admin' or 'User'.");
  }

  const targetUser = await userRepository.findById(targetUserId);
  if (!targetUser) throw new NotFoundError("User not found.");

  if (targetUser.is_suspended && role === "Admin") {
    throw new BadRequestError("Cannot promote a suspended user to Admin. Restore them first.");
  }

  const user = await userRepository.updateById(targetUserId, { role });
  return user;
};

const getAnalytics = async () => {
  const [userAdminStats, storageUsage, playStats, trackStats, albumStats, reportStats] = await Promise.all([
    userRepository.getUserAdminStats(),
    trackRepository.getTotalStorageUsage(),
    playHistoryRepository.getPlatformPlayStats(),
    trackRepository.getTrackModerationStats(),
    albumRepository.getAlbumModerationStats(),
    reportRepository.getReportStats(),
  ]);

  return {
    users: userAdminStats,
    content_moderation: {
      hidden_tracks: trackStats.total_blocked,
      hidden_albums: albumStats.total_hidden,
    },
    reports: reportStats,
    platform: {
      total_storage_bytes: storageUsage,
      play_statistics: playStats,
    }
  };
};

const getUsers = async (status, page, limit) => {
  const filter = {};
  if (status === "suspended") {
    filter.is_suspended = true;
  }
  return await userRepository.findPaginatedUsers(filter, page, limit);
};

const getTracks = async (status, page, limit) => {
  const filter = {};
  if (status === "blocked") {
    filter.playback_state = "blocked";
  }
  return await trackRepository.findPaginatedTracks(filter, page, limit);
};

const getAlbums = async (status, page, limit) => {
  const filter = {};
  if (status === "hidden") {
    filter.is_hidden = true;
  }
  return await albumRepository.findPaginatedAlbums(filter, page, limit);
};

export default {
  suspendUser,
  restoreUser,
  getReports,
  resolveReport,
  blockTrack,
  unblockTrack,
  deleteTrack,
  blockAlbum,
  unblockAlbum,
  deleteAlbum,
  updateUserRole,
  getAnalytics,
  getUsers,
  getTracks,
  getAlbums,
};
