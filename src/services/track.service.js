import trackRepository from "../repositories/track.repository.js";
import subscriptionService from "./subscription.service.js";
import audioUtils from "../utils/audio.utils.js";
import photoUtils from "../utils/photo.utils.js";
import S3Utils from "../utils/s3.utils.js";
import audioQueueService from "../jobs/audio.queue.js";

import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
} from "../utils/errors.utils.js";

const ALLOWED_AUDIO_TYPES = [
  "audio/mp3",
  "audio/mpeg",        // standard MIME type for MP3
  "audio/flac",
  "audio/x-flac",      // common alternative for FLAC
  "audio/wav",
  "audio/wave",         // alternative for WAV
  "audio/x-wav",        // alternative for WAV
  "audio/aac",
  "audio/x-aac",        // alternative for AAC
  "audio/mp4",          // AAC in MP4 container
];
const MAX_AUDIO_BYTES = 30 * 1024 * 1024; // 30 MB
const MAX_COVER_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_ARTWORK_BYTES = 5 * 1024 * 1024; // 5 MB (for artwork replacement per API doc)
const PREVIEW_DURATION_SECONDS = 30;

const parsePreviewStartSeconds = (value) => {
  if (value === undefined) return null;

  const parsedValue = Number(value);
  if (!Number.isInteger(parsedValue)) {
    throw new BadRequestError("preview_start_seconds must be an integer.");
  }

  return parsedValue;
};

const clampPreviewStartSeconds = (previewStartSeconds, trackDurationSeconds) => {
  const maxPreviewStart = Math.max(trackDurationSeconds - PREVIEW_DURATION_SECONDS, 0);
  return Math.min(Math.max(previewStartSeconds, 0), maxPreviewStart);
};

const enforceUploadQuota = async (userId) => {
  const entitlement = await subscriptionService.getPlanLimitForUser(userId);

  if (!entitlement.planLimit.can_upload) {
    throw new ForbiddenError(
      `Track uploads are not available on the ${entitlement.effectivePlan} plan.`,
    );
  }

  if (Number.isInteger(entitlement.planLimit.upload_track_limit)) {
    const currentTrackCount = await trackRepository.countByArtistId(userId);
    if (currentTrackCount >= entitlement.planLimit.upload_track_limit) {
      throw new ForbiddenError(
        `Track upload limit reached for ${entitlement.effectivePlan} plan (${entitlement.planLimit.upload_track_limit} tracks).`,
      );
    }
  }
};

const buildTrackObject = ({
  userId,
  trackData,
  audioFile,
  audioMetadata,
  previewStartSeconds,
  waveform,
  audioUrl,
  artworkUrl,
}) => {
  const FORMAT_MAP = {
    MPEG: "mp3",
    MP3: "mp3",
    WAVE: "wav",
    WAV: "wav",
    FLAC: "flac",
    AAC: "aac",
    MP4: "aac",
  };
  const normalizedFormat =
    FORMAT_MAP[audioMetadata.format.toUpperCase()] ||
    audioMetadata.format.toLowerCase();

  const roundedDuration = Math.round(audioMetadata.duration);
  const roundedBitrate = Math.round(audioMetadata.bitrate || 0);

  return {
    artist_id: userId,
    title: trackData.title,
    genre: trackData.genre,
    description: trackData.description || "",
    tags: trackData.tags || [],
    lyrics: trackData.lyrics || null,
    visibility: trackData.visibility,
    audio_url: audioUrl,
    artwork_url: artworkUrl,
    format: normalizedFormat,
    duration: roundedDuration,
    file_size_bytes: audioFile.size,
    bitrate: roundedBitrate,
    preview_start_seconds: previewStartSeconds,
    waveform,
    status: "processing",
  };
};

const createTrackFromUpload = async (userId, trackData, audioFile, coverFile) => {
  // Validate audio file
  if (!audioFile) throw new BadRequestError("Audio file is required.");
  if (!ALLOWED_AUDIO_TYPES.includes(audioFile.mimetype))
    throw new BadRequestError(
      "Invalid audio format. Only MP3, FLAC, WAV, and AAC are allowed.",
    );
  if (audioFile.size > MAX_AUDIO_BYTES)
     throw new BadRequestError("Audio file exceeds the 30 MB limit.");

  // Validate cover file only if provided (cover is optional)
  if (coverFile) {
    photoUtils.validateImageFile(coverFile, MAX_COVER_BYTES);
  }

  const audioMetadata = await audioUtils.extractAudioMetadata(audioFile.buffer);
  const roundedDuration = Math.round(audioMetadata.duration);
  const parsedPreviewStart = parsePreviewStartSeconds(
    trackData.preview_start_seconds,
  );
  const previewStartSeconds = clampPreviewStartSeconds(
    parsedPreviewStart ?? 0,
    roundedDuration,
  );

  await enforceUploadQuota(userId);

  const audioUrl = await S3Utils.uploadToS3(audioFile, "tracks/audio");
  const artworkUrl = coverFile
    ? await S3Utils.uploadToS3(coverFile, "tracks/artwork")
    : trackData.artwork_url;

  try {
    const createdTrack = await trackRepository.createTrack(
      buildTrackObject({
        userId,
        trackData,
        audioFile,
        audioMetadata,
        previewStartSeconds,
        waveform: [],
        audioUrl,
        artworkUrl,
      }),
    );

    // Dispatch background job for audio processing
    try {
      await audioQueueService.addAudioJob(createdTrack._id, userId);
    } catch (err) {
      console.error("[TrackService] Failed to enqueue audio job:", err);
    }

    return createdTrack;
  } catch (error) {
    await S3Utils.deleteFromS3(audioUrl).catch(() => {});
    await S3Utils.deleteFromS3(artworkUrl).catch(() => {});
    throw error;
  }
};

