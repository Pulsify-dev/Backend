import express from 'express';
import socialController from '../controllers/social.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = express.Router();

//follow a user
router.post('/:user_id/follow', authMiddleware, socialController.followUser);

//unfollow a user
router.delete('/:user_id/follow', authMiddleware, socialController.unfollowUser);

//get followers list
router.get('/:user_id/followers', socialController.getFollowers);

//following list
router.get('/:user_id/following', socialController.getFollowing);

//suggested users to follow
router.get('/me/suggested', authMiddleware, socialController.getSuggestedUsers);

//get relationship status
router.get('/:user_id/relationship', authMiddleware, socialController.getRelationshipStatus);

//mutual followers
router.get('/:user_id/mutual-followers', authMiddleware, socialController.getMutualFollowers);

//block a user
router.post('/:user_id/block', authMiddleware, socialController.blockUser);

//unblock
router.delete('/:user_id/block', authMiddleware, socialController.unblockUser);

//update block reason
router.patch('/:user_id/block', authMiddleware, socialController.updateBlockReason);

// blocked users list
router.get('/me/blocked', authMiddleware, socialController.getBlockedUsers);

//get users who have blocked you
router.get('/me/blockers', authMiddleware, socialController.getBlockers);

//get user social counts
router.get('/:user_id/social-counts', socialController.getUserSocialCounts);

export default router;
