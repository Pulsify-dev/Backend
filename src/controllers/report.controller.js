import reportService from "../services/report.service.js";

const createReport = async (req, res, next) => {
  try {
    const report = await reportService.submitReport(req.user.user_id, req.body);

    res.status(201).json({
      status: "success",
      data: { report },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createReport,
};
