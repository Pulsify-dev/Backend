import mongoose from "mongoose";

const repostSchema = mongoose.Schema(
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
  },
  { timestamps: true }
);

repostSchema.index({ user_id: 1, track_id: 1 }, { unique: true });
const Repost = mongoose.model("Repost", repostSchema);
export default Repost;
