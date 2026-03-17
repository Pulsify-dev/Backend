import Block from '../models/block.model.js';
// create block relationship
const createBlock = async (blockerId, blockedId, reason = '') => {
  const block = await Block.create({
    blocker_id: blockerId,
    blocked_id: blockedId,
    reason,
  });
  return block;
};

const findBlock = async (blockerId, blockedId) => {
  return Block.findOne({
    blocker_id: blockerId,
    blocked_id: blockedId,
  });
};

const deleteBlock = async (blockerId, blockedId) => {
  return Block.deleteOne({
    blocker_id: blockerId,
    blocked_id: blockedId,
  });
};
//get users blocked by a certyain user 
const getBlockedUsers = async (userId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const blockedUsers = await Block.find({
    blocker_id: userId,
  })
    .populate({
      path: 'blocked_id',
      select: 'id username display_name avatar_url is_verified',
    })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Block.countDocuments({
    blocker_id: userId,
  });

  return {
    blockedUsers: blockedUsers.map((b) => b.blocked_id),
    total,
    page,
    limit,
  };
};

const getAllBlockedUsers = async (userId) => {
  const blockedUsers = await Block.find({
    blocker_id: userId,
  })
    .populate({
      path: 'blocked_id',
      select: 'id username display_name avatar_url is_verified',
    })
    .lean();

  return {
    blockedUsers: blockedUsers.map((b) => b.blocked_id),
    total: blockedUsers.length,
  };
};

const isBlocked = async (blockerId, blockedId) => {
  const block = await Block.findOne({
    blocker_id: blockerId,
    blocked_id: blockedId,
  });
  return !!block;
};

const canView = async (viewerId, targetUserId) => {
  const isViewerBlocked = await isBlocked(targetUserId, viewerId);
  return !isViewerBlocked;
};

const countBlockedUsers = async (userId) => {
  return Block.countDocuments({
    blocker_id: userId,
  });
};

const getBlockers = async (userId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const blockers = await Block.find({
    blocked_id: userId,
  })
    .populate({
      path: 'blocker_id',
      select: 'id username display_name avatar_url is_verified',
    })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Block.countDocuments({
    blocked_id: userId,
  });

  return {
    blockers: blockers.map((b) => b.blocker_id),
    total,
    page,
    limit,
  };
};

const updateBlockReason = async (blockerId, blockedId, reason) => {
  return Block.findOneAndUpdate(
    {
      blocker_id: blockerId,
      blocked_id: blockedId,
    },
    { reason },
    { new: true }
  );
};

const getBlockDetails = async (blockerId, blockedId) => {
  return Block.findOne({
    blocker_id: blockerId,
    blocked_id: blockedId,
  })
    .populate('blocker_id', 'username display_name')
    .populate('blocked_id', 'username display_name');
};

export default {
  createBlock,
  findBlock,
  deleteBlock,
  getBlockedUsers,
  getAllBlockedUsers,
  isBlocked,
  canView,
  countBlockedUsers,
  getBlockers,
  updateBlockReason,
  getBlockDetails,
};
