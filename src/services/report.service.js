import reportRepository from "../repositories/report.repository.js";
import { BadRequestError } from "../utils/errors.utils.js";

const submitReport = async (reporterId, payload) => {
  //Prevent reporting oneself
  if (
    payload.entity_type === "User" &&
    reporterId.toString() === payload.entity_id
  ) {
    throw new BadRequestError("You cannot report your own account.");
  }

  const reportData = {
    reporter_id: reporterId,
    entity_type: payload.entity_type,
    entity_id: payload.entity_id,
    reason: payload.reason,
    description: payload.description,
  };

  return await reportRepository.create(reportData);
};

export default {
  submitReport,
};
