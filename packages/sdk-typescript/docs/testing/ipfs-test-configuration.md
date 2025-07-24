# IPFS Test Configuration Guide

This guide explains how to configure and use IPFS in the GhostSpeak SDK for testing purposes without requiring external services.

## Overview

The GhostSpeak SDK includes a test IPFS provider that simulates IPFS functionality in-memory. This allows you to:

- Test large data storage without external dependencies
- Verify IPFS integration in automated tests
- Develop locally without IPFS credentials
- Ensure consistent test behavior

## Test IPFS Provider

The test provider (`TestIPFSProvider`) implements the full IPFS interface but stores data in memory:

```typescript
import { createTestIPFSConfig, IPFSUtils } from '@ghostspeak/sdk'

// Create test IPFS configuration
const testIPFSConfig = createTestIPFSConfig({
  sizeThreshold: 300 // Lower threshold for testing
})

// Initialize IPFS utils with test config
const ipfsUtils = new IPFSUtils(testIPFSConfig)
```

## Using IPFS in Beta Tests

### 1. Agent Creation with IPFS

```typescript
const agentAddress = await client.agent.create(wallet, {
  name: 'Large Agent',
  description: 'A'.repeat(1000), // Large description
  category: 'automation',
  capabilities: Array(50).fill(0).map((_, i) => `capability-${i}`),
  metadataUri: '', // Let SDK handle URI creation
  serviceEndpoint: 'https://api.example.com',
  ipfsConfig: testIPFSConfig, // Use test IPFS config
  forceIPFS: true // Force IPFS usage
})
```

### 2. Verifying IPFS Storage

```typescript
// Get agent account
const agent = await client.agent.getAccount(agentAddress)

// Check if IPFS was used
if (agent.metadataUri?.startsWith('ipfs://')) {
  // Retrieve metadata from IPFS
  const metadata = await ipfsUtils.retrieveAgentMetadata(agent.metadataUri)
  console.log('Retrieved metadata:', metadata)
}
```

### 3. Direct IPFS Operations

```typescript
// Upload content
const content = JSON.stringify({ data: 'large content' })
const uploadResult = await ipfsUtils.client.upload(content, {
  filename: 'test.json',
  metadata: { type: 'test' }
})

if (uploadResult.success) {
  // Retrieve content
  const retrieveResult = await ipfsUtils.client.retrieve(uploadResult.data.hash)
  if (retrieveResult.success) {
    console.log('Retrieved:', retrieveResult.data.content)
  }
}
```

## Configuration Options

### Size Threshold

The `sizeThreshold` determines when content is stored on IPFS vs inline:

```typescript
const config = createTestIPFSConfig({
  sizeThreshold: 400 // Bytes - content larger than this uses IPFS
})
```

### Cache Settings

Enable caching for better performance in tests:

```typescript
const config = createTestIPFSConfig({
  enableCache: true,
  cacheTTL: 60000 // 1 minute cache
})
```

### Retry Configuration

Configure retry behavior for simulated failures:

```typescript
const config = createTestIPFSConfig({
  maxRetries: 2,
  retryDelay: 500 // milliseconds
})
```

## Test Provider Features

The test IPFS provider includes:

1. **In-Memory Storage**: All content stored in memory
2. **Deterministic Hashes**: Consistent hash generation for testing
3. **Statistics**: Track uploads, storage size, and pinned content
4. **Clear Method**: Reset storage between tests

```typescript
// Get statistics
const stats = (ipfsUtils.client as any).providers[0].getStats()
console.log('IPFS Stats:', stats)

// Clear storage
(ipfsUtils.client as any).providers[0].clear()
```

## Environment Variables

For production IPFS usage, configure these environment variables:

```bash
# Production IPFS (Pinata)
IPFS_PROVIDER=pinata
IPFS_API_KEY=your_pinata_api_key
IPFS_API_SECRET=your_pinata_api_secret

# Test mode (no external services)
IPFS_PROVIDER=test
```

## Best Practices

1. **Use Test Config in Tests**: Always use `createTestIPFSConfig()` in automated tests
2. **Force IPFS When Needed**: Use `forceIPFS: true` to test IPFS regardless of size
3. **Verify Storage Method**: Check if URIs start with `ipfs://` to confirm IPFS usage
4. **Handle Both Storage Types**: Ensure code works with both inline and IPFS storage

## Example Test Suite

```typescript
describe('IPFS Integration', () => {
  let ipfsUtils: IPFSUtils
  
  beforeAll(() => {
    const config = createTestIPFSConfig({ sizeThreshold: 100 })
    ipfsUtils = new IPFSUtils(config)
  })
  
  afterEach(() => {
    // Clear test storage
    (ipfsUtils.client as any).providers[0].clear()
  })
  
  test('should use IPFS for large content', async () => {
    const largeContent = 'X'.repeat(200)
    const result = await ipfsUtils.client.storeContent(
      largeContent, 
      'test-data'
    )
    
    expect(result.useIpfs).toBe(true)
    expect(result.uri).toMatch(/^ipfs:\/\//)
  })
  
  test('should use inline for small content', async () => {
    const smallContent = 'Hello'
    const result = await ipfsUtils.client.storeContent(
      smallContent, 
      'test-data'
    )
    
    expect(result.useIpfs).toBe(false)
    expect(result.uri).toMatch(/^data:/)
  })
})
```

## Troubleshooting

### Large Data Fails

If large data tests fail:
1. Check the `sizeThreshold` is set appropriately
2. Verify IPFS config is passed to the create method
3. Use `forceIPFS: true` to bypass size checks

### Content Mismatch

If retrieved content doesn't match:
1. Check encoding/decoding is consistent
2. Verify the test provider is being used
3. Ensure cache is cleared between tests

### Performance Issues

For better test performance:
1. Lower `maxRetries` in test config
2. Reduce `retryDelay` for faster failures
3. Use smaller test data when possible