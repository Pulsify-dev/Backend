import trackRepository from "../repositories/track.repository.js";
import audioUtils from "../utils/audio.utils.js";
import photoUtils from "../utils/photo.utils.js";
import S3Utils from "../utils/s3.utils.js";

import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
  ConflictError,
} from "../utils/errors.utils.js";

const ALLOWED_AUDIO_TYPES = [
  "audio/mp3",
  "audio/flac",
  "audio/wav",
  "audio/aac",
];
const MAX_AUDIO_BYTES = 30 * 1024 * 1024; // 30 MB
const MAX_COVER_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_ARTWORK_BYTES = 5 * 1024 * 1024; // 5 MB (for artwork replacement per API doc)

const createTrack = async (userId, trackData, audioFile, coverFile) => {
  // Validate audio file
  if (!audioFile) throw new BadRequestError("Audio file is required.");
  if (!ALLOWED_AUDIO_TYPES.includes(audioFile.mimetype))
    throw new BadRequestError(
      "Invalid audio format. Only MP3, FLAC, WAV, and AAC are allowed.",
    );
  if (audioFile.size > MAX_AUDIO_BYTES)
    throw new BadRequestError("Audio file exceeds the 30 MB limit.");

  if (!coverFile) {
    throw new BadRequestError("Cover file is required.");
  }
  photoUtils.validateImageFile(coverFile, MAX_COVER_BYTES);

  // ========== STEP 3: EXTRACT AUDIO INFO ==========
  const audioMetadata = await audioUtils.extractAudioMetadata(audioFile.buffer);

  // ========== STEP 3.5: EXTRACT WAVEFORM ==========
  const waveform = await audioUtils.extractWaveform(audioFile.buffer);

  // ========== STEP 4: UPLOAD TO S3 ==========
  const audioUrl = await S3Utils.uploadToS3(audioFile, "audio");
  const artworkUrl = await S3Utils.uploadToS3(coverFile, "artwork");

  // ========== STEP 5: BUILD TRACK OBJECT ==========
  const trackObject = {
    artist_id: userId,
    title: trackData.title,
    genre: trackData.genre,
    description: trackData.description || "",
    tags: trackData.tags || [],
    audio_url: audioUrl,
    artwork_url: artworkUrl,
    format: audioMetadata.format,
    duration: audioMetadata.duration,
    file_size_bytes: audioFile.size,
    bitrate: audioMetadata.bitrate,
    waveform: waveform,
    status: "finished",
  };

  // ========== STEP 6: SAVE TO DATABASE ==========
  const savedTrack = await trackRepository.createTrack(trackObject);
  return savedTrack;
};

const getTrackById = async (trackId, userId) => {
  let track;
  if(userId){
  track = await trackRepository.findById(trackId);
  if (!track) throw new NotFoundError("Track not found.");
  if (track.visibility === "private") {
    if (track.artist_id.toString() === userId.toString()) {
      return track;
    } else {
      throw new ForbiddenError("You are not the owner of this track.");
    } 
  }} else {
    track = await trackRepository.findPublicById(trackId);
    if (!track) throw new NotFoundError("Track not found.");
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
  const allowedFields = ["title", "genre", "description", "tags", "visibility"];
  const updates = {};
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
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
  const track = await trackRepository.findById(trackId);
  if (!track) throw new NotFoundError("Track not found.");
  if (track.artist_id.toString() !== userId.toString()) {
    throw new ForbiddenError("You are not the owner of this track.");
  }
  // Delete audio and artwork from S3
  if (track.artwork_url && !track.artwork_url.includes("default-artwork")) {
    await S3Utils.deleteFromS3(track.artwork_url);
  }
  await S3Utils.deleteFromS3(track.audio_url);
  // Delete track from database
  await trackRepository.deleteById(trackId);
  return { message: "Track successfully deleted." };
};

const getTracksByArtistId = async (artistId, page, limit) => {
  if (!artistId) throw new BadRequestError("Artist ID is required.");
  const tracks = await trackRepository.findByArtistId(artistId, page, limit);
  const total = await trackRepository.countByArtistId(artistId);
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
  if (track.artwork_url && !track.artwork_url.includes("default-artwork")) {
    await S3Utils.deleteFromS3(track.artwork_url);
  }

  // Upload new artwork to S3
  const newArtworkUrl = await S3Utils.uploadToS3(artworkFile, "artwork");

  // Update track with new artwork URL
  const updatedTrack = await trackRepository.updateTrackById(trackId, {
    artwork_url: newArtworkUrl,
  });

  return { artwork_url: newArtworkUrl };
};

export default {
  createTrack,
  getTrackById,
  updateTrack,
  deleteTrack,
  getTracksByArtistId,
  getTrackStatus,
  getWaveform,
  updateArtwork,
};