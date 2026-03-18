import profileService from "../services/profile.service.js";

// GET /users/:user_id
const getPublicProfile = async (req, res, next) => {
  try {
    const profile = await profileService.getPublicProfile(req.params.user_id);
    res.status(200).json(profile);
  } catch (err) {
    next(err);
  }
};

// GET /users/me
const getMyProfile = async (req, res, next) => {
  try {
    const profile = await profileService.getMyProfile(req.user.user_id);
    res.status(200).json(profile);
  } catch (err) {
    next(err);
  }
};

// PATCH /users/me
const updateMyProfile = async (req, res, next) => {
  try {
    const updated = await profileService.updateMyProfile(
      req.user.user_id,
      req.body,
    );
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};

// DELETE /users/me
const deleteMyAccount = async (req, res, next) => {
  try {
    const { password } = req.body;
    const result = await profileService.deleteMyAccount(
      req.user.user_id,
      password,
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// POST /users/me/avatar
const uploadAvatar = async (req, res, next) => {
  try {
    const result = await profileService.uploadProfileImage(
      req.user.user_id,
      req.file,
      "avatar",
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// POST /users/me/cover
const uploadCover = async (req, res, next) => {
  try {
    const result = await profileService.uploadProfileImage(
      req.user.user_id,
      req.file,
      "cover",
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// PUT /users/me/email
const initiateEmailChange = async (req, res, next) => {
  try {
    const { new_email, current_password } = req.body;
    const result = await profileService.initiateEmailChange(
      req.user.user_id,
      new_email,
      current_password,
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// GET /users/confirm-email-change?token=...
const confirmEmailChange = async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ message: "Token is required." });
    const result = await profileService.confirmEmailChange(token);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// GET /users
const searchUsers = async (req, res, next) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    const result = await profileService.searchUsers(
      q,
      parseInt(page),
      parseInt(limit),
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export default {
  getPublicProfile,
  getMyProfile,
  updateMyProfile,
  deleteMyAccount,
  uploadAvatar,
  uploadCover,
  initiateEmailChange,
  confirmEmailChange,
  searchUsers,
};
