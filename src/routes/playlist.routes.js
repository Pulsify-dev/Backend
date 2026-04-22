import { Router } from "express";
import playlistController from "../controllers/playlist.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import playlistValidation from "../middleware/playlist.validation.middleware.js";

const router = Router();

router.get("/discover/public", playlistController.getPublicPlaylists);


router.get("/search", playlistController.searchPlaylists);


router.get("/permalink/:permalink", playlistController.getPlaylistByPermalink);


router.get("/:playlistId", playlistController.getPlaylist);

router.post(
  "/",
  authMiddleware.requireAuth,
  playlistValidation.validateCreatePlaylist,
  playlistController.createPlaylist
);

router.get(
  "/",
  authMiddleware.requireAuth,
  playlistController.getUserPlaylists
);

router.patch(
  "/:playlistId",
  authMiddleware.requireAuth,
  playlistValidation.validateUpdatePlaylist,
  playlistController.updatePlaylist
);

router.delete(
  "/:playlistId",
  authMiddleware.requireAuth,
  playlistController.deletePlaylist
);

router.post(
  "/:playlistId/tracks/:trackId",
  authMiddleware.requireAuth,
  playlistController.addTrack
);


router.delete(
  "/:playlistId/tracks/:trackId",
  authMiddleware.requireAuth,
  playlistController.removeTrack
);

router.post(
  "/:playlistId/reorder",
  authMiddleware.requireAuth,
  playlistValidation.validateReorderTracks,
  playlistController.reorderTracks
);

router.patch(
  "/:playlistId/tracks/:trackId/move",
  authMiddleware.requireAuth,
  playlistValidation.validateMoveTrack,
  playlistController.moveTrack
);


router.patch(
  "/:playlistId/privacy",
  authMiddleware.requireAuth,
  playlistValidation.validateUpdatePrivacy,
  playlistController.updatePlaylistPrivacy
);

router.post(
  "/:playlistId/regenerate-token",
  authMiddleware.requireAuth,
  playlistController.regenerateSecretToken
);

router.get(
  "/:playlistId/embed",
  authMiddleware.requireAuth,
  playlistController.getEmbedCode
);

export default router;
