import streamingService from "../services/streaming.service.js";

// ════════════════════════════════════════════════════
//  STREAMING
// ════════════════════════════════════════════════════

// GET /v1/tracks/:track_id/stream-url
const getStreamUrl = async (req, res, next) => {
  try {
    const { track_id } = req.params;
    const { playbackContext, surface } = req.query;
    const user = req.user;

    const result = await streamingService.getStreamUrl(
      track_id,
      user,
      playbackContext || surface,
    );

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// GET /v1/tracks/:track_id/stream
const streamRedirect = async (req, res, next) => {
  try {
    const { track_id } = req.params;
    const { playbackContext, surface } = req.query;
    const user = req.user;

    const result = await streamingService.getStreamUrl(
      track_id,
      user,
      playbackContext || surface,
    );

    // Redirect to public S3 URL
    res.redirect(302, result.url);
  } catch (err) {
    next(err);
  }
};

// GET /v1/tracks/:track_id/download
const download = async (req, res, next) => {
  try {
    const { track_id } = req.params;
    const user = req.user;

    const result = await streamingService.getDownloadUrl(track_id, user);

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// ════════════════════════════════════════════════════
//  PLAY HISTORY
// ════════════════════════════════════════════════════

// POST /v1/tracks/:track_id/play
const recordPlay = async (req, res, next) => {
  try {
    const { track_id } = req.params;
    const { duration_played_ms } = req.body;
    const userId = req.user.user_id;

    const result = await streamingService.recordPlay(
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

    const result = await streamingService.getHistory(
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

    const result = await streamingService.getRecentlyPlayed(
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
    await streamingService.clearHistory(userId);

    res.status(200).json({ message: "History cleared successfully" });
  } catch (err) {
    next(err);
  }
};

export default {
  getStreamUrl,
  streamRedirect,
  download,
  recordPlay,
  getHistory,
  getRecentlyPlayed,
  clearHistory,
};
