import playHistoryRepository from "../repositories/play-history.repository.js";
import trackRepository from "../repositories/track.repository.js";
import { NotFoundError, ForbiddenError } from "../utils/errors.utils.js";

// ── Minimum listen to count as a play: 50% of track OR 30 seconds (whichever is lower) ──
const MIN_PLAY_SECONDS = 30;
const MIN_PLAY_RATIO = 0.5;
const PREVIEW_DURATION_SECONDS = 30;
const PREVIEW_PLAYBACK_CONTEXTS = new Set(["feed", "discovery"]);

// ════════════════════════════════════════════════════
//  STREAMING
// ════════════════════════════════════════════════════

/**
 * Returns the public S3 URL for streaming.
 * Access control is handled by auth middleware on the route layer.
 * The bucket is public; the backend is the gatekeeper, not S3.
 */
const getStreamUrl = async (trackId, user, playbackContext = "track") => {
  const track = await trackRepository.findById(trackId);
  if (!track) throw new NotFoundError("Track not found");

  if (track.visibility === "private" && track.artist_id.toString() !== user.user_id.toString()) {
    throw new ForbiddenError("You do not have access to this private track.");
  }

  // Playback state gating
  if (track.playback_state === "blocked") {
    throw new ForbiddenError("Track is blocked.");
  }

  const normalizedPlaybackContext =
    typeof playbackContext === "string"
      ? playbackContext.toLowerCase().trim()
      : "";
  const playbackMode = PREVIEW_PLAYBACK_CONTEXTS.has(normalizedPlaybackContext)
    ? "preview"
    : "full";
  const maxPreviewStart = Math.max(track.duration - PREVIEW_DURATION_SECONDS, 0);
  const rawPreviewStart = Number.isInteger(track.preview_start_seconds)
    ? track.preview_start_seconds
    : 0;
  const previewStartSeconds = Math.min(
    Math.max(rawPreviewStart, 0),
    maxPreviewStart,
  );

  return {
    url: track.audio_url,
    access_policy: track.playback_state,
    playback_state: track.playback_state,
    playback_mode: playbackMode,
    preview_start_seconds:
      playbackMode === "preview" ? previewStartSeconds : null,
    preview_duration_seconds:
      playbackMode === "preview" ? PREVIEW_DURATION_SECONDS : null,
  };
};

/**
 * Returns the public S3 URL for download. Only for ArtistPro users.
 * Access control: auth middleware + tier check in this function.
 */
const getDownloadUrl = async (trackId, user) => {
  if (user.tier !== "Artist Pro") {
    throw new ForbiddenError("Requires ArtistPro plan.");
  }

  const track = await trackRepository.findById(trackId);
  if (!track) throw new NotFoundError("Track not found");

  if (track.visibility === "private" && track.artist_id.toString() !== user.user_id.toString()) {
    throw new ForbiddenError("You do not have access to this private track.");
  }

  return { url: track.audio_url };
};

// ════════════════════════════════════════════════════
//  PLAY HISTORY
// ════════════════════════════════════════════════════

/**
 * Records a play event IF the user listened long enough to count.
 * A play counts if: duration_played_ms >= 50% of track OR >= 30 seconds.
 * is_completed is set to true if duration_played_ms >= 90% of track (analytics).
 */
const recordPlay = async (userId, trackId, durationPlayedMs) => {
  const track = await trackRepository.findById(trackId);
  if (!track) {
    throw new NotFoundError("Track not found");
  }

  const trackDurationMs = track.duration * 1000;

  // Check if this listen is long enough to count as a play
  const meetsRatio = durationPlayedMs >= trackDurationMs * MIN_PLAY_RATIO;
  const meetsMinTime = durationPlayedMs >= MIN_PLAY_SECONDS * 1000;
  const countsAsPlay = meetsRatio || meetsMinTime;

  if (!countsAsPlay) {
    return {
      counted: false,
      message: `Play not recorded — must listen to at least 50% of the track or 30 seconds.`,
    };
  }

  // Record the play in history
  const entry = await playHistoryRepository.recordPlay(
    userId,
    trackId,
    durationPlayedMs,
    trackDurationMs, // passed to repo for 90% completion calculation
  );

  // Increment play count on the track
  await playHistoryRepository.incrementTrackPlayCount(trackId);

  return { counted: true, data: entry };
};

/**
 * Fetches paginated listening history for a user.
 */
const getHistory = async (userId, page, limit) => {
  return playHistoryRepository.getHistory(userId, page, limit);
};

/**
 * Fetches the most recently played unique tracks for a user.
 */
const getRecentlyPlayed = async (userId, page, limit) => {
  return playHistoryRepository.getRecentlyPlayed(userId, page, limit);
};

/**
 * Clears all play history for a user.
 */
const clearHistory = async (userId) => {
  return playHistoryRepository.clearHistory(userId);
};

export default {
  getStreamUrl,
  getDownloadUrl,
  recordPlay,
  getHistory,
  getRecentlyPlayed,
  clearHistory,
};
