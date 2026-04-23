import { Router } from "express";
import albumController from "../controllers/album.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import paginationMiddleware from "../middleware/pagination.middleware.js";
import { albumArtworkUpload } from "../middleware/upload.middleware.js";

const router = Router();

// ==========================================
// ALBUM MANAGEMENT (Artist Only)
// ==========================================

// Create a new album
router.post(
  "/albums",
  authMiddleware.requireAuth,
  albumArtworkUpload,
  albumController.createAlbum
);

// Update album metadata
router.patch(
  "/albums/:id",
  authMiddleware.requireAuth,
  albumController.updateAlbum
);

// Update album artwork
router.put(
  "/albums/:id/artwork",
  authMiddleware.requireAuth,
  albumArtworkUpload,
  albumController.updateArtwork
);

// Delete album
router.delete(
  "/albums/:id",
  authMiddleware.requireAuth,
  albumController.deleteAlbum
);

// ==========================================
// TRACK MANAGEMENT (Artist Only)
// ==========================================

// Add tracks to album
router.post(
  "/albums/:id/tracks",
  authMiddleware.requireAuth,
  albumController.addTracks
);

// Reorder tracks
router.put(
  "/albums/:id/tracks/order",
  authMiddleware.requireAuth,
  albumController.reorderTracks
);

// Remove track from album
router.delete(
  "/albums/:id/tracks/:trackId",
  authMiddleware.requireAuth,
  albumController.removeTrack
);

// ==========================================
// RETRIEVAL & DISCOVERY (Public)
// ==========================================

// Get a single album by ID (with tracks populated)
router.get(
  "/albums/:id",
  authMiddleware.optionalAuth,
  albumController.getAlbumById
);

// Get all albums by a specific artist
router.get(
  "/artists/:id/albums",
  paginationMiddleware.paginate,
  albumController.getArtistAlbums
);

export default router;
