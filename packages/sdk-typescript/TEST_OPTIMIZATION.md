# Test Optimization Guide

## Running Tests

### Quick Test Commands

```bash
# Run only working tests (fast feedback)
npm run test:working

# Run fast unit tests 
npm run test:fast

# Run specific test suites
npm run test:unit      # Unit tests only
npm run test:integration  # Integration tests only

# Full test run with extended timeouts
npm run test:full

# Test with coverage
npm run test:coverage
```

## Known Issues and Workarounds

### 1. Module Mocking (`vi.mock` not available)

**Issue**: When running tests with `bun test`, `vi.mock` and `vi.doMock` are not available.

**Workaround**: 
- Use `npx vitest` instead of `bun test`
- Or create tests that use dependency injection instead of module mocking
- See `connection-pool-simple.test.ts` for an example

### 2. Test Timeouts

**Issue**: Some tests timeout due to expensive crypto operations.

**Solutions**:
- Reduced iteration counts in benchmarks
- Use `FULL_TEST_RUN=1` environment variable for extended timeouts
- Run subsets of tests for faster feedback

### 3. Missing Modules

**Fixed**: Created `src/utils/format.ts` for utility functions.

## Test Performance Tips

1. **Run tests in parallel**: Tests run in parallel by default with up to 4 threads

2. **Use test filtering**: Run only the tests you need:
   ```bash
   npx vitest run path/to/specific/test.ts
   ```

3. **Skip slow tests during development**:
   ```typescript
   it.skipIf(process.env.FAST_TESTS)('slow test', async () => {
     // expensive test
   })
   ```

4. **Use the test UI for debugging**:
   ```bash
   npm run test:ui
   ```

## Coverage Goals

Current coverage status:
- Browser compatibility: 100%
- ElGamal crypto: 92.47%
- Overall: ~67%

Target: 80%+ for all critical modules