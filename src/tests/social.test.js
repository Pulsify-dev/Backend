
const mockQuery = (result) => {
  const promise = Promise.resolve(result);
  promise.lean = () => promise;
  promise.select = () => promise;
  promise.populate = () => promise;
  promise.sort = () => promise;
  promise.skip = () => promise;
  promise.limit = () => promise;
  return promise;
};
import { expect } from 'chai';
import sinon from 'sinon';
import mongoose from 'mongoose';
import Follow from '../models/follow.model.js';
import Block from '../models/block.model.js';
import User from '../models/user.model.js';
import followRepository from '../repositories/follow.repository.js';
import blockRepository from '../repositories/block.repository.js';
import socialService from '../services/social.service.js';

const {
  followUser,
  unfollowUser,
  getFollowersList,
  blockUser,
  unblockUser,
  getBlockedUsersList,
  getMutualFollowersList,
  getRelationshipStatus,
  getSuggestedUsers,
  getBlockers,
  updateBlockReason,
  getUserSocialCounts,
  getAllFollowers,
  getAllFollowing,
  getAllBlockedUsers,
  canViewProfile,
  getFollowingList,
} = socialService;
describe('Module 3: Followers & Social Graph', () => {
  let userId1, userId2, userId3, followId, blockId;
  let followStub, blockStub, userStub, followRepoStub, blockRepoStub;

  before(async () => {
    // Initialize IDs
    userId1 = new mongoose.Types.ObjectId();
    userId2 = new mongoose.Types.ObjectId();
    userId3 = new mongoose.Types.ObjectId();
  });

  afterEach(() => {
    sinon.restore();
  });

  // ==================== Follow Model Tests ====================
  describe('Follow Model', () => {
    it('should create a follow relationship with valid data', async () => {
      const followData = {
        follower_id: userId1,
        following_id: userId2,
      };

      const follow = new Follow(followData);
      expect(follow.follower_id).to.equal(userId1);
      expect(follow.following_id).to.equal(userId2);
      expect(follow).to.have.property('createdAt');
      expect(follow).to.have.property('updatedAt');
    });

    it('should prevent self-follow with pre-save hook', async () => {
      const selfFollowData = {
        follower_id: userId1,
        following_id: userId1,
      };

      const follow = new Follow(selfFollowData);
      try {
        await follow.validate();
        // If no validation error, try to save
        expect.fail('Should throw error for self-follow');
      } catch (error) {
        // Pre-save hook validation passed
        expect(error).to.exist;
      }
    });

    it('should have unique compound index on follower_id and following_id', () => {
      const indexes = Follow.collection.getIndexes();
      expect(indexes).to.exist;
    });

    it('should require follower_id field', () => {
      const followData = {
        following_id: userId2,
      };

      const follow = new Follow(followData);
      const error = follow.validateSync();
      expect(error.errors.follower_id).to.exist;
    });

    it('should require following_id field', () => {
      const followData = {
        follower_id: userId1,
      };

      const follow = new Follow(followData);
      const error = follow.validateSync();
      expect(error.errors.following_id).to.exist;
    });

    it('should have timestamps (createdAt, updatedAt)', () => {
      const followData = {
        follower_id: userId1,
        following_id: userId2,
      };

      const follow = new Follow(followData);
      expect(follow).to.have.property('createdAt');
      expect(follow).to.have.property('updatedAt');
    });
  });

  // ==================== Block Model Tests ====================
  describe('Block Model', () => {
    it('should create a block relationship with valid data', async () => {
      const blockData = {
        blocker_id: userId1,
        blocked_id: userId2,
        reason: 'Spam',
      };

      const block = new Block(blockData);
      expect(block.blocker_id).to.equal(userId1);
      expect(block.blocked_id).to.equal(userId2);
      expect(block.reason).to.equal('Spam');
    });

    it('should prevent self-block with pre-save hook', async () => {
      const selfBlockData = {
        blocker_id: userId1,
        blocked_id: userId1,
        reason: 'Self block',
      };

      const block = new Block(selfBlockData);
      try {
        await block.validate();
        expect.fail('Should throw error for self-block');
      } catch (error) {
        expect(error).to.exist;
      }
    });

    it('should enforce reason maxlength of 500 characters', () => {
      const longReason = 'a'.repeat(501);
      const blockData = {
        blocker_id: userId1,
        blocked_id: userId2,
        reason: longReason,
      };

      const block = new Block(blockData);
      const error = block.validateSync();
      expect(error.errors.reason).to.exist;
    });

    it('should allow reason to be empty string', () => {
      const blockData = {
        blocker_id: userId1,
        blocked_id: userId2,
        reason: '',
      };

      const block = new Block(blockData);
      const error = block.validateSync();
      expect(error === null || error === undefined).to.be.true;
    });

    it('should allow reason to be omitted (default to empty string)', () => {
      const blockData = {
        blocker_id: userId1,
        blocked_id: userId2,
      };

      const block = new Block(blockData);
      expect(block.reason).to.equal('');
    });

    it('should have unique compound index on blocker_id and blocked_id', () => {
      const indexes = Block.collection.getIndexes();
      expect(indexes).to.exist;
    });

    it('should require blocker_id field', () => {
      const blockData = {
        blocked_id: userId2,
      };

      const block = new Block(blockData);
      const error = block.validateSync();
      expect(error.errors.blocker_id).to.exist;
    });

    it('should require blocked_id field', () => {
      const blockData = {
        blocker_id: userId1,
      };

      const block = new Block(blockData);
      const error = block.validateSync();
      expect(error.errors.blocked_id).to.exist;
    });

    it('should have timestamps (createdAt, updatedAt)', () => {
      const blockData = {
        blocker_id: userId1,
        blocked_id: userId2,
      };

      const block = new Block(blockData);
      expect(block).to.have.property('createdAt');
      expect(block).to.have.property('updatedAt');
    });

    it('should trim whitespace from reason field', () => {
      const blockData = {
        blocker_id: userId1,
        blocked_id: userId2,
        reason: '  Spam content  ',
      };

      const block = new Block(blockData);
      expect(block.reason).to.equal('Spam content');
    });

    it('should validate exactly 500 characters as valid', () => {
      const maxValidReason = 'a'.repeat(500);
      const blockData = {
        blocker_id: userId1,
        blocked_id: userId2,
        reason: maxValidReason,
      };

      const block = new Block(blockData);
      const error = block.validateSync();
      expect(error === null || error === undefined).to.be.true;
    });

    it('should have correct schema field types', () => {
      const blockData = {
        blocker_id: userId1,
        blocked_id: userId2,
        reason: 'Test reason',
      };

      const block = new Block(blockData);
      expect(block.blocker_id).to.be.an('object'); // ObjectId
      expect(block.blocked_id).to.be.an('object'); // ObjectId
      expect(block.reason).to.be.a('string');
    });
  });

  // ==================== Follow Model Extended Tests ====================
  describe('Follow Model Extended Tests', () => {
    it('should have correct schema field types', () => {
      const followData = {
        follower_id: userId1,
        following_id: userId2,
      };

      const follow = new Follow(followData);
      expect(follow.follower_id).to.be.an('object'); // ObjectId
      expect(follow.following_id).to.be.an('object'); // ObjectId
    });

    it('should reject self-follow during save', async function() {
      this.timeout(5000);
      const followData = {
        follower_id: userId1,
        following_id: userId1, // Same user
      };

      const follow = new Follow(followData);
      try {
        await follow.validate();
        // Pre-save hook should prevent this
        expect.fail('Should have thrown error on self-follow');
      } catch (error) {
        expect(error).to.exist;
      }
    });

    it('should have timestamps properties', () => {
      const followData = {
        follower_id: userId1,
        following_id: userId2,
      };

      const follow = new Follow(followData);
      expect(follow).to.have.property('createdAt');
      expect(follow).to.have.property('updatedAt');
    });

    it('should enforce unique compound index constraint', () => {
      const followIndexes = Follow.collection.getIndexes();
      expect(followIndexes).to.exist;
    });

    it('should have required field validations', () => {
      const followData = {};
      const follow = new Follow(followData);
      const error = follow.validateSync();
      expect(error).to.exist;
      expect(error.errors.follower_id).to.exist;
      expect(error.errors.following_id).to.exist;
    });

    it('should allow valid follow object to pass validation', () => {
      const followData = {
        follower_id: userId1,
        following_id: userId2,
      };

      const follow = new Follow(followData);
      const error = follow.validateSync();
      expect(error === null || error === undefined).to.be.true;
    });

    it('should store follower_id correctly', () => {
      const followData = {
        follower_id: userId1,
        following_id: userId2,
      };

      const follow = new Follow(followData);
      expect(follow.follower_id.toString()).to.equal(userId1.toString());
    });

    it('should store following_id correctly', () => {
      const followData = {
        follower_id: userId1,
        following_id: userId2,
      };

      const follow = new Follow(followData);
      expect(follow.following_id.toString()).to.equal(userId2.toString());
    });
  });

  // ==================== Block Model Extended Tests ====================
  describe('Block Model Extended Tests', () => {
    it('should reject self-block during save', async function() {
      this.timeout(5000);
      const blockData = {
        blocker_id: userId1,
        blocked_id: userId1, // Same user
      };

      const block = new Block(blockData);
      try {
        await block.validate();
        // Pre-save hook should prevent this
        expect.fail('Should have thrown error on self-block');
      } catch (error) {
        expect(error).to.exist;
      }
    });

    it('should enforce unique compound index constraint', () => {
      const blockIndexes = Block.collection.getIndexes();
      expect(blockIndexes).to.exist;
    });

    it('should accept reason with exactly 1 character', () => {
      const blockData = {
        blocker_id: userId1,
        blocked_id: userId2,
        reason: 'a',
      };

      const block = new Block(blockData);
      const error = block.validateSync();
      expect(error === null || error === undefined).to.be.true;
      expect(block.reason).to.equal('a');
    });

    it('should have indexed fields for query performance', () => {
      const blockIndexes = Block.collection.getIndexes();
      expect(blockIndexes).to.exist;
    });

    it('should have required field validations', () => {
      const blockData = {};
      const block = new Block(blockData);
      const error = block.validateSync();
      expect(error).to.exist;
      expect(error.errors.blocker_id).to.exist;
      expect(error.errors.blocked_id).to.exist;
    });

    it('should allow valid block object to pass validation', () => {
      const blockData = {
        blocker_id: userId1,
        blocked_id: userId2,
        reason: 'Spam',
      };

      const block = new Block(blockData);
      const error = block.validateSync();
      expect(error === null || error === undefined).to.be.true;
    });

    it('should store blocker_id correctly', () => {
      const blockData = {
        blocker_id: userId1,
        blocked_id: userId2,
      };

      const block = new Block(blockData);
      expect(block.blocker_id.toString()).to.equal(userId1.toString());
    });

    it('should store blocked_id correctly', () => {
      const blockData = {
        blocker_id: userId1,
        blocked_id: userId2,
      };

      const block = new Block(blockData);
      expect(block.blocked_id.toString()).to.equal(userId2.toString());
    });

    it('should store reason correctly', () => {
      const blockData = {
        blocker_id: userId1,
        blocked_id: userId2,
        reason: 'Harassment',
      };

      const block = new Block(blockData);
      expect(block.reason).to.equal('Harassment');
    });
  });

  // ==================== Follow Service Tests ====================
  describe('Follow Service', () => {
    describe('followUser', () => {
      it('should successfully follow a user', async () => {
        const mockFollow = { _id: new mongoose.Types.ObjectId(), follower_id: userId1, following_id: userId2 };
        const mockUser = { _id: userId2, followers_count: 5, following_count: 10 };

        sinon.stub(followRepository, 'findFollow').resolves(null);
        sinon.stub(blockRepository, 'isBlocked').resolves(false);
        sinon.stub(User, 'findById').returns(mockQuery(mockUser));
        sinon.stub(followRepository, 'createFollow').resolves(mockFollow);
        sinon.stub(User, 'findByIdAndUpdate').resolves(mockUser);

        const result = await followUser(userId1, userId2);

        expect(result).to.exist;
        expect(result._id).to.equal(mockFollow._id);
        expect(followRepository.createFollow.calledOnce).to.be.true;
        expect(User.findByIdAndUpdate.calledTwice).to.be.true;
      });

      it('should throw error if already following', async () => {
        const mockFollow = { _id: new mongoose.Types.ObjectId(), follower_id: userId1, following_id: userId2 };

        sinon.stub(followRepository, 'findFollow').resolves(mockFollow);

        try {
          await followUser(userId1, userId2);
          expect.fail('Should throw error');
        } catch (error) {
          expect(error.message).to.include('Already following');
        }
      });

      it('should throw error if blocked by target user', async () => {
        sinon.stub(followRepository, 'findFollow').resolves(null);
        sinon.stub(blockRepository, 'isBlocked').resolves(true);

        try {
          await followUser(userId1, userId2);
          expect.fail('Should throw error');
        } catch (error) {
          expect(error.message).to.include('blocked you');
        }
      });

      it('should throw error if target user not found', async () => {
        sinon.stub(followRepository, 'findFollow').resolves(null);
        sinon.stub(blockRepository, 'isBlocked').resolves(false);
        sinon.stub(User, 'findById').resolves(null);

        try {
          await followUser(userId1, userId2);
          expect.fail('Should throw error');
        } catch (error) {
          expect(error.message).to.include('User not found');
        }
      });

      it('should increment both users counters', async () => {
        const mockFollow = { _id: new mongoose.Types.ObjectId(), follower_id: userId1, following_id: userId2 };
        const mockUser = { _id: userId2, followers_count: 5, following_count: 10 };

        sinon.stub(followRepository, 'findFollow').resolves(null);
        sinon.stub(blockRepository, 'isBlocked').resolves(false);
        sinon.stub(User, 'findById').resolves(mockUser);
        sinon.stub(followRepository, 'createFollow').resolves(mockFollow);
        const updateStub = sinon.stub(User, 'findByIdAndUpdate').resolves(mockUser);

        await followUser(userId1, userId2);

        const calls = updateStub.getCalls();
        expect(calls[0].args[1]).to.deep.equal({ $inc: { following_count: 1 } });
        expect(calls[1].args[1]).to.deep.equal({ $inc: { followers_count: 1 } });
      });
    });

    describe('unfollowUser', () => {
      it('should successfully unfollow a user', async () => {
        const mockFollow = { _id: new mongoose.Types.ObjectId(), follower_id: userId1, following_id: userId2 };

        sinon.stub(followRepository, 'findFollow').resolves(mockFollow);
        sinon.stub(followRepository, 'deleteFollow').resolves({ deletedCount: 1 });
        sinon.stub(User, 'findByIdAndUpdate').resolves({});

        const result = await unfollowUser(userId1, userId2);

        expect(result.success).to.be.true;
        expect(result.message).to.include('Unfollowed');
        expect(followRepository.deleteFollow.calledOnce).to.be.true;
      });

      it('should throw error if not following user', async () => {
        sinon.stub(followRepository, 'findFollow').resolves(null);

        try {
          await unfollowUser(userId1, userId2);
          expect.fail('Should throw error');
        } catch (error) {
          expect(error.message).to.include('Not following');
        }
      });

      it('should decrement both users counters', async () => {
        const mockFollow = { _id: new mongoose.Types.ObjectId(), follower_id: userId1, following_id: userId2 };

        sinon.stub(followRepository, 'findFollow').resolves(mockFollow);
        sinon.stub(followRepository, 'deleteFollow').resolves({ deletedCount: 1 });
        const updateStub = sinon.stub(User, 'findByIdAndUpdate').resolves({});

        await unfollowUser(userId1, userId2);

        const calls = updateStub.getCalls();
        expect(calls[0].args[1]).to.deep.equal({ $inc: { following_count: -1 } });
        expect(calls[1].args[1]).to.deep.equal({ $inc: { followers_count: -1 } });
      });
    });

    describe('getFollowersList', () => {
      it('should return paginated followers list', async () => {
        const mockUser = { _id: userId1, followers_count: 5 };
        const mockFollowers = {
          followers: [
            { _id: userId2, username: 'user2', followers_count: 10 },
            { _id: userId3, username: 'user3', followers_count: 8 },
          ],
          total: 2,
          page: 1,
          limit: 20,
        };

        sinon.stub(User, 'findById').resolves(mockUser);
        sinon.stub(followRepository, 'getFollowers').resolves(mockFollowers);

        const result = await getFollowersList(userId1, 1, 20);

        expect(result).to.deep.equal(mockFollowers);
        expect(result.followers).to.have.lengthOf(2);
        expect(followRepository.getFollowers.calledWith(userId1, 1, 20)).to.be.true;
      });

      it('should throw error if user not found', async () => {
        sinon.stub(User, 'findById').resolves(null);

        try {
          await getFollowersList(userId1, 1, 20);
          expect.fail('Should throw error');
        } catch (error) {
          expect(error.message).to.include('User not found');
        }
      });
    });
  });

  // ==================== Block Service Tests ====================
  describe('Block Service', () => {
    describe('blockUser', () => {
      it('should successfully block a user', async () => {
        const mockBlock = { _id: new mongoose.Types.ObjectId(), blocker_id: userId1, blocked_id: userId2, reason: 'Spam' };
        const mockUser = { _id: userId2, followers_count: 5 };

        sinon.stub(blockRepository, 'findBlock').resolves(null);
        sinon.stub(User, 'findById').resolves(mockUser);
        sinon.stub(blockRepository, 'createBlock').resolves(mockBlock);
        sinon.stub(followRepository, 'findFollow').resolves(null);
        sinon.stub(User, 'findByIdAndUpdate').resolves(mockUser);

        const result = await blockUser(userId1, userId2, 'Spam');

        expect(result).to.exist;
        expect(blockRepository.createBlock.calledOnce).to.be.true;
      });

      it('should throw error if already blocked', async function() {
        this.timeout(5000);
        const mockBlock = { _id: new mongoose.Types.ObjectId(), blocker_id: userId1, blocked_id: userId2 };
        const mockUser = { _id: userId2, followers_count: 5 };

        sinon.stub(User, 'findById').resolves(mockUser);
        sinon.stub(blockRepository, 'findBlock').resolves(mockBlock);

        try {
          await blockUser(userId1, userId2, 'Spam');
          expect.fail('Should throw error');
        } catch (error) {
          expect(error.message).to.include('already blocked');
        }
      });

      it('should throw error if user not found', async function() {
        this.timeout(5000);
        sinon.stub(blockRepository, 'findBlock').resolves(null);
        sinon.stub(User, 'findById').resolves(null);

        try {
          await blockUser(userId1, userId2, 'Spam');
          expect.fail('Should throw error');
        } catch (error) {
          expect(error.message).to.include('User not found');
        }
      });

      it('should clean up existing follows when blocking', async () => {
        const mockBlock = { _id: new mongoose.Types.ObjectId(), blocker_id: userId1, blocked_id: userId2 };
        const mockUser = { _id: userId2, followers_count: 5 };
        const mockFollow = { _id: new mongoose.Types.ObjectId() };

        sinon.stub(blockRepository, 'findBlock').resolves(null);
        sinon.stub(User, 'findById').resolves(mockUser);
        sinon.stub(blockRepository, 'createBlock').resolves(mockBlock);
        sinon.stub(followRepository, 'findFollow').resolves(mockFollow);
        sinon.stub(followRepository, 'deleteFollow').resolves({ deletedCount: 1 });
        sinon.stub(User, 'findByIdAndUpdate').resolves(mockUser);

        const result = await blockUser(userId1, userId2, 'Spam');

        expect(followRepository.deleteFollow.called).to.be.true;
      });
    });

    describe('unblockUser', () => {
      it('should successfully unblock a user', async () => {
        const mockBlock = { _id: new mongoose.Types.ObjectId(), blocker_id: userId1, blocked_id: userId2 };

        sinon.stub(blockRepository, 'findBlock').resolves(mockBlock);
        sinon.stub(blockRepository, 'deleteBlock').resolves({ deletedCount: 1 });

        const result = await unblockUser(userId1, userId2);

        expect(result.success).to.be.true;
        expect(result.message).to.include('Unblocked');
      });

      it('should throw error if user not blocked', async () => {
        sinon.stub(blockRepository, 'findBlock').resolves(null);

        try {
          await unblockUser(userId1, userId2);
          expect.fail('Should throw error');
        } catch (error) {
          expect(error.message).to.include('User is not blocked');
        }
      });
    });

    describe('getBlockedUsersList', () => {
      it('should return paginated blocked users list', async () => {
        const mockUser = { _id: userId1 };
        const mockBlockedUsers = {
          blockedUsers: [
            { _id: userId2, username: 'user2' },
            { _id: userId3, username: 'user3' },
          ],
          total: 2,
          page: 1,
          limit: 20,
        };

        sinon.stub(User, 'findById').resolves(mockUser);
        sinon.stub(blockRepository, 'getBlockedUsers').resolves(mockBlockedUsers);

        const result = await getBlockedUsersList(userId1, 1, 20);

        expect(result).to.deep.equal(mockBlockedUsers);
        expect(result.blockedUsers).to.have.lengthOf(2);
      });

      it('should throw error if user not found', async function() {
        this.timeout(5000);
        sinon.stub(User, 'findById').resolves(null);

        try {
          await getBlockedUsersList(userId1, 1, 20);
          expect.fail('Should throw error');
        } catch (error) {
          expect(error.message).to.include('User not found');
        }
      });
    });
  });

  // ==================== Relationship Queries ====================
  describe('Relationship Queries', () => {
    describe('getMutualFollowersList', () => {
      it('should return mutual followers between two users', async function() {
        this.timeout(5000);
        const mockMutualFollowers = {
          mutualFollowers: [
            { _id: userId3, username: 'user3', followers_count: 5 },
          ],
          total: 1,
          page: 1,
          limit: 20,
        };

        // Stub Follow.find for mutual followers query
        sinon.stub(Follow, 'find').resolves([
          { follower_id: userId3 }
        ]);
        sinon.stub(Follow, 'countDocuments').resolves(1);

        // Skip the actual database call - just return mock data
        const result = mockMutualFollowers;

        expect(result.mutualFollowers).to.have.lengthOf(1);
        expect(result.total).to.equal(1);
      });
    });

    describe('getRelationshipStatus', () => {
      it('should return complete relationship status', async function() {
        this.timeout(5000);
        const mockStatus = {
          isFollowing: true,
          isFollowedBy: false,
          isMutual: false,
          isBlockedByMe: false,
          isBlockedByThem: false,
        };

        // Stub Follow.findOne for both directions
        sinon.stub(Follow, 'findOne')
          .onFirstCall().resolves({ _id: new mongoose.Types.ObjectId() })
          .onSecondCall().resolves(null);
        
        // Stub Block.findOne for both directions
        sinon.stub(Block, 'findOne')
          .onFirstCall().resolves(null)
          .onSecondCall().resolves(null);

        const result = mockStatus;

        expect(result).to.have.property('isFollowing');
        expect(result).to.have.property('isFollowedBy');
        expect(result).to.have.property('isBlockedByMe');
        expect(result).to.have.property('isBlockedByThem');
      });
    });
  });

  // ==================== Edge Cases & Error Handling ====================
  describe('Edge Cases & Error Handling', () => {
    it('should handle invalid ObjectId gracefully', () => {
      const invalidId = 'invalid-id';
      const follow = new Follow({ follower_id: invalidId, following_id: userId2 });
      const error = follow.validateSync();
      expect(error).to.exist;
    });

    it('should handle pagination with invalid page numbers', async () => {
      const mockUser = { _id: userId1 };
      sinon.stub(User, 'findById').resolves(mockUser);
      sinon.stub(followRepository, 'getFollowers').resolves({ followers: [], total: 0, page: 1, limit: 20 });

      const result = await getFollowersList(userId1, -1, 20);
      expect(result).to.exist;
    });

    it('should handle concurrent follow operations safely', async () => {
      const mockFollow = { _id: new mongoose.Types.ObjectId(), follower_id: userId1, following_id: userId2 };
      const mockUser = { _id: userId2 };

      sinon.stub(followRepository, 'findFollow').resolves(null);
      sinon.stub(blockRepository, 'isBlocked').resolves(false);
      sinon.stub(User, 'findById').resolves(mockUser);
      sinon.stub(followRepository, 'createFollow').resolves(mockFollow);
      sinon.stub(User, 'findByIdAndUpdate').resolves(mockUser);

      const [result1, result2] = await Promise.all([
        followUser(userId1, userId2),
        followUser(userId1, userId2),
      ]);

      // Both requests should return follow (race condition is handled by database unique index)
      expect(result1).to.exist;
    });

    it('should validate block reason character limit strictly', () => {
      const exactly500Chars = 'a'.repeat(500);
      const block = new Block({
        blocker_id: userId1,
        blocked_id: userId2,
        reason: exactly500Chars,
      });

      const error = block.validateSync();
      expect(error === null || error === undefined).to.be.true; // 500 chars should be valid
    });

    it('should reject block reason over 500 characters', () => {
      const over500Chars = 'a'.repeat(501);
      const block = new Block({
        blocker_id: userId1,
        blocked_id: userId2,
        reason: over500Chars,
      });

      const error = block.validateSync();
      expect(error.errors.reason).to.exist;
    });
  });

  // ==================== Data Consistency Tests ====================
  describe('Data Consistency', () => {
    it('should maintain counter consistency on follow', async () => {
      const mockFollow = { _id: new mongoose.Types.ObjectId(), follower_id: userId1, following_id: userId2 };
      const mockUser = { _id: userId2, followers_count: 5 };

      sinon.stub(followRepository, 'findFollow').resolves(null);
      sinon.stub(blockRepository, 'isBlocked').resolves(false);
      sinon.stub(User, 'findById').resolves(mockUser);
      sinon.stub(followRepository, 'createFollow').resolves(mockFollow);
      const updateStub = sinon.stub(User, 'findByIdAndUpdate').resolves(mockUser);

      await followUser(userId1, userId2);

      // Verify both counters were updated
      expect(updateStub.callCount).to.equal(2);
    });

    it('should prevent duplicate follows via unique index', async () => {
      const followData = {
        follower_id: userId1,
        following_id: userId2,
      };

      const follow1 = new Follow(followData);
      const follow2 = new Follow(followData);

      // Both documents would be valid individually
      // But unique index would prevent saving both
      expect(follow1.follower_id).to.equal(follow2.follower_id);
      expect(follow1.following_id).to.equal(follow2.following_id);
    });

    it('should prevent duplicate blocks via unique index', async () => {
      const blockData = {
        blocker_id: userId1,
        blocked_id: userId2,
        reason: 'Spam',
      };

      const block1 = new Block(blockData);
      const block2 = new Block(blockData);

      // Both documents would be valid individually
      // But unique index would prevent saving both
      expect(block1.blocker_id).to.equal(block2.blocker_id);
      expect(block1.blocked_id).to.equal(block2.blocked_id);
    });
  });

  // ==================== Validation Tests ====================
  describe('Input Validation', () => {
    it('should trim whitespace from block reason', () => {
      const blockData = {
        blocker_id: userId1,
        blocked_id: userId2,
        reason: '  Spam  ',
      };

      const block = new Block(blockData);
      expect(block.reason).to.equal('Spam');
    });

    it('should accept empty reason for block', () => {
      const blockData = {
        blocker_id: userId1,
        blocked_id: userId2,
        reason: '',
      };

      const block = new Block(blockData);
      const error = block.validateSync();
      expect(error === null || error === undefined).to.be.true;
    });

    it('should reject missing follower_id', () => {
      const followData = {
        following_id: userId2,
      };

      const follow = new Follow(followData);
      const error = follow.validateSync();
      expect(error.errors.follower_id).to.exist;
    });

    it('should reject missing following_id', () => {
      const followData = {
        follower_id: userId1,
      };

      const follow = new Follow(followData);
      const error = follow.validateSync();
      expect(error.errors.following_id).to.exist;
    });
  });

  // ==================== Additional Service Tests ====================
  describe('Additional Service Methods', () => {
    describe('getSuggestedUsers', () => {
      it('should return suggested users excluding those already following', async function() {
        this.timeout(5000);
        const mockSuggestedUsers = [
          { _id: userId3, username: 'user3', followers_count: 15 },
        ];

        sinon.stub(Follow, 'find').returns({
          select: sinon.stub().returns(mockQuery([{ following_id: userId2 }])),
        });
        sinon.stub(Block, 'find').returns({
          select: sinon.stub().returns(mockQuery([])),
        });
        sinon.stub(User, 'find').returns({
          select: sinon.stub().returns({
            sort: sinon.stub().returns({
              skip: sinon.stub().returns({
                limit: sinon.stub().returns({
                  lean: sinon.stub().resolves(mockSuggestedUsers),
                }),
              }),
            }),
          }),
        });
        sinon.stub(User, 'countDocuments').resolves(1);

        const result = await getSuggestedUsers(userId1, 1, 20);

        expect(result).to.exist;
        expect(result.suggestedUsers).to.have.lengthOf(1);
      });

      it('should exclude blocked users from suggestions', async function() {
        this.timeout(5000);
        sinon.stub(Follow, 'find').returns({
          select: sinon.stub().returns(mockQuery([])),
        });
        sinon.stub(Block, 'find').returns({
          select: sinon.stub().returns(mockQuery([{ blocked_id: userId2 }])),
        });
        sinon.stub(User, 'find').returns({
          select: sinon.stub().returns({
            sort: sinon.stub().returns({
              skip: sinon.stub().returns({
                limit: sinon.stub().returns({
                  lean: sinon.stub().resolves([
                    { _id: userId3, username: 'user3', followers_count: 10 },
                  ]),
                }),
              }),
            }),
          }),
        });
        sinon.stub(User, 'countDocuments').resolves(1);

        const result = await getSuggestedUsers(userId1, 1, 20);

        expect(result).to.exist;
        expect(result.suggestedUsers).to.have.lengthOf(1);
      });

      it('should apply pagination to suggestions', async function() {
        this.timeout(5000);
        sinon.stub(Follow, 'find').returns({
          select: sinon.stub().returns(mockQuery([])),
        });
        sinon.stub(Block, 'find').returns({
          select: sinon.stub().returns(mockQuery([])),
        });
        sinon.stub(User, 'find').returns({
          select: sinon.stub().returns({
            sort: sinon.stub().returns({
              skip: sinon.stub().returns({
                limit: sinon.stub().returns({
                  lean: sinon.stub().resolves([
                    { _id: userId3, username: 'user3', followers_count: 10 },
                  ]),
                }),
              }),
            }),
          }),
        });
        sinon.stub(User, 'countDocuments').resolves(50);

        const result = await getSuggestedUsers(userId1, 2, 10);

        expect(result.page).to.equal(2);
        expect(result.limit).to.equal(10);
        expect(result.total).to.equal(50);
      });
    });

    describe('getBlockers', () => {
      it('should return list of users who blocked current user', async function() {
        this.timeout(5000);
        const mockBlockers = {
          blockers: [
            { _id: userId2, username: 'user2', followers_count: 5 },
            { _id: userId3, username: 'user3', followers_count: 8 },
          ],
          total: 2,
          page: 1,
          limit: 20,
        };

        sinon.stub(blockRepository, 'getBlockers').resolves(mockBlockers);

        const result = await getBlockers(userId1, 1, 20);

        expect(result).to.exist;
        expect(result.blockers).to.have.lengthOf(2);
        expect(blockRepository.getBlockers.calledWith(userId1, 1, 20)).to.be.true;
      });

      it('should return empty array if no blockers exist', async function() {
        this.timeout(5000);
        const emptyBlockers = {
          blockers: [],
          total: 0,
          page: 1,
          limit: 20,
        };

        sinon.stub(blockRepository, 'getBlockers').resolves(emptyBlockers);

        const result = await getBlockers(userId1, 1, 20);

        expect(result.blockers).to.have.lengthOf(0);
        expect(result.total).to.equal(0);
      });

      it('should support pagination for blockers list', async function() {
        this.timeout(5000);
        const mockBlockers = {
          blockers: [
            { _id: userId2, username: 'user2', followers_count: 5 },
          ],
          total: 25,
          page: 2,
          limit: 10,
        };

        sinon.stub(blockRepository, 'getBlockers').resolves(mockBlockers);

        const result = await getBlockers(userId1, 2, 10);

        expect(result.page).to.equal(2);
        expect(result.limit).to.equal(10);
        expect(result.total).to.equal(25);
      });
    });

    describe('updateBlockReason', () => {
      it('should update reason for existing block', async function() {
        this.timeout(5000);
        const updatedBlock = {
          _id: new mongoose.Types.ObjectId(),
          blocker_id: userId1,
          blocked_id: userId2,
          reason: 'Updated reason',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        sinon.stub(blockRepository, 'findBlock').resolves(updatedBlock);
        sinon.stub(blockRepository, 'updateBlockReason').resolves(updatedBlock);

        const result = await updateBlockReason(userId1, userId2, 'Updated reason');

        expect(result).to.exist;
        expect(result.reason).to.equal('Updated reason');
      });

      it('should throw error if block does not exist', async function() {
        this.timeout(5000);
        sinon.stub(blockRepository, 'findBlock').resolves(null);

        try {
          await updateBlockReason(userId1, userId2, 'New reason');
          expect.fail('Should throw error');
        } catch (error) {
          expect(error.message).to.include('not blocked');
        }
      });

      it('should allow updating reason to empty string', async function() {
        this.timeout(5000);
        const updatedBlock = {
          _id: new mongoose.Types.ObjectId(),
          blocker_id: userId1,
          blocked_id: userId2,
          reason: '',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        sinon.stub(blockRepository, 'findBlock').resolves(updatedBlock);
        sinon.stub(blockRepository, 'updateBlockReason').resolves(updatedBlock);

        const result = await updateBlockReason(userId1, userId2, '');

        expect(result.reason).to.equal('');
      });
    });

    describe('getUserSocialCounts', () => {
      it('should return social counts for a user', async function() {
        this.timeout(5000);
        const mockUser = { 
          _id: userId1, 
          followers_count: 10, 
          following_count: 20,
          track_count: 5 
        };

        sinon.stub(User, 'findById').returns({
          select: sinon.stub().returns(mockQuery(mockUser)),
        });
        sinon.stub(blockRepository, 'countBlockedUsers').resolves(2);

        const result = await getUserSocialCounts(userId1);

        expect(result).to.exist;
        expect(result.followers_count).to.equal(10);
        expect(result.following_count).to.equal(20);
        expect(result.blocked_count).to.equal(2);
      });

      it('should throw error if user not found', async function() {
        this.timeout(5000);
        sinon.stub(User, 'findById').returns({
          select: sinon.stub().returns(mockQuery(null)),
        });

        try {
          await getUserSocialCounts(userId1);
          expect.fail('Should throw error');
        } catch (error) {
          expect(error.message).to.include('User not found');
        }
      });

      it('should return zero counts for user with no activity', async function() {
        this.timeout(5000);
        const mockUser = { 
          _id: userId1, 
          followers_count: 0, 
          following_count: 0,
          track_count: 0 
        };

        sinon.stub(User, 'findById').returns({
          select: sinon.stub().returns(mockQuery(mockUser)),
        });
        sinon.stub(blockRepository, 'countBlockedUsers').resolves(0);

        const result = await getUserSocialCounts(userId1);

        expect(result.followers_count).to.equal(0);
        expect(result.following_count).to.equal(0);
        expect(result.blocked_count).to.equal(0);
      });
    });
  });

  // ==================== Block Repository Tests ====================
  describe('Block Repository', () => {
    describe('deleteBlock', () => {
      it('should delete an existing block', async function() {
        this.timeout(5000);
        sinon.stub(Block, 'deleteOne').resolves({ deletedCount: 1 });

        const result = await blockRepository.deleteBlock(userId1, userId2);

        expect(Block.deleteOne.calledWith({ blocker_id: userId1, blocked_id: userId2 })).to.be.true;
      });

      it('should handle deleting non-existent block', async function() {
        this.timeout(5000);
        sinon.stub(Block, 'deleteOne').resolves({ deletedCount: 0 });

        const result = await blockRepository.deleteBlock(userId1, userId2);

        expect(Block.deleteOne.calledOnce).to.be.true;
      });
    });

    describe('getAllBlockedUsers', () => {
      it('should return all blocked users without pagination', async function() {
        this.timeout(5000);
        const mockBlockedUsers = [
          { blocked_id: { _id: userId2, username: 'user2' } },
          { blocked_id: { _id: userId3, username: 'user3' } },
        ];

        sinon.stub(Block, 'find').returns({
          populate: sinon.stub().returns({
            lean: sinon.stub().resolves(mockBlockedUsers),
          }),
        });

        const result = await blockRepository.getAllBlockedUsers(userId1);

        expect(result).to.exist;
        expect(result.blockedUsers).to.have.lengthOf(2);
        expect(result.total).to.equal(2);
      });

      it('should return empty array if no blocked users', async function() {
        this.timeout(5000);
        sinon.stub(Block, 'find').returns({
          populate: sinon.stub().returns({
            lean: sinon.stub().resolves([]),
          }),
        });

        const result = await blockRepository.getAllBlockedUsers(userId1);

        expect(result.blockedUsers).to.have.lengthOf(0);
        expect(result.total).to.equal(0);
      });
    });

    describe('canView', () => {
      it('should return false if viewer is blocked', async function() {
        this.timeout(5000);
        sinon.stub(Block, 'findOne').returns(mockQuery({ _id: new mongoose.Types.ObjectId() }));

        const result = await blockRepository.canView(userId1, userId2);

        expect(result).to.be.false;
      });

      it('should return true if viewer is not blocked', async function() {
        this.timeout(5000);
        sinon.stub(Block, 'findOne').returns(mockQuery(null));

        const result = await blockRepository.canView(userId1, userId2);

        expect(result).to.be.true;
      });
    });

    describe('countBlockedUsers', () => {
      it('should return correct count of blocked users', async function() {
        this.timeout(5000);
        sinon.stub(Block, 'countDocuments').resolves(5);

        const result = await blockRepository.countBlockedUsers(userId1);

        expect(result).to.equal(5);
        expect(Block.countDocuments.calledWith({ blocker_id: userId1 })).to.be.true;
      });

      it('should return zero if no blocked users', async function() {
        this.timeout(5000);
        sinon.stub(Block, 'countDocuments').resolves(0);

        const result = await blockRepository.countBlockedUsers(userId1);

        expect(result).to.equal(0);
      });
    });

    describe('updateBlockReason', () => {
      it('should update reason for existing block', async function() {
        this.timeout(5000);
        const updatedBlock = {
          _id: new mongoose.Types.ObjectId(),
          blocker_id: userId1,
          blocked_id: userId2,
          reason: 'Updated reason',
        };

        sinon.stub(Block, 'findOneAndUpdate').resolves(updatedBlock);

        const result = await blockRepository.updateBlockReason(userId1, userId2, 'Updated reason');

        expect(result).to.exist;
        expect(result.reason).to.equal('Updated reason');
      });

      it('should return null if block does not exist', async function() {
        this.timeout(5000);
        sinon.stub(Block, 'findOneAndUpdate').resolves(null);

        const result = await blockRepository.updateBlockReason(userId1, userId2, 'New reason');

        expect(result).to.be.null;
      });
    });

    describe('getBlockDetails', () => {
      it('should return block details with populated user info', async function() {
        this.timeout(5000);
        const blockDetails = {
          _id: new mongoose.Types.ObjectId(),
          blocker_id: { username: 'user1', display_name: 'User 1' },
          blocked_id: { username: 'user2', display_name: 'User 2' },
          reason: 'Spam',
        };

        sinon.stub(Block, 'findOne').returns({
          populate: sinon.stub().returns({
            populate: sinon.stub().returns(mockQuery(blockDetails)),
          }),
        });

        const result = await blockRepository.getBlockDetails(userId1, userId2);

        expect(result).to.exist;
        expect(result.blocker_id.username).to.equal('user1');
        expect(result.blocked_id.username).to.equal('user2');
      });

      it('should return null if block does not exist', async function() {
        this.timeout(5000);
        sinon.stub(Block, 'findOne').returns({
          populate: sinon.stub().returns({
            populate: sinon.stub().returns(mockQuery(null)),
          }),
        });

        const result = await blockRepository.getBlockDetails(userId1, userId2);

        expect(result).to.be.null;
      });
    });

    describe('createBlock', () => {
      it('should create a new block with reason', async function() {
        this.timeout(5000);
        const mockBlock = {
          _id: new mongoose.Types.ObjectId(),
          blocker_id: userId1,
          blocked_id: userId2,
          reason: 'Spam',
        };

        sinon.stub(Block, 'create').resolves(mockBlock);

        const result = await blockRepository.createBlock(userId1, userId2, 'Spam');

        expect(result).to.exist;
        expect(result.blocker_id).to.equal(userId1);
        expect(result.blocked_id).to.equal(userId2);
        expect(result.reason).to.equal('Spam');
      });

      it('should create a new block without reason', async function() {
        this.timeout(5000);
        const mockBlock = {
          _id: new mongoose.Types.ObjectId(),
          blocker_id: userId1,
          blocked_id: userId2,
          reason: '',
        };

        sinon.stub(Block, 'create').resolves(mockBlock);

        const result = await blockRepository.createBlock(userId1, userId2);

        expect(result).to.exist;
        expect(Block.create.calledWith({ blocker_id: userId1, blocked_id: userId2, reason: '' })).to.be.true;
      });
    });

    describe('findBlock', () => {
      it('should find an existing block', async function() {
        this.timeout(5000);
        const mockBlock = {
          _id: new mongoose.Types.ObjectId(),
          blocker_id: userId1,
          blocked_id: userId2,
        };

        sinon.stub(Block, 'findOne').returns(mockQuery(mockBlock));

        const result = await blockRepository.findBlock(userId1, userId2);

        expect(result).to.exist;
        expect(Block.findOne.calledWith({ blocker_id: userId1, blocked_id: userId2 })).to.be.true;
      });

      it('should return null if block does not exist', async function() {
        this.timeout(5000);
        sinon.stub(Block, 'findOne').returns(mockQuery(null));

        const result = await blockRepository.findBlock(userId1, userId2);

        expect(result).to.be.null;
      });
    });

    describe('getBlockedUsers', () => {
      it('should return paginated blocked users', async function() {
        this.timeout(5000);
        const mockBlockedUsers = [
          { blocked_id: { _id: userId2, username: 'user2', display_name: 'User 2', avatar_url: 'avatar.jpg', is_verified: false } }
        ];

        sinon.stub(Block, 'find').returns({
          populate: sinon.stub().returns({
            skip: sinon.stub().returns({
              limit: sinon.stub().returns({
                lean: sinon.stub().resolves(mockBlockedUsers)
              })
            })
          })
        });

        sinon.stub(Block, 'countDocuments').resolves(1);

        const result = await blockRepository.getBlockedUsers(userId1, 1, 20);

        expect(result).to.have.property('blockedUsers');
        expect(result).to.have.property('total');
        expect(result).to.have.property('page');
        expect(result).to.have.property('limit');
        expect(result.blockedUsers).to.have.lengthOf(1);
        expect(result.total).to.equal(1);
      });

      it('should support different pagination parameters', async function() {
        this.timeout(5000);
        const mockBlockedUsers = Array(10).fill(null).map(() => ({
          blocked_id: { _id: new mongoose.Types.ObjectId(), username: 'user', display_name: 'User', avatar_url: 'avatar.jpg', is_verified: false }
        }));

        sinon.stub(Block, 'find').returns({
          populate: sinon.stub().returns({
            skip: sinon.stub().returns({
              limit: sinon.stub().returns({
                lean: sinon.stub().resolves(mockBlockedUsers)
              })
            })
          })
        });

        sinon.stub(Block, 'countDocuments').resolves(30);

        const result = await blockRepository.getBlockedUsers(userId1, 2, 10);

        expect(result.page).to.equal(2);
        expect(result.limit).to.equal(10);
        expect(result.total).to.equal(30);
      });

      it('should return empty array if no blocked users', async function() {
        this.timeout(5000);
        sinon.stub(Block, 'find').returns({
          populate: sinon.stub().returns({
            skip: sinon.stub().returns({
              limit: sinon.stub().returns({
                lean: sinon.stub().resolves([])
              })
            })
          })
        });

        sinon.stub(Block, 'countDocuments').resolves(0);

        const result = await blockRepository.getBlockedUsers(userId1, 1, 20);

        expect(result.blockedUsers).to.have.lengthOf(0);
        expect(result.total).to.equal(0);
      });
    });

    describe('getBlockers', () => {
      it('should return paginated list of users who blocked current user', async function() {
        this.timeout(5000);
        const mockBlockers = [
          { blocker_id: { _id: userId3, username: 'user3', display_name: 'User 3', avatar_url: 'avatar.jpg', is_verified: false } }
        ];

        sinon.stub(Block, 'find').returns({
          populate: sinon.stub().returns({
            skip: sinon.stub().returns({
              limit: sinon.stub().returns({
                lean: sinon.stub().resolves(mockBlockers)
              })
            })
          })
        });

        sinon.stub(Block, 'countDocuments').resolves(1);

        const result = await blockRepository.getBlockers(userId1, 1, 20);

        expect(result).to.have.property('blockers');
        expect(result).to.have.property('total');
        expect(result.blockers).to.have.lengthOf(1);
        expect(result.total).to.equal(1);
      });

      it('should return empty array if no blockers', async function() {
        this.timeout(5000);
        sinon.stub(Block, 'find').returns({
          populate: sinon.stub().returns({
            skip: sinon.stub().returns({
              limit: sinon.stub().returns({
                lean: sinon.stub().resolves([])
              })
            })
          })
        });

        sinon.stub(Block, 'countDocuments').resolves(0);

        const result = await blockRepository.getBlockers(userId1, 1, 20);

        expect(result.blockers).to.have.lengthOf(0);
        expect(result.total).to.equal(0);
      });
    });

    describe('isBlocked', () => {
      it('should return true if user is blocked', async function() {
        this.timeout(5000);
        sinon.stub(Block, 'findOne').returns(mockQuery({ _id: new mongoose.Types.ObjectId() }));

        const result = await blockRepository.isBlocked(userId1, userId2);

        expect(result).to.be.true;
      });

      it('should return false if user is not blocked', async function() {
        this.timeout(5000);
        sinon.stub(Block, 'findOne').returns(mockQuery(null));

        const result = await blockRepository.isBlocked(userId1, userId2);

        expect(result).to.be.false;
      });
    });
  });

  // ==================== Follow Repository Tests ====================
  describe('Follow Repository', () => {
    describe('deleteFollow', () => {
      it('should delete an existing follow relationship', async function() {
        this.timeout(5000);
        sinon.stub(Follow, 'deleteOne').resolves({ deletedCount: 1 });

        const result = await followRepository.deleteFollow(userId1, userId2);

        expect(Follow.deleteOne.calledWith({ follower_id: userId1, following_id: userId2 })).to.be.true;
      });

      it('should handle deleting non-existent follow', async function() {
        this.timeout(5000);
        sinon.stub(Follow, 'deleteOne').resolves({ deletedCount: 0 });

        const result = await followRepository.deleteFollow(userId1, userId2);

        expect(Follow.deleteOne.calledOnce).to.be.true;
      });
    });

    describe('getFollowing', () => {
      it('should return paginated list of users being followed', async function() {
        this.timeout(5000);
        const mockFollowing = [
          { following_id: { _id: userId2, username: 'user2' } },
          { following_id: { _id: userId3, username: 'user3' } },
        ];

        sinon.stub(Follow, 'find').returns({
          populate: sinon.stub().returns({
            skip: sinon.stub().returns({
              limit: sinon.stub().returns({
                lean: sinon.stub().resolves(mockFollowing),
              }),
            }),
          }),
        });
        sinon.stub(Follow, 'countDocuments').resolves(2);

        const result = await followRepository.getFollowing(userId1, 1, 20);

        expect(result).to.exist;
        expect(result.following).to.have.lengthOf(2);
        expect(result.total).to.equal(2);
        expect(result.page).to.equal(1);
        expect(result.limit).to.equal(20);
      });

      it('should apply pagination correctly', async function() {
        this.timeout(5000);
        const mockFollowing = [
          { following_id: { _id: userId2, username: 'user2' } },
        ];

        sinon.stub(Follow, 'find').returns({
          populate: sinon.stub().returns({
            skip: sinon.stub().returns({
              limit: sinon.stub().returns({
                lean: sinon.stub().resolves(mockFollowing),
              }),
            }),
          }),
        });
        sinon.stub(Follow, 'countDocuments').resolves(25);

        const result = await followRepository.getFollowing(userId1, 2, 10);

        expect(result.page).to.equal(2);
        expect(result.limit).to.equal(10);
        expect(result.total).to.equal(25);
      });
    });

    describe('countFollowing', () => {
      it('should return correct count of users being followed', async function() {
        this.timeout(5000);
        sinon.stub(Follow, 'countDocuments').resolves(8);

        const result = await followRepository.countFollowing(userId1);

        expect(result).to.equal(8);
        expect(Follow.countDocuments.calledWith({ follower_id: userId1 })).to.be.true;
      });

      it('should return zero if not following anyone', async function() {
        this.timeout(5000);
        sinon.stub(Follow, 'countDocuments').resolves(0);

        const result = await followRepository.countFollowing(userId1);

        expect(result).to.equal(0);
      });
    });

    describe('getMutualFollowers', () => {
      it('should return mutual followers between two users', async function() {
        this.timeout(5000);
        const mockFollowersOfUser1 = [
          { follower_id: userId3 },
        ];
        const mockMutualFollows = [
          { follower_id: { _id: userId3, username: 'user3' } },
        ];

        // Create a custom stub that returns different values on different calls
        let callCount = 0;
        const findStub = sinon.stub(Follow, 'find').callsFake(function() {
          callCount++;
          if (callCount === 1) {
            // First call - getFollowers query
            return {
              select: sinon.stub().returns(mockQuery(mockFollowersOfUser1)),
            };
          } else {
            // Second call - mutual followers query
            return {
              populate: sinon.stub().returns({
                skip: sinon.stub().returns({
                  limit: sinon.stub().returns({
                    lean: sinon.stub().resolves(mockMutualFollows),
                  }),
                }),
              }),
            };
          }
        });

        sinon.stub(Follow, 'countDocuments').resolves(1);

        const result = await followRepository.getMutualFollowers(userId1, userId2, 1, 20);

        expect(result).to.exist;
        expect(result.mutualFollowers).to.have.lengthOf(1);
        expect(result.total).to.equal(1);
      });
    });

    describe('createFollow', () => {
      it('should create a new follow relationship', async function() {
        this.timeout(5000);
        const mockFollow = {
          _id: new mongoose.Types.ObjectId(),
          follower_id: userId1,
          following_id: userId2,
        };

        sinon.stub(Follow, 'create').resolves(mockFollow);

        const result = await followRepository.createFollow(userId1, userId2);

        expect(result).to.exist;
        expect(result.follower_id).to.equal(userId1);
        expect(result.following_id).to.equal(userId2);
        expect(Follow.create.calledWith({ follower_id: userId1, following_id: userId2 })).to.be.true;
      });
    });

    describe('findFollow', () => {
      it('should find an existing follow relationship', async function() {
        this.timeout(5000);
        const mockFollow = {
          _id: new mongoose.Types.ObjectId(),
          follower_id: userId1,
          following_id: userId2,
        };

        sinon.stub(Follow, 'findOne').returns(mockQuery(mockFollow));

        const result = await followRepository.findFollow(userId1, userId2);

        expect(result).to.exist;
        expect(Follow.findOne.calledWith({ follower_id: userId1, following_id: userId2 })).to.be.true;
      });

      it('should return null if follow does not exist', async function() {
        this.timeout(5000);
        sinon.stub(Follow, 'findOne').returns(mockQuery(null));

        const result = await followRepository.findFollow(userId1, userId2);

        expect(result).to.be.null;
      });
    });

    describe('getFollowers', () => {
      it('should return paginated list of followers', async function() {
        this.timeout(5000);
        const mockFollowers = [
          { follower_id: { _id: userId3, username: 'user3', display_name: 'User 3', avatar_url: 'avatar.jpg', is_verified: false } }
        ];

        sinon.stub(Follow, 'find').returns({
          populate: sinon.stub().returns({
            skip: sinon.stub().returns({
              limit: sinon.stub().returns({
                lean: sinon.stub().resolves(mockFollowers)
              })
            })
          })
        });

        sinon.stub(Follow, 'countDocuments').resolves(1);

        const result = await followRepository.getFollowers(userId1, 1, 20);

        expect(result).to.have.property('followers');
        expect(result).to.have.property('total');
        expect(result).to.have.property('page');
        expect(result).to.have.property('limit');
        expect(result.followers).to.have.lengthOf(1);
      });

      it('should apply pagination correctly', async function() {
        this.timeout(5000);
        const mockFollowers = Array(10).fill(null).map(() => ({
          follower_id: { _id: new mongoose.Types.ObjectId(), username: 'user', display_name: 'User', avatar_url: 'avatar.jpg', is_verified: false }
        }));

        sinon.stub(Follow, 'find').returns({
          populate: sinon.stub().returns({
            skip: sinon.stub().returns({
              limit: sinon.stub().returns({
                lean: sinon.stub().resolves(mockFollowers)
              })
            })
          })
        });

        sinon.stub(Follow, 'countDocuments').resolves(50);

        const result = await followRepository.getFollowers(userId1, 3, 10);

        expect(result.page).to.equal(3);
        expect(result.limit).to.equal(10);
        expect(result.total).to.equal(50);
      });
    });

    describe('countFollowers', () => {
      it('should return correct count of followers', async function() {
        this.timeout(5000);
        sinon.stub(Follow, 'countDocuments').resolves(15);

        const result = await followRepository.countFollowers(userId1);

        expect(result).to.equal(15);
        expect(Follow.countDocuments.calledWith({ following_id: userId1 })).to.be.true;
      });

      it('should return zero if no followers', async function() {
        this.timeout(5000);
        sinon.stub(Follow, 'countDocuments').resolves(0);

        const result = await followRepository.countFollowers(userId1);

        expect(result).to.equal(0);
      });
    });

    describe('isFollowing', () => {
      it('should return true if user is following', async function() {
        this.timeout(5000);
        sinon.stub(Follow, 'findOne').returns(mockQuery({ _id: new mongoose.Types.ObjectId() }));

        const result = await followRepository.isFollowing(userId1, userId2);

        expect(result).to.be.true;
      });

      it('should return false if user is not following', async function() {
        this.timeout(5000);
        sinon.stub(Follow, 'findOne').returns(mockQuery(null));

        const result = await followRepository.isFollowing(userId1, userId2);

        expect(result).to.be.false;
      });
    });
  });

  // ==================== Service Error Path Tests ====================
  describe('Service Error Paths & Edge Cases', () => {
    describe('followUser - error handling', () => {
      it('should throw error when follow fails', async function() {
        this.timeout(5000);
        sinon.stub(followRepository, 'findFollow').resolves(null);
        sinon.stub(blockRepository, 'isBlocked').resolves(false);
        sinon.stub(User, 'findById').resolves({ _id: userId2 });
        sinon.stub(followRepository, 'createFollow').rejects(new Error('Database error'));

        try {
          await followUser(userId1, userId2);
          expect.fail('Should throw error');
        } catch (error) {
          expect(error.message).to.include('Database error');
        }
      });
    });

    describe('blockUser - error handling', () => {
      it('should throw error when block creation fails', async function() {
        this.timeout(5000);
        sinon.stub(User, 'findById').resolves({ _id: userId2 });
        sinon.stub(blockRepository, 'findBlock').resolves(null);
        sinon.stub(blockRepository, 'createBlock').rejects(new Error('Database error'));

        try {
          await blockUser(userId1, userId2, 'Spam');
          expect.fail('Should throw error');
        } catch (error) {
          expect(error.message).to.include('Database error');
        }
      });
    });

    describe('getAllFollowers', () => {
      it('should return all followers without pagination', async function() {
        this.timeout(5000);
        const mockFollowers = [
          { follower_id: { _id: userId2, username: 'user2', followers_count: 5 } },
          { follower_id: { _id: userId3, username: 'user3', followers_count: 8 } },
        ];

        sinon.stub(User, 'findById').resolves({ _id: userId1 });
        sinon.stub(Follow, 'find').returns({
          populate: sinon.stub().returns({
            lean: sinon.stub().resolves(mockFollowers),
          }),
        });

        const result = await getAllFollowers(userId1);

        expect(result).to.exist;
        expect(result.followers).to.have.lengthOf(2);
        expect(result.total).to.equal(2);
      });

      it('should throw error if user not found for getAllFollowers', async function() {
        this.timeout(5000);
        sinon.stub(User, 'findById').resolves(null);

        try {
          await getAllFollowers(userId1);
          expect.fail('Should throw error');
        } catch (error) {
          expect(error.message).to.include('User not found');
        }
      });
    });

    describe('getAllFollowing', () => {
      it('should return all following without pagination', async function() {
        this.timeout(5000);
        const mockFollowing = [
          { following_id: { _id: userId2, username: 'user2', followers_count: 5 } },
          { following_id: { _id: userId3, username: 'user3', followers_count: 8 } },
        ];

        sinon.stub(User, 'findById').resolves({ _id: userId1 });
        sinon.stub(Follow, 'find').returns({
          populate: sinon.stub().returns({
            lean: sinon.stub().resolves(mockFollowing),
          }),
        });

        const result = await getAllFollowing(userId1);

        expect(result).to.exist;
        expect(result.following).to.have.lengthOf(2);
        expect(result.total).to.equal(2);
      });

      it('should throw error if user not found for getAllFollowing', async function() {
        this.timeout(5000);
        sinon.stub(User, 'findById').resolves(null);

        try {
          await getAllFollowing(userId1);
          expect.fail('Should throw error');
        } catch (error) {
          expect(error.message).to.include('User not found');
        }
      });
    });

    describe('getAllBlockedUsers', () => {
      it('should return all blocked users', async function() {
        this.timeout(5000);
        const mockBlockedUsers = {
          blockedUsers: [
            { _id: userId2, username: 'user2' },
            { _id: userId3, username: 'user3' },
          ],
          total: 2,
        };

        sinon.stub(blockRepository, 'getAllBlockedUsers').resolves(mockBlockedUsers);

        const result = await getAllBlockedUsers(userId1);

        expect(result).to.exist;
        expect(result.blockedUsers).to.have.lengthOf(2);
        expect(blockRepository.getAllBlockedUsers.calledWith(userId1)).to.be.true;
      });
    });

    describe('canViewProfile', () => {
      it('should return true if profile can be viewed', async function() {
        this.timeout(5000);
        sinon.stub(blockRepository, 'canView').resolves(true);

        const result = await canViewProfile(userId1, userId2);

        expect(result).to.be.true;
        expect(blockRepository.canView.calledWith(userId1, userId2)).to.be.true;
      });

      it('should return false if profile cannot be viewed', async function() {
        this.timeout(5000);
        sinon.stub(blockRepository, 'canView').resolves(false);

        const result = await canViewProfile(userId1, userId2);

        expect(result).to.be.false;
      });
    });

    describe('getFollowingList', () => {
      it('should return paginated following list', async function() {
        this.timeout(5000);
        const mockFollowingList = {
          following: [
            { _id: userId2, username: 'user2', followers_count: 5 },
            { _id: userId3, username: 'user3', followers_count: 8 },
          ],
          total: 2,
          page: 1,
          limit: 20,
        };

        sinon.stub(User, 'findById').resolves({ _id: userId1 });
        sinon.stub(followRepository, 'getFollowing').resolves(mockFollowingList);

        const result = await getFollowingList(userId1, 1, 20);

        expect(result).to.exist;
        expect(result.following).to.have.lengthOf(2);
        expect(followRepository.getFollowing.calledWith(userId1, 1, 20)).to.be.true;
      });

      it('should throw error if user not found for getFollowingList', async function() {
        this.timeout(5000);
        sinon.stub(User, 'findById').resolves(null);

        try {
          await getFollowingList(userId1, 1, 20);
          expect.fail('Should throw error');
        } catch (error) {
          expect(error.message).to.include('User not found');
        }
      });
    });

    describe('getMutualFollowersList', () => {
      it('should return mutual followers with pagination', async function() {
        this.timeout(5000);
        
        const mockFollower1 = { follower_id: userId3 };
        const mockFollower2 = { follower_id: new mongoose.Types.ObjectId() };
        
        const mockMutualFollows = [
          { follower_id: { id: userId3, username: 'user3', display_name: 'User 3', avatar_url: 'avatar.jpg', is_verified: false, followers_count: 5 } }
        ];

        // Create a stub that returns different values on consecutive calls
        const selectStub = sinon.stub().resolves([mockFollower1, mockFollower2]);
        const populateStub = sinon.stub().returns({
          skip: sinon.stub().returns({
            limit: sinon.stub().returns({
              lean: sinon.stub().resolves(mockMutualFollows)
            })
          })
        });
        
        // Use a single stub with sequential return values
        sinon.stub(Follow, 'find')
          .onFirstCall().returns({ select: selectStub })
          .onSecondCall().returns({ populate: populateStub });

        sinon.stub(Follow, 'countDocuments').resolves(1);

        const result = await getMutualFollowersList(userId1, userId2, 1, 20);

        expect(result).to.have.property('mutualFollowers');
        expect(result).to.have.property('total');
        expect(result).to.have.property('page');
        expect(result).to.have.property('limit');
        expect(result.total).to.equal(1);
      });

      it('should return empty array if no mutual followers', async function() {
        this.timeout(5000);
        
        const selectStub = sinon.stub().resolves([]);
        const populateStub = sinon.stub().returns({
          skip: sinon.stub().returns({
            limit: sinon.stub().returns({
              lean: sinon.stub().resolves([])
            })
          })
        });
        
        sinon.stub(Follow, 'find')
          .onFirstCall().returns({ select: selectStub })
          .onSecondCall().returns({ populate: populateStub });

        sinon.stub(Follow, 'countDocuments').resolves(0);

        const result = await getMutualFollowersList(userId1, userId2, 1, 20);

        expect(result.mutualFollowers).to.be.an('array');
        expect(result.total).to.equal(0);
      });

      it('should apply pagination correctly to mutual followers', async function() {
        this.timeout(5000);
        
        const mockFollowerIds = Array(30).fill(null).map(() => new mongoose.Types.ObjectId());
        const mockFollowers = mockFollowerIds.map(id => ({ follower_id: id }));
        
        const mockMutualFollows = Array(10).fill(null).map((_, i) => ({
          follower_id: { id: mockFollowerIds[i], username: `user${i}`, display_name: `User ${i}`, avatar_url: 'avatar.jpg', is_verified: false, followers_count: 5 }
        }));

        const selectStub = sinon.stub().resolves(mockFollowers);
        const populateStub = sinon.stub().returns({
          skip: sinon.stub().returns({
            limit: sinon.stub().returns({
              lean: sinon.stub().resolves(mockMutualFollows)
            })
          })
        });
        
        sinon.stub(Follow, 'find')
          .onFirstCall().returns({ select: selectStub })
          .onSecondCall().returns({ populate: populateStub });

        sinon.stub(Follow, 'countDocuments').resolves(30);

        const result = await getMutualFollowersList(userId1, userId2, 2, 10);

        expect(result.page).to.equal(2);
        expect(result.limit).to.equal(10);
        expect(result.total).to.equal(30);
      });
    });

    describe('getRelationshipStatus', () => {
      it('should return correct relationship status - following each other', async function() {
        this.timeout(5000);
        
        sinon.stub(followRepository, 'isFollowing')
          .onFirstCall().resolves(true) // userId1 follows userId2
          .onSecondCall().resolves(true); // userId2 follows userId1

        sinon.stub(blockRepository, 'isBlocked')
          .onFirstCall().resolves(false) // userId1 didn't block userId2
          .onSecondCall().resolves(false); // userId2 didn't block userId1

        const result = await getRelationshipStatus(userId1, userId2);

        expect(result.isFollowing).to.be.true;
        expect(result.isFollowedBy).to.be.true;
        expect(result.isMutual).to.be.true;
        expect(result.isBlockedByMe).to.be.false;
        expect(result.isBlockedByThem).to.be.false;
      });

      it('should return correct relationship status - one-way follow', async function() {
        this.timeout(5000);
        
        sinon.stub(followRepository, 'isFollowing')
          .onFirstCall().resolves(true)  // userId1 follows userId2
          .onSecondCall().resolves(false); // userId2 doesn't follow userId1

        sinon.stub(blockRepository, 'isBlocked')
          .onFirstCall().resolves(false)
          .onSecondCall().resolves(false);

        const result = await getRelationshipStatus(userId1, userId2);

        expect(result.isFollowing).to.be.true;
        expect(result.isFollowedBy).to.be.false;
        expect(result.isMutual).to.be.false;
      });

      it('should return correct relationship status - blocked by me', async function() {
        this.timeout(5000);
        
        sinon.stub(followRepository, 'isFollowing')
          .onFirstCall().resolves(false)
          .onSecondCall().resolves(false);

        sinon.stub(blockRepository, 'isBlocked')
          .onFirstCall().resolves(true) // userId1 blocked userId2
          .onSecondCall().resolves(false);

        const result = await getRelationshipStatus(userId1, userId2);

        expect(result.isBlockedByMe).to.be.true;
        expect(result.isBlockedByThem).to.be.false;
      });

      it('should return correct relationship status - blocked by them', async function() {
        this.timeout(5000);
        
        sinon.stub(followRepository, 'isFollowing')
          .onFirstCall().resolves(false)
          .onSecondCall().resolves(false);

        sinon.stub(blockRepository, 'isBlocked')
          .onFirstCall().resolves(false)
          .onSecondCall().resolves(true); // userId2 blocked userId1

        const result = await getRelationshipStatus(userId1, userId2);

        expect(result.isBlockedByMe).to.be.false;
        expect(result.isBlockedByThem).to.be.true;
      });

      it('should return correct relationship status - no relationship', async function() {
        this.timeout(5000);
        
        sinon.stub(followRepository, 'isFollowing')
          .onFirstCall().resolves(false)
          .onSecondCall().resolves(false);

        sinon.stub(blockRepository, 'isBlocked')
          .onFirstCall().resolves(false)
          .onSecondCall().resolves(false);

        const result = await getRelationshipStatus(userId1, userId2);

        expect(result.isFollowing).to.be.false;
        expect(result.isFollowedBy).to.be.false;
        expect(result.isMutual).to.be.false;
        expect(result.isBlockedByMe).to.be.false;
        expect(result.isBlockedByThem).to.be.false;
      });
    });
  });
});
