import Follow from '../models/follow.model.js';
import Block from '../models/block.model.js';
import User from '../models/user.model.js';
import followRepository from '../repositories/follow.repository.js';
import blockRepository from '../repositories/block.repository.js';

const followUser = async (followerId, followingId) => {
  const existingFollow = await followRepository.findFollow(followerId, followingId);
  if (existingFollow) {
    throw new Error('Already following this user');
  }

  const isFollowerBlocked = await blockRepository.isBlocked(followingId, followerId);
  if (isFollowerBlocked) {
    throw new Error('Cannot follow a user who has blocked you');
  }
  const targetUser = await User.findById(followingId);
  if (!targetUser) {
    throw new Error('User not found');
  }
  const follow = await followRepository.createFollow(followerId, followingId);

  await Promise.all([
    User.findByIdAndUpdate(
      followerId,
      { $inc: { following_count: 1 } },
      { new: true }
    ),
    User.findByIdAndUpdate(
      followingId,
      { $inc: { followers_count: 1 } },
      { new: true }
    ),
  ]);
  return follow;
};
const unfollowUser = async (followerId, followingId) => {
  const existingFollow = await followRepository.findFollow(followerId, followingId);
  if (!existingFollow) {
    throw new Error('Not following this user');
  }

  await followRepository.deleteFollow(followerId, followingId);

  await Promise.all([
    User.findByIdAndUpdate(
      followerId,
      { $inc: { following_count: -1 } },
      { new: true }
    ),
    User.findByIdAndUpdate(
      followingId,
      { $inc: { followers_count: -1 } },
      { new: true }
    ),
  ]);


  return { success: true, message: 'Unfollowed successfully' };
};
const getFollowersList = async (userId, page = 1, limit = 20) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  return followRepository.getFollowers(userId, page, limit);
};

const getAllFollowers = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const followers = await Follow.find({
    following_id: userId,
    status: 'active',
  })
    .populate({
      path: 'follower_id',
      select: 'id username display_name avatar_url is_verified followers_count',
    })
    .lean();

  return {
    followers: followers.map((f) => f.follower_id),
    total: followers.length,
  };
};

const getFollowingList = async (userId, page = 1, limit = 20) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  return followRepository.getFollowing(userId, page, limit);
};

const getAllFollowing = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const following = await Follow.find({
    follower_id: userId,
    status: 'active',
  })
    .populate({
      path: 'following_id',
      select: 'id username display_name avatar_url is_verified followers_count',
    })
    .lean();

  return {
    following: following.map((f) => f.following_id),
    total: following.length,
  };
};

