import userRepository from "../repositories/user.repository.js";

const getPublicProfile = async (userId) => {
  if (!userId) {
    throw new Error("User ID is required");
  }
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }
  if (user.is_suspended) {
    throw new Error("User is suspended");
  }
  if (user.is_private) {
    throw new Error("User is private");
  }
  return {
    username: user.username,
    display_name: user.display_name,
    bio: user.bio,
    is_verified: user.is_verified,
    location: user.location,
    avatar_url: user.avatar_url,
    cover_url: user.cover_url,
    track_count: user.track_count,
    followers_count: user.followers_count,
    social_links: user.social_links,
    tier: user.tier,
    playlist_count: user.playlist_count,
    favorite_genres: user.favorite_genres,
    following_count: user.following_count,
  };
};

const updateProfile = async (userId, updateData) => {
  
  if (!updateData) {
    throw new Error("Update data is required");
  }
  if (!userId) {
    throw new Error("User ID is required");
  }
  const user = await userRepository.updateById(userId, updateData);
  if (!user) {
    throw new Error("User not found");
  }
  return user;
};

const searchUsers = async (q, page = 1, limit = 20) => {
  return await userRepository.searchUsers(q, page, limit);
};

export default {
  getPublicProfile,
  updateProfile,
  searchUsers,
};
