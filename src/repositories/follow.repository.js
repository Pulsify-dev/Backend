import Follow from "../models/follow.model.js";
import User from "../models/user.model.js";
//create the followe relationship
const createFollow = async (followerId, followingId) => {
  const follow = await Follow.create({
    follower_id: followerId,
    following_id: followingId,
    status: "active",
  });
  return follow;
};

const findFollow = async (followerId, followingId) => {
  return Follow.findOne({
    follower_id: followerId,
    following_id: followingId,
  });
};

const deleteFollow = async (followerId, followingId) => {
  return Follow.deleteOne({
    follower_id: followerId,
    following_id: followingId,
  });
};
//get user followers 20 per page
const getFollowers = async (userId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const followers = await Follow.find({
    following_id: userId,
  })
    .populate({
      path: "follower_id",
      select: "id username display_name avatar_url is_verified",
    })
    .skip(skip)
    .limit(limit)
    .lean();
  const total = await Follow.countDocuments({
    following_id: userId,
  });
  return {
    followers: followers.map((f) => f.follower_id),
    total,
    page,
    limit,
  };
};
//get user followings 20 follower per page
const getFollowing = async (userId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const following = await Follow.find({
    follower_id: userId,
  })
    .populate({
      path: "following_id",
      select: "id username display_name avatar_url is_verified",
    })
    .skip(skip)
    .limit(limit)
    .lean();
  const total = await Follow.countDocuments({
    follower_id: userId,
  });
  return {
    following: following.map((f) => f.following_id),
    total,
    page,
    limit,
  };
};

// Count followers
const countFollowers = async (userId) => {
  return Follow.countDocuments({
    following_id: userId,
  });
};

// Count following
const countFollowing = async (userId) => {
  return Follow.countDocuments({
    follower_id: userId,
  });
};

const isFollowing = async (followerId, followingId) => {
  const follow = await Follow.findOne({
    follower_id: followerId,
    following_id: followingId,
  });
  return !!follow;
};

const getMutualFollowers = async (userId1, userId2, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  // Find users following userId1
  const followersOfUser1 = await Follow.find({
    following_id: userId1,
  }).select("follower_id");

  const followerIds = followersOfUser1.map((f) => f.follower_id);
  
  // Get total count BEFORE pagination
  const total = await Follow.countDocuments({
    follower_id: { $in: followerIds },
    following_id: userId2,
  });
  
  const mutualFollows = await Follow.find({
    follower_id: { $in: followerIds },
    following_id: userId2,
  })
    .populate({
      path: "follower_id",
      select: "id username display_name avatar_url is_verified",
    })
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    mutualFollowers: mutualFollows.map((f) => f.follower_id),
    total,
    page,
    limit,
  };
};

export default {
  createFollow,
  findFollow,
  deleteFollow,
  getFollowers,
  getFollowing,
  countFollowers,
  countFollowing,
  isFollowing,
  getMutualFollowers,
};
