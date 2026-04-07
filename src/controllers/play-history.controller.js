import playHistoryService from "../services/play-history.service.js"; // This will need to be an instance

class PlayHistoryController {
  constructor(playHistoryService) {
    this.playHistoryService = playHistoryService;
  }

  /**
   * POST /v1/tracks/:track_id/play
   */
  recordPlay = async (req, res, next) => {
    try {
      const { track_id } = req.params;
      const { duration_played_ms } = req.body;
      const userId = req.user.user_id;

      const record = await this.playHistoryService.recordPlay(
        userId,
        track_id,
        parseInt(duration_played_ms),
      );

      res.status(200).json({
        message: "Play recorded successfully",
        data: record,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /v1/users/me/history
   */
  getHistory = async (req, res, next) => {
    try {
      const userId = req.user.user_id;
      const { page = 1, limit = 20 } = req.query;

      const result = await this.playHistoryService.getHistory(
        userId,
        parseInt(page),
        parseInt(limit),
      );

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /v1/users/me/recently-played
   */
  getRecentlyPlayed = async (req, res, next) => {
    try {
      const userId = req.user.user_id;
      const { page = 1, limit = 20 } = req.query;

      const result = await this.playHistoryService.getRecentlyPlayed(
        userId,
        parseInt(page),
        parseInt(limit),
      );

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  /**
   * DELETE /v1/users/me/history
   */
  clearHistory = async (req, res, next) => {
    try {
      const userId = req.user.user_id;
      await this.playHistoryService.clearHistory(userId);

      res.status(200).json({ message: "History cleared successfully" });
    } catch (err) {
      next(err);
    }
  };
}

export default PlayHistoryController;