const getSuggestedUsers = async (userId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const alreadyFollowing = await Follow.find({
    follower_id: userId,
    status: 'active',
  }).select('following_id');

  const followingIds = alreadyFollowing.map((f) => f.following_id);
  const blockedByUser = await Block.find({
    blocker_id: userId,
  }).select('blocked_id');

  const blockedIds = blockedByUser.map((b) => b.blocked_id);

  const suggestedUsers = await User.find({
    _id: {
      $nin: [userId, ...followingIds, ...blockedIds],
    },
    is_suspended: false,
    is_private: false,
  })
    .select('id username display_name avatar_url is_verified followers_count track_count')
    .sort({ followers_count: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await User.countDocuments({
    _id: {
      $nin: [userId, ...followingIds, ...blockedIds],
    },
    is_suspended: false,
    is_private: false,
  });

  return {
    suggestedUsers,
    total,
    page,
    limit,
  };
};

const getMutualFollowersList = async (userId1, userId2, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const followersOfUser1 = await Follow.find({
    following_id: userId1,
    status: 'active',
  }).select('follower_id');

  const followerIds = followersOfUser1.map((f) => f.follower_id);

  const mutualFollows = await Follow.find({
    follower_id: { $in: followerIds },
    following_id: userId2,
    status: 'active',
  })
    .populate({
      path: 'follower_id',
      select: 'id username display_name avatar_url is_verified followers_count',
    })
    .skip(skip)
    .limit(limit)
    .lean();

  const totalMutual = await Follow.countDocuments({
    follower_id: { $in: followerIds },
    following_id: userId2,
    status: 'active',
  });

  return {
    mutualFollowers: mutualFollows.map((f) => f.follower_id),
    total: totalMutual,
    page,
    limit,
  };
};

const getRelationshipStatus = async (userId1, userId2) => {
  const isFollowing = await followRepository.isFollowing(userId1, userId2);
  const isFollowedBy = await followRepository.isFollowing(userId2, userId1);
  const isBlockedByUser1 = await blockRepository.isBlocked(userId1, userId2);
  const isBlockedByUser2 = await blockRepository.isBlocked(userId2, userId1);

  return {
    isFollowing,
    isFollowedBy,
    isMutual: isFollowing && isFollowedBy,
    isBlockedByMe: isBlockedByUser1,
    isBlockedByThem: isBlockedByUser2,
  };
};

const blockUser = async (blockerId, blockedId, reason = '') => {
  if (blockerId.toString() === blockedId.toString()) {
    throw new Error('Cannot block yourself');
  }

  const targetUser = await User.findById(blockedId);
  if (!targetUser) {
    throw new Error('User not found');
  }

  const existingBlock = await blockRepository.findBlock(blockerId, blockedId);
  if (existingBlock) {
    throw new Error('User is already blocked');
  }

  const block = await blockRepository.createBlock(blockerId, blockedId, reason);
  const follow = await followRepository.findFollow(blockerId, blockedId);
  if (follow) {
    await followRepository.deleteFollow(blockerId, blockedId);
    await Promise.all([
      User.findByIdAndUpdate(
        blockerId,
        { $inc: { following_count: -1 } },
        { new: true }
      ),
      User.findByIdAndUpdate(
        blockedId,
        { $inc: { followers_count: -1 } },
        { new: true }
      ),
    ]);
  }

  const reverseFollow = await followRepository.findFollow(blockedId, blockerId);
  if (reverseFollow) {
    await followRepository.deleteFollow(blockedId, blockerId);
    await Promise.all([
      User.findByIdAndUpdate(
        blockedId,
        { $inc: { following_count: -1 } },
        { new: true }
      ),
      User.findByIdAndUpdate(
        blockerId,
        { $inc: { followers_count: -1 } },
        { new: true }
      ),
    ]);
  }

  return block;
};

const unblockUser = async (blockerId, blockedId) => {
  const existingBlock = await blockRepository.findBlock(blockerId, blockedId);
  if (!existingBlock) {
    throw new Error('User is not blocked');
  }

  await blockRepository.deleteBlock(blockerId, blockedId);

  return { success: true, message: 'Unblocked successfully' };
};

const getBlockedUsersList = async (userId, page = 1, limit = 20) => {
  return blockRepository.getBlockedUsers(userId, page, limit);
};

const getAllBlockedUsers = async (userId) => {
  return blockRepository.getAllBlockedUsers(userId);
};

const canViewProfile = async (viewerId, targetUserId) => {
  return blockRepository.canView(viewerId, targetUserId);
};

const getBlockers = async (userId, page = 1, limit = 20) => {
  return blockRepository.getBlockers(userId, page, limit);
};

const updateBlockReason = async (blockerId, blockedId, reason) => {
  const existingBlock = await blockRepository.findBlock(blockerId, blockedId);
  if (!existingBlock) {
    throw new Error('User is not blocked');
  }

  return blockRepository.updateBlockReason(blockerId, blockedId, reason);
};

const getUserSocialCounts = async (userId) => {
  const user = await User.findById(userId).select('followers_count following_count');
  if (!user) {
    throw new Error('User not found');
  }

  const blockedCount = await blockRepository.countBlockedUsers(userId);

  return {
    followers_count: user.followers_count,
    following_count: user.following_count,
    blocked_count: blockedCount,
  };
};

export default {
  followUser,
  unfollowUser,
  getFollowersList,
  getAllFollowers,
  getFollowingList,
  getAllFollowing,
  getSuggestedUsers,
  getMutualFollowersList,
  getRelationshipStatus,
  blockUser,
  unblockUser,
  getBlockedUsersList,
  getAllBlockedUsers,
  canViewProfile,
  getBlockers,
  updateBlockReason,
  getUserSocialCounts,
};
