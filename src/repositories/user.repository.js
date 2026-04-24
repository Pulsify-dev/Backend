import User from "../models/user.model.js";

const findById = function (id, extraFields = "") {
  return User.findById(id).select(extraFields);
};
const updateById = function (id, updatedPatch) {
  return User.findByIdAndUpdate(id, updatedPatch, {
    returnDocument: "after",
    runValidators: true,
  });
};
const findByEmailWithPassword = function (email) {
  return User.findOne({ email }).select("+password");
};
const findUserByPendingEmailToken = function (token) {
  return User.findOne({
    pending_email_token: token,
    pending_email_expires: { $gt: Date.now() },
  }).select("+pending_email +pending_email_token +pending_email_expires");
};
const deleteById = function (id) {
  return User.findByIdAndDelete(id);
};
const emailExists = async (email, requestedUserId) => {
  const exist = await User.findOne({
    email,
    _id: { $ne: requestedUserId },
  }).lean();
  return !!exist;
};
const searchUsers = async (q, page, limit) => {
  const filter = { is_private: false, is_suspended: false };

  if (q && q.trim()) {
    const regex = new RegExp(q.trim(), "i");
    filter.$or = [{ username: regex }, { display_name: regex }];
  }

  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find(filter)
      .select(
        "username display_name avatar_url bio location followers_count track_count tier",
      )
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return { users, total };
};
const create = function (userData) {
  return User.create(userData);
};
const usernameExists = async (username, requestedUserId) => {
  const query = { username };
  if (requestedUserId) {
    query._id = { $ne: requestedUserId };
  }
  const exist = await User.findOne(query).lean();
  return !!exist;
};
const findByPasswordResetToken = function (token) {
  return User.findOne({
    password_reset_token: token,
    password_reset_expires: { $gt: Date.now() },
  });
};
const findByRefreshToken = function (token) {
  return User.findOne({ refresh_token: token });
};

const updateRefreshToken = function (id, token) {
  return User.findByIdAndUpdate(
    id,
    { refresh_token: token },
    { returnDocument: "after" },
  );
};
const findByProviderId = function (providerName, providerId) {
  const query = {};
  query[`${providerName}_id`] = providerId;
  return User.findOne(query);
};

const findByEmail = function (email) {
  return User.findOne({ email });
};

const findByUsername = function (username, extraFields = "") {
  return User.findOne({ username }).select(extraFields);
};
const addDeviceToken = function (userId, token) {
  return User.findByIdAndUpdate(
    userId,
    { $addToSet: { device_tokens: token } },
    { returnDocument: "after" },
  );
};

const getUserAdminStats = async () => {
  const [total_active_users, total_active_admins, total_suspended, tier_free, tier_pro] = await Promise.all([
    User.countDocuments({ is_suspended: false, role: "User" }),
    User.countDocuments({ is_suspended: false, role: "Admin" }),
    User.countDocuments({ is_suspended: true }),
    User.countDocuments({ tier: "Free" }),
    User.countDocuments({ tier: "Artist Pro" }),
  ]);
  return { total_active_users, total_active_admins, total_suspended, tier_free, tier_pro };
};

const findPaginatedUsers = async (filter, page, limit) => {
  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    User.find(filter)
      .select("username display_name email role tier is_suspended is_verified createdAt")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean(),
    User.countDocuments(filter),
  ]);
  return { users, total };
};


export default {
  findById,
  updateById,
  findByEmailWithPassword,
  findUserByPendingEmailToken,
  deleteById,
  emailExists,
  searchUsers,
  create,
  usernameExists,
  findByPasswordResetToken,
  findByRefreshToken,
  updateRefreshToken,
  findByProviderId,
  findByEmail,
  findByUsername,
  addDeviceToken,
  getUserAdminStats,
  findPaginatedUsers,
};
