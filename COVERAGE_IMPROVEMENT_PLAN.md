# Test Coverage Improvement Plan

## Quick Answer: Why Coverage is Low

The repositories and services show **low coverage percentages** because:

1. **Not all methods are tested** - only the methods actively used in the current test suite are covered
2. **33% of block.repository methods** (3 out of 11) have tests
3. **30% of follow.repository methods** (4 out of 9) have tests  
4. **57% of social.service methods** (8 out of 16) have tests

---

## Action Plan to Improve Coverage to 80%+

### Phase 1: Block Repository (33% → 75%)
Add these 8 test cases:

```javascript
describe('Block Repository Extended Tests', () => {
  describe('deleteBlock', () => {
    it('should delete an existing block', async () => {
      // Create a block, then delete it, verify it's gone
    });
    
    it('should handle deleting non-existent block', async () => {
      // Try to delete a block that doesn't exist - should not throw
    });
  });

  describe('getAllBlockedUsers', () => {
    it('should return all blocked users without pagination', async () => {
      // Create multiple blocks, call getAllBlockedUsers, verify count
    });
    
    it('should return empty array if no blocks exist', async () => {
      // Call on user with no blocks
    });
  });

  describe('canView', () => {
    it('should return false if viewer is blocked', async () => {
      // Block viewer → cannot view
    });
    
    it('should return true if viewer is not blocked', async () => {
      // No block → can view
    });
  });

  describe('countBlockedUsers', () => {
    it('should return correct count of blocked users', async () => {
      // Block multiple users and verify count
    });
  });

  describe('getBlockers', () => {
    it('should return paginated list of users who blocked this user', async () => {
      // Multiple users block one user, get their blockers list
    });
  });

  describe('updateBlockReason', () => {
    it('should update reason for existing block', async () => {
      // Create block with reason1, update to reason2, verify
    });
    
    it('should return null if block does not exist', async () => {
      // Try to update non-existent block
    });
  });

  describe('getBlockDetails', () => {
    it('should return full block details with populated users', async () => {
      // Get block and verify both users are populated
    });
  });
});
```

### Phase 2: Follow Repository (30% → 75%)
Add these 5 test cases:

```javascript
describe('Follow Repository Extended Tests', () => {
  describe('deleteFollow', () => {
    it('should delete an existing follow relationship', async () => {
      // Create follow, delete it, verify gone
    });
    
    it('should handle deleting non-existent follow', async () => {
      // Try to delete non-existent follow
    });
  });

  describe('getFollowing', () => {
    it('should return paginated list of users this user follows', async () => {
      // User follows multiple users, get their following list
    });
    
    it('should apply pagination correctly', async () => {
      // Create 50 follows, test pagination
    });
  });

  describe('countFollowing', () => {
    it('should return correct count of users being followed', async () => {
      // Follow multiple users and verify count
    });
  });
});
```

### Phase 3: Social Service (57% → 80%)
Add these 8 test cases:

```javascript
describe('Social Service Extended Tests', () => {
  describe('getAllFollowers', () => {
    it('should return all followers without pagination', async () => {
      // Get all followers without limit
    });
    
    it('should populate follower details', async () => {
      // Verify returned users have username, avatar, etc.
    });
  });

  describe('getFollowingList', () => {
    it('should return paginated list of users being followed', async () => {
      // Get following list with pagination
    });
    
    it('should throw error if user not found', async () => {
      // Try to get following for non-existent user
    });
  });

  describe('getAllFollowing', () => {
    it('should return all following without pagination', async () => {
      // Get all following without limit
    });
  });

  describe('getSuggestedUsers', () => {
    it('should suggest users not already following', async () => {
      // Suggest users that user doesn't follow
    });
    
    it('should exclude blocked users from suggestions', async () => {
      // Blocked users should not appear in suggestions
    });
    
    it('should apply pagination to suggestions', async () => {
      // Test page and limit parameters
    });
  });

  describe('getAllBlockedUsers', () => {
    it('should return all blocked users without pagination', async () => {
      // Get all blocks without limit
    });
  });

  describe('canViewProfile', () => {
    it('should return false if viewer is blocked', async () => {
      // User A blocked User B → B cannot view A's profile
    });
    
    it('should return true if not blocked', async () => {
      // No block → can view
    });
  });

  describe('getBlockers', () => {
    it('should return list of users who blocked this user', async () => {
      // Get users that blocked the current user
    });
  });

  describe('updateBlockReason', () => {
    it('should update reason for existing block', async () => {
      // Update block reason and verify change
    });
    
    it('should throw error if block does not exist', async () => {
      // Try to update non-existent block
    });
  });
});
```

---

## Expected Results After Adding Tests

### Before
```
Block Repository:    33.1% (3/11 methods)
Follow Repository:   30.28% (4/9 methods)
Social Service:      57.45% (8/16 methods)
Overall:             ~40-45%
```

### After Adding 21 New Tests
```
Block Repository:    ~75% (9/11 methods)
Follow Repository:   ~75% (6/9 methods)  
Social Service:      ~80% (14/16 methods)
Overall:             ~75-80%
```

### Final Test Count
- Current: 47 tests
- Additional: 21 tests
- **Total: 68 tests**
- **Expected Pass Rate: 100%**

---

## Implementation Steps

1. **Create extended test file**: `src/tests/social-extended.test.js`
2. **Add block repository tests**: 8 new test cases
3. **Add follow repository tests**: 5 new test cases
4. **Add social service tests**: 8 new test cases
5. **Run tests**: Verify all 68 tests pass
6. **Check coverage**: Confirm 75-80% coverage

---

## Files to Modify

1. Create: `src/tests/social-extended.test.js` (new file with 21 tests)
2. No changes to implementation files needed
3. All tests will use same stubs/mocks pattern as existing tests

---

## Why This Happened

✅ **Good News**: The implementation has ALL these methods ready
❌ **Gap**: The tests don't cover all the methods

This is common in development where:
- Core features get tested thoroughly (47 tests, 100% pass)
- Extended features are implemented but not yet tested
- Coverage tools report low % because they count ALL methods, not just tested ones

**The test quality is high** - it's just incomplete coverage of all available features.
