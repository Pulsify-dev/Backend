import mongoose from "mongoose";

const playHistorySchema = mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    track_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Track",
      required: true,
      index: true,
    },
    played_at: {
      type: Date,
      default: Date.now,
    },
    is_completed: {
      type: Boolean,
      default: false,
    },
    duration_played_ms: {
      type: Number,
      default: 0,
    },

  },

);

playHistorySchema.index({ user_id: 1, played_at: -1 });


const PlayHistory = mongoose.model("PlayHistory", playHistorySchema);
export default PlayHistory;