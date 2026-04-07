import { NotFoundError, BadRequestError } from "../utils/errors.js";

class PlayHistoryService {
  constructor(playHistoryRepository, trackRepository) {
    this.playHistoryRepository = playHistoryRepository;
    this.trackRepository = trackRepository;
  }

  /**
   * Records a play event.
   * Increments the track's play count.
   */
  async recordPlay(userId, trackId, durationPlayedMs) {
    const track = await this.trackRepository.findById(trackId);
    if (!track) {
      throw new NotFoundError("Track not found");
    }

    // Record the play in history
    const entry = await this.playHistoryRepository.recordPlay(
      userId,
      trackId,
      durationPlayedMs,
      track.duration * 1000, // Convert track duration from seconds to ms
    );

    // Increment play count on the track
    await this.trackRepository.updateTrackById(trackId, {
      $inc: { play_count: 1 },
    });

    return entry;
  }

  /**
   * Fetches paginated listening history for a user.
   */
  async getHistory(userId, page, limit) {
    return this.playHistoryRepository.getHistory(userId, page, limit);
  }

  /**
   * Fetches the most recently played unique tracks for a user.
   */
  async getRecentlyPlayed(userId, page, limit) {
    return this.playHistoryRepository.getRecentlyPlayed(userId, page, limit);
  }

  /**
   * Clears all play history for a user.
   */
  async clearHistory(userId) {
    return this.playHistoryRepository.clearHistory(userId);
  }
}

export default PlayHistoryService;
