import socialService from "../services/social.service.js";
import NotificationService from "../services/notification.service.js";

const followUser = async (req, res, next) => {
  try {
    const followerId = req.user.user_id;
    const followingId = req.params.user_id;

    if (followerId.toString() === followingId) {
      return res.status(400).json({
        success: false,
        message: "Cannot follow yourself",
      });
    }

    const follow = await socialService.followUser(followerId, followingId);
    const ioInstance = req.app.get("io");
    await NotificationService.createAndDeliverNotification(
      {
        recipient_id: followingId,
        actor_id: followerId,
        action_type: "FOLLOW",
        entity_type: "Follow",
        entity_id: followingId, // Or follow._id if your service returns the doc
      },
      ioInstance,
    );

    return res.status(200).json({
      success: true,
      message: "Successfully followed user",
      data: follow,
    });
  } catch (error) {
    console.error("Follow User Error:", error.message, error.stack);
    if (error.message === "Already following this user") {
      return res.status(409).json({
        success: false,
        message: "Already following this user",
      });
    }
    next(error);
  }
};

const unfollowUser = async (req, res, next) => {
  try {
    const followerId = req.user.user_id;
    const followingId = req.params.user_id;

    const result = await socialService.unfollowUser(followerId, followingId);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getFollowers = async (req, res, next) => {
  try {
    const userId = req.params.user_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "Invalid page or limit parameters",
      });
    }

    const result = await socialService.getFollowersList(userId, page, limit);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getAllFollowers = async (req, res, next) => {
  try {
    const userId = req.params.user_id;

    const result = await socialService.getAllFollowers(userId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getFollowing = async (req, res, next) => {
  try {
    const userId = req.params.user_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "Invalid page or limit parameters",
      });
    }

    const result = await socialService.getFollowingList(userId, page, limit);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getAllFollowing = async (req, res, next) => {
  try {
    const userId = req.params.user_id;

    const result = await socialService.getAllFollowing(userId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getSuggestedUsers = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "Invalid page or limit parameters",
      });
    }

    const result = await socialService.getSuggestedUsers(userId, page, limit);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getRelationshipStatus = async (req, res, next) => {
  try {
    const userId1 = req.user.user_id;
    const userId2 = req.params.user_id;

    if (userId1.toString() === userId2) {
      return res.status(400).json({
        success: false,
        message: "Cannot check relationship with yourself",
      });
    }

    const relationship = await socialService.getRelationshipStatus(
      userId1,
      userId2,
    );

    return res.status(200).json({
      success: true,
      data: relationship,
    });
  } catch (error) {
    next(error);
  }
};

const getMutualFollowers = async (req, res, next) => {
  try {
    const userId1 = req.user.user_id;
    const userId2 = req.params.user_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    if (userId1.toString() === userId2) {
      return res.status(400).json({
        success: false,
        message: "Invalid,you cannot check mutual followers with yourself",
      });
    }

    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "Invalid page or limit parameters",
      });
    }

    const result = await socialService.getMutualFollowersList(
      userId1,
      userId2,
      page,
      limit,
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const blockUser = async (req, res, next) => {
  try {
    const blockerId = req.user.user_id;
    const blockedId = req.params.user_id;
    const { reason } = req.body || {};

    if (blockerId.toString() === blockedId) {
      return res.status(400).json({
        success: false,
        message: "Cannot block yourself",
      });
    }

    if (reason && reason.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Block reason cannot exceed 500 characters",
      });
    }

    const block = await socialService.blockUser(blockerId, blockedId, reason);

    return res.status(200).json({
      success: true,
      message: "User blocked successfully",
      data: block,
    });
  } catch (error) {
    // Handle "User is already blocked" error - return 409 Conflict
    if (error.message === "User is already blocked") {
      return res.status(409).json({
        success: false,
        message: "User is already blocked",
      });
    }
    next(error);
  }
};

const unblockUser = async (req, res, next) => {
  try {
    const blockerId = req.user.user_id;
    const blockedId = req.params.user_id;

    const result = await socialService.unblockUser(blockerId, blockedId);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getBlockedUsers = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "Invalid page or limit parameters",
      });
    }

    const result = await socialService.getBlockedUsersList(userId, page, limit);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getAllBlockedUsers = async (req, res, next) => {
  try {
    const userId = req.user.user_id;

    const result = await socialService.getAllBlockedUsers(userId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const updateBlockReason = async (req, res, next) => {
  try {
    const blockerId = req.user.user_id;
    const blockedId = req.params.user_id;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Reason is required",
      });
    }

    if (reason.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Block reason cannot exceed 500 characters",
      });
    }

    const result = await socialService.updateBlockReason(
      blockerId,
      blockedId,
      reason,
    );

    return res.status(200).json({
      success: true,
      message: "Block reason updated",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getUserSocialCounts = async (req, res, next) => {
  try {
    const userId = req.params.user_id;

    const counts = await socialService.getUserSocialCounts(userId);

    return res.status(200).json({
      success: true,
      data: counts,
    });
  } catch (error) {
    next(error);
  }
};

const getBlockers = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "Invalid page or limit parameters",
      });
    }

    const result = await socialService.getBlockers(userId, page, limit);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  followUser,
  unfollowUser,
  getFollowers,
  getAllFollowers,
  getFollowing,
  getAllFollowing,
  getSuggestedUsers,
  getRelationshipStatus,
  getMutualFollowers,
  blockUser,
  unblockUser,
  getBlockedUsers,
  getAllBlockedUsers,
  getBlockers,
  updateBlockReason,
  getUserSocialCounts,
};
