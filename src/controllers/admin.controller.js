// src/controllers/admin.controller.js
import adminService from "../services/admin.service.js";

const suspendUser = async (req, res, next) => {
  try {
    const adminId = req.user.user_id;
    const targetUserId = req.params.id;
    const user = await adminService.suspendUser(adminId, targetUserId);
    res
      .status(200)
      .json({ status: "success", message: "User suspended", data: { user } });
  } catch (error) {
    next(error);
  }
};

const restoreUser = async (req, res, next) => {
  try {
    const user = await adminService.restoreUser(req.params.id);
    res
      .status(200)
      .json({ status: "success", message: "User restored", data: { user } });
  } catch (error) {
    next(error);
  }
};

const getReports = async (req, res, next) => {
  try {
    const { page, limit } = req.pagination;

    const status = req.query.status;

    const data = await adminService.getReports(status, page, limit);

    res.status(200).json({ status: "success", data });
  } catch (error) {
    next(error);
  }
};
const resolveReport = async (req, res, next) => {
  try {
    const { status, admin_notes } = req.body;
    const report = await adminService.resolveReport(
      req.params.id,
      status,
      admin_notes,
    );

    res.status(200).json({ status: "success", data: { report } });
  } catch (error) {
    next(error);
  }
};

const blockTrack = async (req, res, next) => {
  try {
    const track = await adminService.blockTrack(req.params.id);
    res.status(200).json({ status: "success", message: "Track blocked", data: { track } });
  } catch (error) {
    next(error);
  }
};

const unblockTrack = async (req, res, next) => {
  try {
    const track = await adminService.unblockTrack(req.params.id);
    res.status(200).json({ status: "success", message: "Track unblocked", data: { track } });
  } catch (error) {
    next(error);
  }
};

const deleteTrack = async (req, res, next) => {
  try {
    const result = await adminService.deleteTrack(req.params.id);
    res.status(200).json({ status: "success", message: result.message });
  } catch (error) {
    next(error);
  }
};

const blockAlbum = async (req, res, next) => {
  try {
    const album = await adminService.blockAlbum(req.params.id);
    res.status(200).json({ status: "success", message: "Album blocked", data: { album } });
  } catch (error) {
    next(error);
  }
};

const unblockAlbum = async (req, res, next) => {
  try {
    const album = await adminService.unblockAlbum(req.params.id);
    res.status(200).json({ status: "success", message: "Album unblocked", data: { album } });
  } catch (error) {
    next(error);
  }
};

const deleteAlbum = async (req, res, next) => {
  try {
    const result = await adminService.deleteAlbum(req.params.id);
    res.status(200).json({ status: "success", message: result.message });
  } catch (error) {
    next(error);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const adminId = req.user.user_id;
    const targetUserId = req.params.id;
    const { role } = req.body;
    
    const user = await adminService.updateUserRole(adminId, targetUserId, role);
    res.status(200).json({ status: "success", message: "User role updated", data: { user } });
  } catch (error) {
    next(error);
  }
};

const getAnalytics = async (req, res, next) => {
  try {
    const analytics = await adminService.getAnalytics();
    res.status(200).json({ status: "success", data: analytics });
  } catch (error) {
    next(error);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const { status } = req.query;
    const { page, limit } = req.pagination;
    const data = await adminService.getUsers(status, page, limit);
    res.status(200).json({ status: "success", data });
  } catch (error) {
    next(error);
  }
};

const getTracks = async (req, res, next) => {
  try {
    const { status } = req.query;
    const { page, limit } = req.pagination;
    const data = await adminService.getTracks(status, page, limit);
    res.status(200).json({ status: "success", data });
  } catch (error) {
    next(error);
  }
};

const getAlbums = async (req, res, next) => {
  try {
    const { status } = req.query;
    const { page, limit } = req.pagination;
    const data = await adminService.getAlbums(status, page, limit);
    res.status(200).json({ status: "success", data });
  } catch (error) {
    next(error);
  }
};

export default {
  suspendUser,
  restoreUser,
  getReports,
  resolveReport,
  blockTrack,
  unblockTrack,
  deleteTrack,
  blockAlbum,
  unblockAlbum,
  deleteAlbum,
  updateUserRole,
  getAnalytics,
  getUsers,
  getTracks,
  getAlbums,
};
