import engagementService from "../services/engagement.service.js";
import NotificationService from "../services/notification.service.js";
import Track from "../models/track.model.js";
const likeTrack = async (req, res, next) => {
  try {
    const result = await engagementService.likeTrack(
      req.user.user_id,
      req.params.track_id,
    );
    const track = await Track.findById(req.params.track_id);
    if (track) {
      const ioInstance = req.app.get("io");
      await NotificationService.createAndDeliverNotification(
        {
          recipient_id: track.artist_id,
          actor_id: req.user.user_id,
          action_type: "LIKE",
          entity_type: "Track",
          entity_id: track._id,
        },
        ioInstance,
      );
    }
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};
const unlikeTrack = async (req, res, next) => {
  try {
    const result = await engagementService.unlikeTrack(
      req.user.user_id,
      req.params.track_id,
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
const getLikesByTrack = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "Invalid page or limit parameters",
      });
    }

    const result = await engagementService.getLikesByTrack(
      req.params.track_id,
      page,
      limit,
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
const checkUserLikedTrack = async (req, res, next) => {
  try {
    const liked = await engagementService.checkUserLikedTrack(
      req.user.user_id,
      req.params.track_id,
    );
    res.status(200).json({ track_id: req.params.track_id, liked });
  } catch (err) {
    next(err);
  }
};
const repostTrack = async (req, res, next) => {
  try {
    const result = await engagementService.repostTrack(
      req.user.user_id,
      req.params.track_id,
    );
    const track = await Track.findById(req.params.track_id);
    if (track) {
      const ioInstance = req.app.get("io");
      await NotificationService.createAndDeliverNotification(
        {
          recipient_id: track.artist_id,
          actor_id: req.user.user_id,
          action_type: "REPOST",
          entity_type: "Track",
          entity_id: track._id,
        },
        ioInstance,
      );
    }
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

const unrepostTrack = async (req, res, next) => {
  try {
    const result = await engagementService.unrepostTrack(
      req.user.user_id,
      req.params.track_id,
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

const getRepostsByTrack = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "Invalid page or limit parameters",
      });
    }

    const result = await engagementService.getRepostsByTrack(
      req.params.track_id,
      page,
      limit,
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

const checkUserRepostedTrack = async (req, res, next) => {
  try {
    const reposted = await engagementService.checkUserRepostedTrack(
      req.user.user_id,
      req.params.track_id,
    );
    res.status(200).json({ track_id: req.params.track_id, reposted });
  } catch (err) {
    next(err);
  }
};

const createComment = async (req, res, next) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        error:
          "Request body is required. Send JSON with 'text' and 'timestamp_seconds'",
      });
    }

    const result = await engagementService.createComment(
      req.user.user_id,
      req.params.track_id,
      req.body,
    );
    const track = await Track.findById(req.params.track_id);
    if (track) {
      const ioInstance = req.app.get("io");
      await NotificationService.createAndDeliverNotification(
        {
          recipient_id: track.artist_id,
          actor_id: req.user.user_id,
          action_type: "COMMENT",
          entity_type: "Comment",
          entity_id: result._id || req.params.track_id,
        },
        ioInstance,
      );
    }

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

const updateComment = async (req, res, next) => {
  try {
    const result = await engagementService.updateComment(
      req.user.user_id,
      req.params.comment_id,
      req.body,
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

const deleteComment = async (req, res, next) => {
  try {
    const result = await engagementService.deleteComment(
      req.user.user_id,
      req.params.comment_id,
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

const getCommentsByTrack = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "Invalid page or limit parameters",
      });
    }

    const result = await engagementService.getCommentsByTrack(
      req.params.track_id,
      page,
      limit,
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

const getCommentReplies = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "Invalid page or limit parameters",
      });
    }

    const result = await engagementService.getCommentReplies(
      req.params.comment_id,
      page,
      limit,
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export default {
  likeTrack,
  unlikeTrack,
  getLikesByTrack,
  checkUserLikedTrack,
  repostTrack,
  unrepostTrack,
  getRepostsByTrack,
  checkUserRepostedTrack,
  createComment,
  updateComment,
  deleteComment,
  getCommentsByTrack,
  getCommentReplies,
};
