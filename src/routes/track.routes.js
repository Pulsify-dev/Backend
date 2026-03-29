import {Router} from 'express';
import trackController from '../controllers/track.controller.js';
import paginationMiddleware from '../middleware/pagination.middleware.js';
import authMiddleware from '../middleware/auth.middleware.js';
import {trackUpload as trackUploadMiddleware, trackArtworkUpload} from '../middleware/upload.middleware.js';

const router = Router();

router.post(
  "/tracks",
  authMiddleware.requireAuth,  // 1st: verify user is logged in
  trackUploadMiddleware,        // 2nd: parse audio_file and artwork_file
  trackController.createTrack   // 3rd: handle the request
);

router.get("/tracks/:id", trackController.getTrackById);
router.get("/tracks/:id/status", authMiddleware.requireAuth, trackController.getTrackStatus);
router.get("/tracks/:id/waveform", trackController.getWaveform); // Public - no auth needed
router.put("/tracks/:id/artwork", authMiddleware.requireAuth, trackArtworkUpload, trackController.updateArtwork);
router.patch("/tracks/:id", authMiddleware.requireAuth, trackController.updateTrack);
router.delete("/tracks/:id", authMiddleware.requireAuth, trackController.deleteTrack);
router.get("/artists/:id/tracks", paginationMiddleware.paginate, trackController.getArtistTracks);


export default router;
