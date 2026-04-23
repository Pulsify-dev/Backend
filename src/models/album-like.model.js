import mongoose from "mongoose";

const albumLikeSchema = mongoose.Schema(
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

albumLikeSchema.index({ user_id: 1, album_id: 1 }, { unique: true });

const AlbumLike = mongoose.model("AlbumLike", albumLikeSchema);
export default AlbumLike;
