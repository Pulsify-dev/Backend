import { Router } from "express";
import engagementController from "../controllers/engagement.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import paginationMiddleware from "../middleware/pagination.middleware.js";

const router = Router();

//Like a track (requires auth)
router.post(
  "/tracks/:track_id/like",
  authMiddleware.requireAuth,
  engagementController.likeTrack
);

//Unlike a track (requires auth)
router.delete(
  "/tracks/:track_id/like",
  authMiddleware.requireAuth,
  engagementController.unlikeTrack
);

//Get list of users who liked a track
router.get(
  "/tracks/:track_id/likes",
  paginationMiddleware.paginate,
  engagementController.getLikesByTrack
);

//Check if current user liked track (requires auth)
router.get(
  "/tracks/:track_id/liked",
  authMiddleware.requireAuth,
  engagementController.checkUserLikedTrack
);

//Like an album (requires auth)
router.post(
  "/albums/:album_id/like",
  authMiddleware.requireAuth,
  engagementController.likeAlbum
);

//Unlike an album (requires auth)
router.delete(
  "/albums/:album_id/like",
  authMiddleware.requireAuth,
  engagementController.unlikeAlbum
);

//Get list of users who liked an album
router.get(
  "/albums/:album_id/likes",
  paginationMiddleware.paginate,
  engagementController.getLikesByAlbum
);

//Check if current user liked album (requires auth)
router.get(
  "/albums/:album_id/liked",
  authMiddleware.requireAuth,
  engagementController.checkUserLikedAlbum
);


//Repost a track (requires auth)
router.post(
  "/tracks/:track_id/repost",
  authMiddleware.requireAuth,
  engagementController.repostTrack
);

//Unrepost a track (requires auth)
router.delete(
  "/tracks/:track_id/repost",
  authMiddleware.requireAuth,
  engagementController.unrepostTrack
);

//Get list of users who reposted a track
router.get(
  "/tracks/:track_id/reposts",
  paginationMiddleware.paginate,
  engagementController.getRepostsByTrack
);

//Check if current user reposted track (requires auth)
router.get(
  "/tracks/:track_id/reposted",
  authMiddleware.requireAuth,
  engagementController.checkUserRepostedTrack
);

//Repost an album (requires auth)
router.post(
  "/albums/:album_id/repost",
  authMiddleware.requireAuth,
  engagementController.repostAlbum
);

//Unrepost an album (requires auth)
router.delete(
  "/albums/:album_id/repost",
  authMiddleware.requireAuth,
  engagementController.unrepostAlbum
);

//Get list of users who reposted an album
router.get(
  "/albums/:album_id/reposts",
  paginationMiddleware.paginate,
  engagementController.getRepostsByAlbum
);

//Check if current user reposted album (requires auth)
router.get(
  "/albums/:album_id/reposted",
  authMiddleware.requireAuth,
  engagementController.checkUserRepostedAlbum
);


// Create a comment on a track (requires auth)
router.post(
  "/tracks/:track_id/comments",
  authMiddleware.requireAuth,
  engagementController.createComment
);

//Update a comment (requires auth)
router.patch(
  "/comments/:comment_id",
  authMiddleware.requireAuth,
  engagementController.updateComment
);

//Delete a comment (requires auth)
router.delete(
  "/comments/:comment_id",
  authMiddleware.requireAuth,
  engagementController.deleteComment
);

//Get comments on a track
router.get(
  "/tracks/:track_id/comments",
  paginationMiddleware.paginate,
  engagementController.getCommentsByTrack
);

//Get replies to a comment
router.get(
  "/comments/:comment_id/replies",
  paginationMiddleware.paginate,
  engagementController.getCommentReplies
);

export default router;
