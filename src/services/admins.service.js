import userRepository from "../repositories/user.repository.js";
import reportRepository from "../repositories/report.repository.js";
import { NotFoundError } from "../utils/errors.utils.js";

const suspendUser = async (userId) => {
  const user = await userRepository.updateById(userId, { is_suspended: true });
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

export default {
  suspendUser,
  restoreUser,
  getReports,
};
