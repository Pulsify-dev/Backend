import userRepository from "../repositories/user.repository.js";
import reportRepository from "../repositories/report.repository.js";
import { NotFoundError, BadRequestError } from "../utils/errors.utils.js";
const suspendUser = async (adminId, targetUserId) => {
  if (adminId.toString() === targetUserId.toString()) {
    throw new BadRequestError(
      "Security Policy: Admins cannot suspend their own accounts.",
    );
  }

  const user = await userRepository.updateById(targetUserId, {
    is_suspended: true,
  });
  if (!user) throw new NotFoundError("User not found.");
  return user;
};

const restoreUser = async (userId) => {
  const user = await userRepository.updateById(userId, { is_suspended: false });
  if (!user) throw new NotFoundError("User not found.");
  return user;
};

const getReports = async (status, page, limit) => {
  const filter = status ? { status } : {};
  return await reportRepository.findPaginated(filter, page, limit);
};
const resolveReport = async (reportId, status, adminNotes) => {
  if (!["Resolved", "Dismissed"].includes(status)) {
    throw new BadRequestError(
      "Status must be either 'Resolved' or 'Dismissed'",
    );
  }

  const updatedReport = await reportRepository.updateById(reportId, {
    status: status,
    admin_notes: adminNotes,
  });

  if (!updatedReport) throw new NotFoundError("Report not found.");
  return updatedReport;
};

export default {
  suspendUser,
  restoreUser,
  getReports,
  resolveReport,
};
