import playHistoryService from "../services/play-history.service.js";

// POST /v1/tracks/:track_id/play
const recordPlay = async (req, res, next) => {
  try {
    const { track_id } = req.params;
    const { duration_played_ms } = req.body;
    const userId = req.user.user_id;

    const result = await playHistoryService.recordPlay(
      userId,
      track_id,
      parseInt(duration_played_ms),
    );

    if (!result.counted) {
      // Listen was too short — not recorded, but not an error
      return res.status(200).json({
        message: result.message,
        counted: false,
      });
    }

    res.status(200).json({
      message: "Play recorded successfully",
      counted: true,
      data: result.data,
    });
  } catch (err) {
    next(err);
  }
};

// GET /v1/users/me/history
const getHistory = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { page = 1, limit = 20 } = req.query;

    const result = await playHistoryService.getHistory(
      userId,
      parseInt(page),
      parseInt(limit),
    );

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// GET /v1/users/me/recently-played
const getRecentlyPlayed = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { page = 1, limit = 20 } = req.query;

    const result = await playHistoryService.getRecentlyPlayed(
      userId,
      parseInt(page),
      parseInt(limit),
    );

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// DELETE /v1/users/me/history
const clearHistory = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    await playHistoryService.clearHistory(userId);

    res.status(200).json({ message: "History cleared successfully" });
  } catch (err) {
    next(err);
  }
};

export default {
  recordPlay,
  getHistory,
  getRecentlyPlayed,
  clearHistory,
};