const createTrack = async (userId, trackData, audioFile, coverFile) => {
  return createTrackFromUpload(userId, trackData, audioFile, coverFile);
};

const getTrackById = async (trackId, userId) => {
  const track = await trackRepository.findById(trackId);
  if (!track) throw new NotFoundError("Track not found.");

  if (track.visibility === "private" && track.artist_id.toString() !== userId.toString()) {
    throw new ForbiddenError("You do not have access to this private track.");
  }

  return track;
};
const updateTrack = async (trackId, userId, updateData) => {
  const track = await trackRepository.findById(trackId);
  if (!track) throw new NotFoundError("Track not found.");
  if (track.artist_id.toString() !== userId.toString()) {
    throw new ForbiddenError("You are not the owner of this track.");
  }
  if (!updateData) throw new BadRequestError("No update data provided.");
  // Only allow certain fields to be updated
  const allowedFields = [
    "title",
    "genre",
    "description",
    "tags",
    "lyrics",
    "visibility",
    "preview_start_seconds",
  ];
  const updates = {};
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      if (field === "preview_start_seconds") {
        const requestedPreviewStart = parsePreviewStartSeconds(
          updateData.preview_start_seconds,
        );
        updates.preview_start_seconds = clampPreviewStartSeconds(
          requestedPreviewStart,
          track.duration,
        );
        continue;
      }
      updates[field] = updateData[field];
    }
  }
  if (Object.keys(updates).length === 0) {
    throw new BadRequestError("No valid fields to update.");
  }
  const updatedTrack = await trackRepository.updateTrackById(trackId, updates);
  return updatedTrack;
}

const deleteTrack = async (trackId, userId) => {
  if(!userId){
    throw new UnauthorizedError("You are not logged in. Please log in to get access.");
    return;
  }
  const track = await trackRepository.findById(trackId);
  if (!track) throw new NotFoundError("Track not found.");
  if (track.artist_id.toString() !== userId.toString()) {
    throw new ForbiddenError("You are not the owner of this track.");
  }
  // Delete audio and artwork from S3
  if (track.artwork_url && !track.artwork_url.includes("Default.png")) {
    await S3Utils.deleteFromS3(track.artwork_url);
  }
  await S3Utils.deleteFromS3(track.audio_url);
  // Delete track from database
  await trackRepository.deleteById(trackId);
  return { message: "Track successfully deleted." };
};

const getTracksByArtistId = async (artistId, page, limit, requesterId = null) => {
  if (!artistId) throw new BadRequestError("Artist ID is required.");
  
  const isOwner = requesterId && artistId.toString() === requesterId.toString();
  
  const tracks = await trackRepository.findByArtistId(artistId, page, limit, "", isOwner);
  const total = await trackRepository.countByArtistId(artistId, isOwner);
  return { tracks, total };
};

const getTrackStatus = async (trackId, userId) => {
  const track = await trackRepository.findById(trackId);
  if (!track) throw new NotFoundError("Track not found.");
  if (track.artist_id.toString() !== userId.toString()) {
    throw new ForbiddenError("You are not the owner of this track.");
  }
  return {
    track_id: track._id,
    status: track.status,
    progress_percent: null, // Future: add to model when transcoding is implemented
    error_message: null,    // Future: add to model when transcoding is implemented
  };
};

const getWaveform = async (trackId) => {
  // Use "+waveform" to include the field that has select: false
  const track = await trackRepository.findById(trackId, "+waveform");
  if (!track) throw new NotFoundError("Track not found.");
  return {
    track_id: track._id,
    peaks: track.waveform || [],
    samples: track.waveform?.length || 0,
  };
};

const updateArtwork = async (trackId, userId, artworkFile) => {
  // Validate artwork file
  if (!artworkFile) throw new BadRequestError("Artwork file is required.");
  photoUtils.validateImageFile(artworkFile, MAX_ARTWORK_BYTES);

  // Find track and verify ownership
  const track = await trackRepository.findById(trackId);
  if (!track) throw new NotFoundError("Track not found.");
  if (track.artist_id.toString() !== userId.toString()) {
    throw new ForbiddenError("You are not the owner of this track.");
  }

  // Delete old artwork from S3 (if not default)
  if (track.artwork_url && !track.artwork_url.includes("Default.png")) {
    await S3Utils.deleteFromS3(track.artwork_url);
  }

  // Upload new artwork to S3
  const newArtworkUrl = await S3Utils.uploadToS3(artworkFile, "tracks/artwork");

  // Update track with new artwork URL
  const updatedTrack = await trackRepository.updateTrackById(trackId, {
    artwork_url: newArtworkUrl,
  }); 

  return { artwork_url: newArtworkUrl };
};

const getLyrics = async (trackId) => {
  // Use "+lyrics" to include the field that has select: false
  const track = await trackRepository.findById(trackId, "+lyrics");
  if (!track) throw new NotFoundError("Track not found.");
  return {
    track_id: track._id,
    lyrics: track.lyrics || null,
  };
};

export default {
  createTrack,
  createTrackFromUpload,
  getTrackById,
  updateTrack,
  deleteTrack,
  getTracksByArtistId,
  getTrackStatus,
  getWaveform,
  getLyrics,
  updateArtwork,
};
