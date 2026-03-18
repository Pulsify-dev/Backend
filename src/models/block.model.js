import mongoose from "mongoose";
const blockSchema = mongoose.Schema(
  {
    blocker_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Blocker ID is required"],
      index: true,
    },
    blocked_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Blocked ID is required"],
      index: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [500, "Block reason cannot exceed 500 characters"],
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

//user cant block the same person morethan once
blockSchema.index({ blocker_id: 1, blocked_id: 1 }, { unique: true });

//user cant block himself
blockSchema.pre("save", async function (next) {
  if (this.blocker_id.equals(this.blocked_id)) {
    throw new Error("Cannot block yourself");
  }
  next();
});

const Block = mongoose.model("Block", blockSchema);
export default Block;
