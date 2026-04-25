import Comment from "../models/comment.model.js";

const createComment = async (commentData) => {
  return Comment.create(commentData);
};

const findCommentById = async (commentId) => {
  return Comment.findById(commentId)
    .populate("user_id", "username display_name avatar_url")
    .populate("parent_comment_id")
    .lean();
};

const updateCommentById = async (commentId, updateData) => {
  return Comment.findByIdAndUpdate(commentId, updateData, {
    new: true,
    runValidators: true,
  })
    .populate("user_id", "username display_name avatar_url")
    .populate("parent_comment_id");
};

const deleteCommentById = async (commentId) => {
  return Comment.findByIdAndDelete(commentId);
};

const getCommentsByTrackId = async (trackId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const comments = await Comment.find({ 
    track_id: trackId, 
    parent_comment_id: null,
    is_deleted: false 
  })
    .populate("user_id", "username display_name avatar_url")
    .sort({ timestamp_seconds: 1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  
  const total = await Comment.countDocuments({ 
    track_id: trackId,
    parent_comment_id: null,
    is_deleted: false 
  });
  
  return { comments, total, page, limit };
};

const getCommentsByTimestampRange = async (trackId, startSeconds, endSeconds) => {
  return Comment.find({
    track_id: trackId,
    timestamp_seconds: { $gte: startSeconds, $lte: endSeconds },
    is_deleted: false,
  })
    .populate("user_id", "username display_name avatar_url")
    .sort({ timestamp_seconds: 1 })
    .lean();
};

const getRepliesByCommentId = async (parentCommentId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const replies = await Comment.find({
    parent_comment_id: parentCommentId,
    is_deleted: false,
  })
    .populate("user_id", "username display_name avatar_url")
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit)
    .lean();
  
  const total = await Comment.countDocuments({
    parent_comment_id: parentCommentId,
    is_deleted: false,
  });
  
  return { replies, total, page, limit };
};

const incrementCommentLikes = async (commentId) => {
  return Comment.findByIdAndUpdate(
    commentId,
    { $inc: { likes_count: 1 } },
    { new: true }
  );
};

const decrementCommentLikes = async (commentId) => {
  return Comment.findByIdAndUpdate(
    commentId,
    { $inc: { likes_count: -1 } },
    { new: true }
  );
};

const incrementCommentReplies = async (commentId) => {
  return Comment.findByIdAndUpdate(
    commentId,
    { $inc: { replies_count: 1 } },
    { new: true }
  );
};

const decrementCommentReplies = async (commentId) => {
  return Comment.findByIdAndUpdate(
    commentId,
    { $inc: { replies_count: -1 } },
    { new: true }
  );
};

export default {
  createComment,
  findCommentById,
  updateCommentById,
  deleteCommentById,
  getCommentsByTrackId,
  getCommentsByTimestampRange,
  getRepliesByCommentId,
  incrementCommentLikes,
  decrementCommentLikes,
  incrementCommentReplies,
  decrementCommentReplies,
};
