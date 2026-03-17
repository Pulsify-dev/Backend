import userRepository from "../repositories/user.repository.js";
import emailService from "./email.service.js";
import crypto from "crypto";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const AVATAR_MAX_BYTES = 5 * 1024 * 1024;   // 5 MB
const COVER_MAX_BYTES = 10 * 1024 * 1024;  // 10 MB

const toPublicProfile = (user) => ({
  _id: user._id,
  username: user.username,
  display_name: user.display_name,
  bio: user.bio,
  is_verified: user.is_verified,
  location: user.location,
  avatar_url: user.avatar_url,
  cover_url: user.cover_url,
  track_count: user.track_count,
  followers_count: user.followers_count,
  following_count: user.following_count,
  social_links: user.social_links,
  tier: user.tier,
  favorite_genres: user.favorite_genres,
  created_at: user.createdAt,
});

const toPrivateProfile = (user) => ({
  ...toPublicProfile(user),
  email: user.email,
  is_private: user.is_private,
  playlist_count: user.playlist_count,
  upload_duration_used_seconds: user.upload_duration_used_seconds,
  storage_used_bytes: user.storage_used_bytes,
});

const validateImageFile = (file, maxBytes) => {
  if (!file) throw new Error("No file provided.");
  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype))
    throw new Error("Invalid file format. Only JPEG, PNG, and WebP are allowed.");
  if (file.size > maxBytes)
    throw new Error(`File exceeds the ${maxBytes / (1024 * 1024)} MB limit.`);
};


const getPublicProfile = async (userId) => {
  const user = await userRepository.findById(userId);

  // Treat suspended and private profiles the same as not found
  // to avoid leaking internal state to callers
  if (!user || user.is_suspended || user.is_private)
    throw new Error("User not found or private profile inaccessible.");

  return toPublicProfile(user);
};

const getMyProfile = async (userId) => {
  const user = await userRepository.findById(userId);
  if (!user) throw new Error("User not found.");
  if (user.is_suspended) throw new Error("Forbidden: Suspended account.");

  return toPrivateProfile(user);
};

const updateMyProfile = async (userId, updateData) => {
  const updatableFields = [
    "display_name",
    "bio",
    "location",
    "favorite_genres",
    "social_links",
    "is_private",
  ];

  const allowedUpdates = Object.fromEntries(
    Object.entries(updateData).filter(([key]) => updatableFields.includes(key))
  );

  if (Object.keys(allowedUpdates).length === 0)
    throw new Error("No valid fields provided.");

  const updatedUser = await userRepository.updateById(userId, allowedUpdates);
  if (!updatedUser) throw new Error("User not found.");

  return toPrivateProfile(updatedUser);
};

const deleteMyAccount = async (userId, password) => {
  if (!password) throw new Error("Current password is required.");

  const user = await userRepository.findById(userId, "+password");
  if (!user) throw new Error("User not found.");

  const isMatch = await user.comparePassword(password, user.password);
  if (!isMatch) throw new Error("Incorrect password.");

  await userRepository.deleteById(userId);
  return { message: "Account successfully deleted." };
};

const initiateEmailChange = async (userId, newEmail, currentPassword) => {
  const user = await userRepository.findById(userId, "+password");
  if (!user) throw new Error("User not found.");

  const isMatch = await user.comparePassword(currentPassword, user.password);
  if (!isMatch) throw new Error("Incorrect current password.");

  const emailInUse = await userRepository.emailExists(newEmail, userId);
  if (emailInUse) throw new Error("Email already in use.");

  const token = crypto.randomBytes(32).toString("hex");
  const expires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  await userRepository.updateById(userId, {
    pending_email: newEmail,
    pending_email_token: token,
    pending_email_expires: expires,
  });

  await emailService.sendEmailChangeVerification(newEmail, token);

  return { message: "Check new inbox for verification link." };
};

const confirmEmailChange = async (token) => {
  const user = await userRepository.findUserByPendingEmailToken(token);
  if (!user) throw new Error("Invalid or expired email change token.");

  await userRepository.updateById(user._id, {
    email: user.pending_email,
    pending_email: null,
    pending_email_token: null,
    pending_email_expires: null,
  });

  return { message: "Email address updated successfully." };
};

const uploadProfileImage = async (userId, file, type) => {
  const maxBytes = type === "avatar" ? AVATAR_MAX_BYTES : COVER_MAX_BYTES;
  validateImageFile(file, maxBytes);

  // Note: Temporary mock URL — replace with real AWS S3 upload once integrated
  const mockCdnUrl = `https://cdn.pulsify.app/mock/${type}_${userId}_${Date.now()}.png`;

  const updateField = type === "avatar"
    ? { avatar_url: mockCdnUrl }
    : { cover_url: mockCdnUrl };

  await userRepository.updateById(userId, updateField);

  return { url: mockCdnUrl };
};

const searchUsers = async (q, page = 1, limit = 20) => {
  const { users, total } = await userRepository.searchUsers(q, page, limit);
  return {
    data: users,
    pagination: { page, limit, total },
  };
};

export default {
  getPublicProfile,
  getMyProfile,
  updateMyProfile,
  deleteMyAccount,
  initiateEmailChange,
  confirmEmailChange,
  uploadProfileImage,
  searchUsers,
};