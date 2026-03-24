import express from 'express';
import socialController from '../controllers/social.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = express.Router();


//suggested users to follow
router.get('/me/suggested', authMiddleware.requireAuth, socialController.getSuggestedUsers);

// blocked users list
router.get('/me/blocked', authMiddleware.requireAuth, socialController.getBlockedUsers);

//get users who have blocked you
router.get('/me/blockers', authMiddleware.requireAuth, socialController.getBlockers);


//follow a user
router.post('/:user_id/follow', authMiddleware.requireAuth, socialController.followUser);

//unfollow a user
router.delete('/:user_id/follow', authMiddleware.requireAuth, socialController.unfollowUser);

//get followers list
router.get('/:user_id/followers', socialController.getFollowers);

//following list
router.get('/:user_id/following', socialController.getFollowing);

//get relationship status
router.get('/:user_id/relationship', authMiddleware.requireAuth, socialController.getRelationshipStatus);

//mutual followers
router.get('/:user_id/mutual-followers', authMiddleware.requireAuth, socialController.getMutualFollowers);

//block a user
router.post('/:user_id/block', authMiddleware.requireAuth, socialController.blockUser);

//unblock
router.delete('/:user_id/block', authMiddleware.requireAuth, socialController.unblockUser);

//update block reason
router.patch('/:user_id/block', authMiddleware.requireAuth, socialController.updateBlockReason);

//get user social counts
router.get('/:user_id/social-counts', socialController.getUserSocialCounts);

export default router;
