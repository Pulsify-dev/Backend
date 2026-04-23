import mongoose from "mongoose";

const albumRepostSchema = mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    album_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Album",
      required: [true, "Album ID is required"],
      index: true,
    },
  },
  { timestamps: true }
);

albumRepostSchema.index({ user_id: 1, album_id: 1 }, { unique: true });

const AlbumRepost = mongoose.model("AlbumRepost", albumRepostSchema);
export default AlbumRepost;
