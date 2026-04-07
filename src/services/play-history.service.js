import playHistoryRepository from "../repositories/play-history.repository.js";
import trackRepository from "../repositories/track.repository.js";
import { NotFoundError, BadRequestError } from "../utils/errors.utils.js";

// Minimum listen to count as a play: 50% of track OR 30 seconds (whichever is lower)
const MIN_PLAY_SECONDS = 30;
const MIN_PLAY_RATIO = 0.5;

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
  recordPlay,
  getHistory,
  getRecentlyPlayed,
  clearHistory,
};
