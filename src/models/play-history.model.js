import mongoose from "mongoose";

const playHistorySchema = mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "A play record must be associated with a user"],
      index: true,
    },
    track_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Track",
      required: [true, "A play record must be associated with a track"],
      index: true,
    },
    duration_played_ms: {
      type: Number,
      required: [true, "Duration played is required"],
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer",
      },
    },
    is_completed: {
      type: Boolean,
      default: false,
    },
    played_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for efficient paginated history fetch (newest first)
playHistorySchema.index({ user_id: 1, played_at: -1 });

const PlayHistory = mongoose.model("PlayHistory", playHistorySchema);

export default PlayHistory;
