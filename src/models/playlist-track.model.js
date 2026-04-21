import mongoose from "mongoose";

const playlistTrackSchema = mongoose.Schema(
  {
    playlist_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Playlist",
      required: [true, "Playlist ID is required"],
      index: true,
    },
    track_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Track",
      required: [true, "Track ID is required"],
      index: true,
    },
    position: {
      type: Number,
      required: [true, "Position is required"],
    },
    added_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User who added the track is required"],
    },
    added_at: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

playlistTrackSchema.index({ playlist_id: 1, position: 1 });
playlistTrackSchema.index({ playlist_id: 1, track_id: 1 }, { unique: true }); // Prevent duplicates

export default mongoose.model("PlaylistTrack", playlistTrackSchema);
