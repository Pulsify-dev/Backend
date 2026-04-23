import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    entity_type: {
      type: String,
      enum: ["Track", "Album", "Comment", "Follow", "Playlist", "Message"],
      required: true,
    },
    entity_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    action_type: {
      type: String,
      enum: ["LIKE", "REPOST", "COMMENT", "FOLLOW", "MESSAGE"],
      required: true,
    },
    is_read: {
      type: Boolean,
      default: false,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "notifications",
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
