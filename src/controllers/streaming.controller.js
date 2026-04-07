import streamingService from "../services/streaming.service.js";

// GET /v1/tracks/:track_id/stream-url
const getStreamUrl = async (req, res, next) => {
  try {
    const { track_id } = req.params;
    const user = req.user;

    const result = await streamingService.getStreamUrl(track_id, user);

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// GET /v1/tracks/:track_id/stream
const streamRedirect = async (req, res, next) => {
  try {
    const { track_id } = req.params;
    const user = req.user;

    const result = await streamingService.getStreamUrl(track_id, user);

    // Redirect to signed S3 URL
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

export default {
  getStreamUrl,
  streamRedirect,
  download,
};
