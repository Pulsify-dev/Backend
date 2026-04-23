import mongoose from "mongoose";
import crypto from "crypto";
import searchService from "../services/search.service.js";
import { config } from "../config/index.js";

const albumSchema = mongoose.Schema(
  {
    artist_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "An album must have an artist"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "An album must have a title"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    permalink: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    genre: {
      type: String,
      enum: [
        "Electronic", "Hip-Hop", "Rock", "Pop", "Jazz", "Classical",
        "R&B", "Soul", "Reggae", "Country", "Metal", "Folk",
        "Latin", "Blues", "Ambient", "Acoustic", "Soundtrack",
        "Spoken Word", "K-Pop", "Afrobeats", "House", "Techno",
        "Lo-Fi", "Other",
      ],
      required: [true, "Genre is required"],
      index: true,
    },
    type: {
      type: String,
      enum: ["Album", "EP", "Single", "Compilation"],
      default: "Album",
      index: true,
    },
    release_date: {
      type: Date,
      default: Date.now,
    },
    artwork_url: {
      type: String,
      default: config.defaults.albumArtwork,
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
      },
    ],
    track_count: {
      type: Number,
      default: 0,
    },
    total_duration: {
      type: Number,
      default: 0,
    },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
      index: true,
    },
    is_hidden: {
      type: Boolean,
      default: false,
    },
    play_count: {
      type: Number,
      default: 0,
    },
    like_count: {
      type: Number,
      default: 0,
    },
    repost_count: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Indexes
albumSchema.index({ artist_id: 1, createdAt: -1 });

// Generate permalink before saving
albumSchema.pre("save", async function (next) {
  if (!this.permalink) {
    const basePermalink = this.title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
    
    this.permalink = `${basePermalink}-${crypto.randomBytes(4).toString("hex")}`;
  }
  next();
});

// ─── Meilisearch Sync ────────────────────────────────────────────────────────
const syncAlbum = async (doc) => {
  if (!doc) return;
  
  let artistName = "";
  let artistUsername = "";
  try {
    const artist = await mongoose.model("User").findById(doc.artist_id, "display_name username");
    if (artist) {
      artistName = artist.display_name || "";
      artistUsername = artist.username || "";
    }
  } catch (_) { /* artist lookup is best-effort */ }

  const albumDoc = {
    id: doc._id.toString(),
    title: doc.title,
    description: doc.description || "",
    genre: doc.genre,
    type: doc.type,
    artist_id: doc.artist_id.toString(),
    artist_name: artistName,
    artist_username: artistUsername,
    permalink: doc.permalink,
    artwork_url: doc.artwork_url,
    track_count: doc.track_count,
    visibility: doc.visibility,
    createdAt: doc.createdAt,
  };
  
  try {
    await searchService.indexDocument("albums", albumDoc);
  } catch (err) {
    console.warn(`[Search] Failed to index album ${doc._id}: ${err.message}`);
  }
};

albumSchema.post("save", syncAlbum);
albumSchema.post("findOneAndUpdate", syncAlbum);
albumSchema.post("findOneAndDelete", async (doc) => {
  if (doc) {
    try {
      await searchService.removeDocument("albums", doc._id.toString());
    } catch (err) {
      console.warn(`[Search] Failed to remove album ${doc._id}: ${err.message}`);
    }
  }
});

export default mongoose.model("Album", albumSchema);
