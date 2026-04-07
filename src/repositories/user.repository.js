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
};
