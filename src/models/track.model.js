import mongoose from "mongoose";
import crypto from "crypto";
import searchService from "../services/search.service.js";

const trackSchema = mongoose.Schema(
  {
    artist_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "A track must have an artist"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "A track must have a title"],
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
      maxlength: [200, "Description cannot exceed 200 characters"],
      default: "",
    },
    genre: {
      type: String,
      enum: [
        "Electronic",
        "Hip-Hop",
        "Rock",
        "Pop",
        "Jazz",
        "Classical",
        "R&B",
        "Soul",
        "Reggae",
        "Country",
        "Metal",
        "Folk",
        "Latin",
        "Blues",
        "Ambient",
        "Acoustic",
        "Soundtrack",
        "Spoken Word",
        "K-Pop",
        "Afrobeats",
        "House",
        "Techno",
        "Lo-Fi",
        "Other",
      ],
      required: [true, "Genre is required"],
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
      validate: {
        validator: function (arr) {
          return arr.length <= 20;
        },
        message: "Cannot exceed 20 tags",
      },
    },
    release_date: {
      type: Date,
      default: Date.now,
    },
    audio_url: {
      type: String,
      required: [true, "A track must have an audio file"],
    },
    artwork_url: {
      type: String,
      default: "default-artwork.png", //when we setup aws there will be default artwork if artists didn't provide any
    },
    format: {
      type: String,
      enum: ["mp3", "wav", "flac", "aac"],
      required: [true, "Audio format is required"],
    },
    duration: {
      type: Number,
      required: [true, "Duration is required"],
      min: [1, "Track must be at least 1 second long"],
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer",
      },
    },
    file_size_bytes: {
      type: Number,
      required: [true, "File size is required"],
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer",
      },
    },
    bitrate: {
      type: Number,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer",
      },
    },
    waveform: {
      type: [Number],
      default: [],
      select: false,
    },
    status: {
      type: String,
      enum: ["processing", "finished", "failed"],
      default: "processing",
      index: true,
    },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
      index: true,
    },
    playback_state: {
      type: String,
      enum: ["playable", "blocked"],
      default: "playable",
      index: true,
    },
    preview_start_seconds: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer",
      },
    },
    secret_token: {
      type: String,
      default: null,
      select: false,
    },
    is_hidden: {
      type: Boolean,
      default: false,
      index: true,
    },
    play_count: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer",
      },
    },
    like_count: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer",
      },
    },
    repost_count: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer",
      },
    },
    comment_count: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer",
      },
    },
    trending_score: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    trending_score_updated_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

trackSchema.pre("save", function () {
  if (this.isModified("title") || !this.permalink) {
    this.permalink =
      this.title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-") +
      "-" +
      crypto.randomBytes(4).toString("hex");
  }

  if (this.visibility === "private" && !this.secret_token) {
    this.secret_token = crypto.randomBytes(16).toString("hex");
  }
});

const syncTrack = async (doc) => {
  if (!doc) return;
  const trackDoc = {
    id: doc._id.toString(),
    title: doc.title,
    artist_id: doc.artist_id.toString(),
    permalink: doc.permalink,
    description: doc.description,
    genre: doc.genre,
    tags: doc.tags,
    visibility: doc.visibility,
    playback_state: doc.playback_state,
    preview_start_seconds: doc.preview_start_seconds,
    play_count: doc.play_count,
  };
  await searchService.indexDocument("tracks", trackDoc);
};

trackSchema.post("save", syncTrack);
trackSchema.post("findOneAndUpdate", syncTrack);
trackSchema.post("findOneAndDelete", async (doc) => {
  if (doc) {
    await searchService.removeDocument("tracks", doc._id.toString());
  }
});

const Track = mongoose.model("Track", trackSchema);
export default Track;
