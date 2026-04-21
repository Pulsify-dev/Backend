import { Router } from "express";
import playlistController from "../controllers/playlist.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import { validatePlaylist } from "../factories/validation.factory.js";

const router = Router();

router.get("/discover/public", playlistController.getPublicPlaylists);


router.get("/search", playlistController.searchPlaylists);


router.get("/permalink/:permalink", playlistController.getPlaylistByPermalink);


router.get("/:playlistId", playlistController.getPlaylist);

router.post(
  "/",
  authMiddleware.requireAuth,
  validatePlaylist.createPlaylist,
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
  validatePlaylist.updatePlaylist,
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
  validatePlaylist.reorderTracks,
  playlistController.reorderTracks
);

router.patch(
  "/:playlistId/tracks/:trackId/move",
  authMiddleware.requireAuth,
  validatePlaylist.moveTrack,
  playlistController.moveTrack
);


router.patch(
  "/:playlistId/privacy",
  authMiddleware.requireAuth,
  validatePlaylist.updatePrivacy,
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
