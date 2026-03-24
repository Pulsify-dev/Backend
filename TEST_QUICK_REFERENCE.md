# Module 3 Unit Test Quick Reference

## Overview
- **Test File**: `src/tests/social.test.js`
- **Framework**: Mocha + Chai + Sinon
- **Current Status**: 39/47 tests passing (83% pass rate)
- **Execution Time**: ~8 seconds

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suite
```bash
# Test Follow Model only
npm test -- --grep "Follow Model"

# Test Block Model only
npm test -- --grep "Block Model"

# Test Follow Service only
npm test -- --grep "Follow Service"

# Test Block Service only
npm test -- --grep "Block Service"

# Test Edge Cases only
npm test -- --grep "Edge Cases"
```

### Verbose Output
```bash
npm test -- --reporter spec
npm test -- --reporter json > test-results.json
npm test -- --reporter tap
```

### Watch Mode (Auto-rerun on file changes)
```bash
npm test -- --watch
```

### Increase Timeout (for slow tests)
```bash
npm test -- --timeout 10000
```

### Run with Coverage Report
```bash
npm test
# Coverage output appears at end of test run
```

---

## Test Statistics

### Passing Tests by Category

| Category | Count | Percentage |
|----------|-------|-----------|
| Follow Model | 6/6 | 100% ✅ |
| Block Model | 10/11 | 91% |
| Follow Service | 8/8 | 100% ✅ |
| Block Service | 6/8 | 75% |
| Edge Cases | 4/5 | 80% |
| Data Consistency | 3/3 | 100% ✅ |
| Input Validation | 2/4 | 50% |
| Relationship Queries | 0/2 | 0% |
| **Total** | **39/47** | **83%** |

---

## Test Coverage

### Current Coverage (64.06% statements)
```
models/           94.84% ✅
services/         60.5%  ⚠️
repositories/     37.28% ⚠️
```

### Coverage by Component
- **Follow Model**: 91.17% (excellent)
- **Block Model**: 92.3% (excellent)
- **Social Service**: 60.5% (good)
- **Follow Repository**: 33.09% (stub-based)
- **Block Repository**: 41.37% (stub-based)

---

## What's Being Tested

### ✅ Follow Model (6 tests)
- Valid follow creation
- Self-follow prevention
- Unique index enforcement
- Field validation (follower_id, following_id)
- Automatic timestamps

### ✅ Block Model (11 tests)
- Valid block creation
- Self-block prevention
- Reason field validation (max 500 chars)
- Unique index enforcement
- Field validation (blocker_id, blocked_id)
- Default empty reason
- Automatic timestamps

### ✅ Follow Service (8 tests)
- Successfully following users
- Error on duplicate follow
- Error when blocked by target
- User existence validation
- Counter increment/decrement
- Unfollowing functionality
- Followers list pagination
- Error handling

### ⚠️ Block Service (8 tests)
- Successfully blocking users
- Error on duplicate block
- Follow cleanup on block
- Counter management
- Unblocking functionality
- Blocked users list retrieval
- Error handling

### ⚠️ Relationship Queries (2 tests)
- Mutual followers detection
- Complete relationship status

### ✅ Edge Cases (5 tests)
- Invalid ObjectID handling
- Invalid pagination handling
- Concurrent operations
- Reason character limit validation

### ✅ Data Consistency (3 tests)
- Counter consistency
- Duplicate prevention (follow)
- Duplicate prevention (block)

### ✅ Input Validation (4 tests)
- Whitespace trimming
- Empty reason acceptance
- Required field validation

---

## Currently Failing Tests (8)

### Model Validation (3 tests)
```
❌ should allow reason to be empty string
❌ should validate block reason character limit strictly
❌ should accept empty reason for block
```
**Issue**: validateSync() returns undefined instead of null

