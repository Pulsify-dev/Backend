import userRepository from "../repositories/user.repository.js";
import emailService from "./email.service.js";
import S3Utils from "../utils/s3.utils.js";
import crypto from "crypto";
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
  ConflictError,
} from "../utils/errors.utils.js";

import photoUtils from "../utils/photo.utils.js";
import bcrypt from "bcryptjs";
const AVATAR_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const COVER_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

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

const getPublicProfile = async (userId) => {
  const user = await userRepository.findById(userId);

  // Treat suspended and private profiles the same as not found
  // to avoid leaking internal state to callers
  if (!user || user.is_suspended || user.is_private)
    throw new NotFoundError("User not found or private profile inaccessible.");

  return toPublicProfile(user);
};

const getMyProfile = async (userId) => {
  const user = await userRepository.findById(userId);
  if (!user) throw new NotFoundError("User not found.");
  if (user.is_suspended)
    throw new ForbiddenError("Forbidden: Suspended account.");

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
    Object.entries(updateData).filter(([key]) => updatableFields.includes(key)),
  );

  if (Object.keys(allowedUpdates).length === 0)
    throw new BadRequestError("No valid fields provided.");
  if (allowedUpdates.bio !== undefined && allowedUpdates.bio.length > 500)
    throw new BadRequestError("Bio cannot exceed 500 characters.");

  const updatedUser = await userRepository.updateById(userId, allowedUpdates);
  if (!updatedUser) throw new NotFoundError("User not found.");

  return toPrivateProfile(updatedUser);
};

const deleteMyAccount = async (userId, password) => {
  if (!password) throw new BadRequestError("Current password is required.");

  const user = await userRepository.findById(userId, "+password");
  if (!user) throw new NotFoundError("User not found.");

  const isMatch = await user.comparePassword(password, user.password);
  if (!isMatch) throw new ForbiddenError("Incorrect password.");

  await userRepository.deleteById(userId);
  return { message: "Account successfully deleted." };
};

const initiateEmailChange = async (userId, newEmail, currentPassword) => {
  const user = await userRepository.findById(userId, "+password");
  if (!user) throw new NotFoundError("User not found.");

  const isMatch = await user.comparePassword(currentPassword, user.password);
  if (!isMatch) throw new ForbiddenError("Incorrect current password.");
  if (user.email === newEmail)
    throw new ConflictError(
      "New email must be different from your current email.",
    );
  const emailInUse = await userRepository.emailExists(newEmail, userId);
  if (emailInUse) throw new ConflictError("Email already in use.");

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
  if (!user)
    throw new BadRequestError("Invalid or expired email change token.");

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
  photoUtils.validateImageFile(file, maxBytes);

  // Determine S3 folder and which DB field to update
  const folder = type === "avatar" ? "users/avatars" : "users/covers";
  const urlField = type === "avatar" ? "avatar_url" : "cover_url";
  const defaultPlaceholder = "Default.png";

  // Delete old image from S3 (skip if it's the default placeholder)
  const user = await userRepository.findById(userId);
  const oldUrl = user[urlField];
  if (oldUrl && oldUrl !== defaultPlaceholder) {
    await S3Utils.deleteFromS3(oldUrl);
  }

  // Upload new image to S3
  const newUrl = await S3Utils.uploadToS3(file, folder);

  await userRepository.updateById(userId, { [urlField]: newUrl });

  return { url: newUrl };
};

const searchUsers = async (q, page = 1, limit = 20) => {
  const { users, total } = await userRepository.searchUsers(q, page, limit);
  return {
    data: users,
    pagination: { page, limit, total },
  };
};
const changePassword = async (userId, oldPassword, newPassword) => {
  const user = await userRepository.findById(userId, "+password");
  if (!user) throw new NotFoundError("User not found.");

  const isMatch = await user.comparePassword(oldPassword, user.password);
  if (!isMatch) throw new ForbiddenError("Incorrect old password.");

  const hashedNewPassword = await bcrypt.hash(newPassword, 12);

  await userRepository.updateById(userId, {
    password: hashedNewPassword,
  });

  return { message: "Password updated successfully." };
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
  changePassword,
};
