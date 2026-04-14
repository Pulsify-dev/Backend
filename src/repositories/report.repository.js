import Report from "../models/report.model.js";

const create = async (reportData) => {
  return await Report.create(reportData);
};

const findPaginated = async (filter = {}, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const [reports, total] = await Promise.all([
    Report.find(filter)
      .populate("reporter_id", "username email")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean(),
    Report.countDocuments(filter),
  ]);

  return { reports, total };
};

const updateById = async (id, updateData) => {
  return await Report.findByIdAndUpdate(id, updateData, {
    returnDocument: "after",
    runValidators: true,
  });
};

export default {
  create,
  findPaginated,
  updateById,
};
