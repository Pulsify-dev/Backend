import albumService from "../services/album.service.js";

// POST /albums
const createAlbum = async (req, res, next) => {
  try {
    const album = await albumService.createAlbum(
      req.user.user_id,
      req.body,
      req.files?.artwork?.[0] || null,
      req.files?.audio_files || [],
      req.files?.track_artwork_files || [],
    );
    res.status(201).json(album);
  } catch (err) {
    next(err);
  }
};

// GET /albums/:id
const getAlbumById = async (req, res, next) => {
  try {
    const userId = req.user?.user_id || null;
    const album = await albumService.getAlbumById(req.params.id, userId);
    res.status(200).json(album);
  } catch (err) {
    next(err);
  }
};

// GET /artists/:id/albums
const getArtistAlbums = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await albumService.getArtistAlbums(req.params.id, page, limit);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// PATCH /albums/:id
const updateAlbum = async (req, res, next) => {
  try {
    const album = await albumService.updateAlbum(req.user.user_id, req.params.id, req.body);
    res.status(200).json(album);
  } catch (err) {
    next(err);
  }
};

// PUT /albums/:id/artwork
const updateArtwork = async (req, res, next) => {
  try {
    const coverFile = req.file;
    const album = await albumService.updateArtwork(req.user.user_id, req.params.id, coverFile);
    res.status(200).json(album);
  } catch (err) {
    next(err);
  }
};

// DELETE /albums/:id
const deleteAlbum = async (req, res, next) => {
  try {
    const result = await albumService.deleteAlbum(req.user.user_id, req.params.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// POST /albums/:id/tracks
const addTracks = async (req, res, next) => {
  try {
    const { track_ids } = req.body;
    const album = await albumService.addTracks(req.user.user_id, req.params.id, track_ids);
    res.status(200).json(album);
  } catch (err) {
    next(err);
  }
};

// DELETE /albums/:id/tracks/:trackId
const removeTrack = async (req, res, next) => {
  try {
    const album = await albumService.removeTrack(req.user.user_id, req.params.id, req.params.trackId);
    res.status(200).json(album);
  } catch (err) {
    next(err);
  }
};

// PUT /albums/:id/tracks/order
const reorderTracks = async (req, res, next) => {
  try {
    const { ordered_ids } = req.body;
    const album = await albumService.reorderTracks(req.user.user_id, req.params.id, ordered_ids);
    res.status(200).json(album);
  } catch (err) {
    next(err);
  }
};

export default {
  createAlbum,
  getAlbumById,
  getArtistAlbums,
  updateAlbum,
  updateArtwork,
  deleteAlbum,
  addTracks,
  removeTrack,
  reorderTracks,
};