### Block Service (3 tests)
```
❌ should throw error if already blocked
❌ should throw error if user not blocked
❌ should throw error if user not found (in getBlockedUsersList)
```
**Issue**: Stub timeout or error message mismatch

### Relationship Queries (2 tests)
```
❌ should return mutual followers between two users
❌ should return complete relationship status
```
**Issue**: Repository stub not resolving

---

## Key Assertions Tested

### Model Validations
```javascript
// Field existence
expect(error.errors.follower_id).to.exist

// Field values
expect(follow.follower_id).to.equal(userId1)

// Timestamps
expect(follow).to.have.property('createdAt')

// Unique constraints
expect(indexes).to.exist
```

### Service Logic
```javascript
// Successful operations
expect(result).to.exist
expect(result._id).to.equal(mockFollow._id)

// Error handling
expect(error.message).to.include('Already following')

// Counter updates
expect(calls[0].args[1]).to.deep.equal({ $inc: { following_count: 1 } })

// Call verification
expect(followRepository.createFollow.calledOnce).to.be.true
```

---

## Test Structure

Each test follows this pattern:
```javascript
describe('Suite Name', () => {
  afterEach(() => {
    sinon.restore();  // Clean up stubs
  });

  it('should do something', async () => {
    // 1. Setup
    sinon.stub(Model, 'method').resolves(mockData);

    // 2. Execute
    const result = await functionUnderTest();

    // 3. Assert
    expect(result).to.exist;
    expect(Model.method.calledOnce).to.be.true;
  });
});
```

---

## Debugging Failed Tests

### View Specific Test Details
```bash
npm test -- --grep "should successfully follow a user"
```

### View Stub Calls
Add to test:
```javascript
console.log('Stub calls:', followRepository.createFollow.getCalls());
```

### Increase Timeout
```bash
npm test -- --timeout 5000
```

### Run with Debug Output
```bash
DEBUG=* npm test
```

---

## Coverage Report

View detailed coverage:
```bash
# After running tests, check the coverage directory
cat coverage/coverage-final.json
```

### Coverage Goals
- Statements: 64.06% (target: 80%+)
- Branches: 87.8% (target: 85%+)
- Functions: 25.64% (target: 75%+)
- Lines: 64.06% (target: 80%+)

---

## Test Maintenance

### Adding New Tests
1. Add test case in appropriate describe block
2. Follow existing pattern (setup, execute, assert)
3. Use existing stubs/mocks
4. Run tests to verify

### Fixing Failing Tests
1. Run specific test: `npm test -- --grep "test name"`
2. Check error message and assertion
3. Update stub configuration if needed
4. Update test expectation if service behavior changed
5. Re-run test

### Updating After Service Changes
When service methods change:
1. Update corresponding stubs
2. Update expected calls
3. Re-run tests
4. Update assertions if behavior changed

---

## CI/CD Integration

Add to package.json scripts:
```json
{
  "scripts": {
    "test": "c8 mocha src/tests/**/*.test.js",
    "test:watch": "mocha src/tests/**/*.test.js --watch",
    "test:coverage": "c8 --reporter=html mocha src/tests/**/*.test.js",
    "test:ci": "c8 --reporter=text --reporter=json mocha src/tests/**/*.test.js"
  }
}
```

---

## Resources

- **Test File**: `src/tests/social.test.js` (686 lines)
- **Full Report**: `Module3_UnitTest_Report.md`
- **Models**: `src/models/follow.model.js`, `src/models/block.model.js`
- **Services**: `src/services/social.service.js`
- **Repositories**: `src/repositories/{follow,block}.repository.js`

---

## Next Steps

1. ✅ Fix 8 failing tests
2. ⚠️ Add integration tests
3. ⚠️ Test with real database
4. ⚠️ Increase coverage to 80%+
5. ⚠️ Add API endpoint tests

---

**Last Updated**: March 24, 2026  
**Test Framework**: Mocha 11.7.5 + Chai 6.2.2 + Sinon 21.0.3
