import mongoose from "mongoose";
import crypto from "crypto";

const playlistSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Playlist must have a title"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    creator_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "A playlist must have a creator"],
      index: true,
    },
    permalink: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
    },
    is_private: {
      type: Boolean,
      default: false, // false = public, true = secret
    },
    secret_token: {
      type: String,
      unique: true,
      sparse: true,
      default: null,
    },
    tracks: [
      {
        track_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Track",
          required: true,
        },
        position: {
          type: Number,
          required: true,
        },
        added_at: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    cover_url: {
      type: String,
      default: "default-playlist-cover.png",
    },
    track_count: {
      type: Number,
      default: 0,
    },
    duration_ms: {
      type: Number,
      default: 0,
    },
    is_collaborative: {
      type: Boolean,
      default: false,
    },
    collaborators: [
      {
        user_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        added_at: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

playlistSchema.index({ creator_id: 1, createdAt: -1 });
playlistSchema.index({ is_private: 1, creator_id: 1 });

// Middleware to generate permalink before saving
playlistSchema.pre("save", async function () {
  if (!this.permalink) {
    const basePermalink = this.title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
    this.permalink = `${basePermalink}-${crypto
      .randomBytes(4)
      .toString("hex")}`;
  }

  // Generate secret token for private playlists
  if (this.is_private && !this.secret_token) {
    this.secret_token = crypto.randomBytes(32).toString("hex");
  }

  // Clear secret token for public playlists
  if (!this.is_private) {
    this.secret_token = null;
  }
});

//regenerate secret token
playlistSchema.methods.regenerateSecretToken = function () {
  if (this.is_private) {
    this.secret_token = crypto.randomBytes(32).toString("hex");
  }
  return this.secret_token;
};

//add track to playlist
playlistSchema.methods.addTrack = function (trackId, position) {
  const maxPosition =
    this.tracks.length > 0
      ? Math.max(...this.tracks.map((t) => t.position))
      : -1;
  const finalPosition = position !== undefined ? position : maxPosition + 1;

  // if track already exists
  const trackExists = this.tracks.some(
    (t) => t.track_id.toString() === trackId.toString()
  );
  if (trackExists) {
    throw new Error("Track already exists in playlist");
  }

  this.tracks.push({
    track_id: trackId,
    position: finalPosition,
  });

  this.track_count = this.tracks.length;
  return this;
};

// remove track from playlist
playlistSchema.methods.removeTrack = function (trackId) {
  const initialLength = this.tracks.length;
  this.tracks = this.tracks.filter(
    (t) => t.track_id.toString() !== trackId.toString()
  );

  if (this.tracks.length === initialLength) {
    throw new Error("Track not found in playlist");
  }

  // reorder the positions after removal
  this.tracks.forEach((track, index) => {
    track.position = index;
  });

  this.track_count = this.tracks.length;
  return this;
};

//reorder tracks
playlistSchema.methods.reorderTracks = function (newOrder) {
  if (newOrder.length !== this.tracks.length) {
    throw new Error("Order array length must match track count");
  }

  const trackMap = new Map();
  this.tracks.forEach((track) => {
    trackMap.set(track.track_id.toString(), track);
  });

  this.tracks = newOrder.map((trackId, index) => {
    const track = trackMap.get(trackId.toString());
    if (!track) {
      throw new Error(`Track ${trackId} not found in playlist`);
    }
    track.position = index;
    return track;
  });

  return this;
};

//convert to public
playlistSchema.methods.makePublic = function () {
  this.is_private = false;
  this.secret_token = null;
  return this;
};

//convert to private
playlistSchema.methods.makePrivate = function () {
  this.is_private = true;
  if (!this.secret_token) {
    this.secret_token = crypto.randomBytes(32).toString("hex");
  }
  return this;
};

playlistSchema.methods.getEmbedCode = function (baseUrl = "https://pulsify.page") {
  const embedUrl = this.is_private
    ? `${baseUrl}/playlists/${this.permalink}?token=${this.secret_token}`
    : `${baseUrl}/playlists/${this.permalink}`;

  return `<iframe src="${embedUrl}" width="400" height="600" frameborder="0" allowtransparency="true" allow="autoplay"></iframe>`;
};

export default mongoose.model("Playlist", playlistSchema);
