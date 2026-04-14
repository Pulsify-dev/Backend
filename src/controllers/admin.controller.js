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

export default {
  suspendUser,
  restoreUser,
  getReports,
  resolveReport,
};
