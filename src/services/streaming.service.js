import trackRepository from "../repositories/track.repository.js";
import S3Utils from "../utils/s3.utils.js";
import { NotFoundError, ForbiddenError } from "../utils/errors.utils.js";

/**
 * Generates a signed CDN URL for streaming.
 * Validates auth and playback state.
 */
const getStreamUrl = async (trackId, user) => {
  const track = await trackRepository.findById(trackId);
  if (!track) throw new NotFoundError("Track not found");

  // Playback state gating
  if (track.playback_state === "blocked") {
    throw new ForbiddenError("Track is blocked.");
  }

  const url = await S3Utils.getPresignedUrl(track.audio_url, 900); // 15 min

  return {
    url,
    expires_at: new Date(Date.now() + 900 * 1000),
    playback_state: track.playback_state,
    preview_duration_seconds: track.playback_state === "preview" ? 30 : null,
  };
};

/**
 * Generates a signed download URL. Only for ArtistPro users.
 */
const getDownloadUrl = async (trackId, user) => {
  if (user.tier !== "ArtistPro") {
    throw new ForbiddenError("Requires ArtistPro plan.");
  }

  const track = await trackRepository.findById(trackId);
  if (!track) throw new NotFoundError("Track not found");

  const url = await S3Utils.getPresignedUrl(track.audio_url, 3600); // 1 hour

  return { url };
};

export default {
  getStreamUrl,
  getDownloadUrl,
};
