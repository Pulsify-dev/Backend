import mongoose from "mongoose";

const commentSchema = mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    track_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Track",
      required: [true, "Track ID is required"],
      index: true,
    },
    text: {
      type: String,
      required: [true, "Comment text is required"],
      trim: true,
      minlength: [1, "Comment must be at least 1 character"],
      maxlength: [500, "Comment cannot exceed 500 characters"],
    },
    timestamp_seconds: {
      type: Number,
      required: [true, "Timestamp is required"],
      min: [0, "Timestamp cannot be negative"],
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer",
      },
    },
    likes_count: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer",
      },
    },
    replies_count: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer",
      },
    },
    // for replies to comments 
    parent_comment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
    is_edited: {
      type: Boolean,
      default: false,
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// comments sorted by timestamp 
commentSchema.index({ track_id: 1, timestamp_seconds: 1 });
const Comment = mongoose.model("Comment", commentSchema);
export default Comment;
