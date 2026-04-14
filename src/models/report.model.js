import mongoose from "mongoose";

const reportSchema = mongoose.Schema(
  {
    reporter_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Reporter ID is required"],
      index: true,
    },
    entity_type: {
      type: String,
      enum: ["Track", "User", "Comment"],
      required: [true, "Entity type is required"],
      index: true,
    },
    entity_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Entity ID is required"],
      index: true,
    },
    reason: {
      type: String,
      enum: [
        "Copyright",
        "InappropriateContent",
        "Spam",
        "HateSpeech",
        "Other",
      ],
      required: [true, "Reason for reporting is required"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    status: {
      type: String,
      enum: ["Pending", "Resolved", "Dismissed"],
      default: "Pending",
      index: true,
    },
    admin_notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Admin notes cannot exceed 1000 characters"],
    },
  },
  { timestamps: true },
);

const Report = mongoose.model("Report", reportSchema);
export default Report;
