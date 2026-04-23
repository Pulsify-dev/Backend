import trackService from "../services/track.service.js";

// POST /tracks - Create a new track
const createTrack = async (req, res, next) => {
  try {
    // Bug fixes:
    // 1. Field names must match middleware: "audio_file" not "audio", "artwork_file" not "cover"
    // 2. With .fields(), files come as arrays, so we need [0] to get the first file
    // 3. Using optional chaining for artwork since it passes undefined to service for proper error handling
    const audioFile = req.files.audio_file[0];
    const artworkFile = req.files.artwork_file?.[0];

    const track = await trackService.createTrack(
      req.user.user_id,
      req.body,
      audioFile,
      artworkFile
    );
    res.status(201).json(track);
  } catch (err) {
    next(err);
  }
};

// GET /tracks/:id - Get a single track by ID
const getTrackById = async (req, res, next) => {
  try {
    const track = await trackService.getTrackById(
      req.params.id,
      req.user.user_id
    );
    res.status(200).json(track);
  } catch (err) {
    next(err);
  }
};

// PATCH /tracks/:id - Update track metadata
const updateTrack = async (req, res, next) => {
  try {
    const updatedTrack = await trackService.updateTrack(
      req.params.id,
      req.user.user_id,
      req.body
    );
    res.status(200).json(updatedTrack);
  } catch (err) {
    next(err);
  }
};

// DELETE /tracks/:id - Delete a track
const deleteTrack = async (req, res, next) => {
  try {
    const result = await trackService.deleteTrack(
      req.params.id,
      req.user.user_id
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// GET /artists/:id/tracks - Get all tracks by an artist (paginated)
// YOUR TURN (Q4): Fix this function - it calls trackService.getTracks() which doesn't exist!
// Look at the service exports and figure out what function to call instead.
const getArtistTracks = async (req, res, next) => {
  try {
    const tracks = await trackService.getTracksByArtistId(
      req.params.id,
      req.pagination.page,
      req.pagination.limit
    );
    res.status(200).json(tracks);
  } catch (err) {
    next(err);
  }
};

// GET /tracks/:id/status - Poll transcoding status
const getTrackStatus = async (req, res, next) => {
  try {
    const status = await trackService.getTrackStatus(
      req.params.id,
      req.user.user_id
    );
    res.status(200).json(status);
  } catch (err) {
    next(err);
  }
};

// GET /tracks/:id/waveform - Get waveform peaks for audio player UI
const getWaveform = async (req, res, next) => {
  try {
    const waveform = await trackService.getWaveform(req.params.id);
    res.status(200).json(waveform);
  } catch (err) {
    next(err);
  }
};

// PUT /tracks/:id/artwork - Replace track cover artwork
const updateArtwork = async (req, res, next) => {
  try {
    // With .single("file"), the file is at req.file (not req.files)
    const result = await trackService.updateArtwork(
      req.params.id,
      req.user.user_id,
      req.file
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// GET /tracks/:id/lyrics - Get lyrics for a track
const getLyrics = async (req, res, next) => {
  try {
    const lyrics = await trackService.getLyrics(req.params.id);
    res.status(200).json(lyrics);
  } catch (err) {
    next(err);
  }
};

export default {
  createTrack,
  getTrackById,
  updateTrack,
  deleteTrack,
  getArtistTracks,
  getTrackStatus,
  getWaveform,
  getLyrics,
  updateArtwork,
};