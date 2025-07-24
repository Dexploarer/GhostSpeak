# IPFS Integration for GhostSpeak SDK

The GhostSpeak SDK includes comprehensive IPFS (InterPlanetary File System) integration to handle large content that exceeds Solana's transaction size limits. This enables seamless storage of large agent metadata, channel messages, and file attachments while maintaining blockchain security and transparency.

## Features

- **Automatic Storage Decision**: Content is automatically stored on IPFS when it exceeds configurable size thresholds
- **Multiple Provider Support**: Supports Pinata, local IPFS nodes, and custom providers with fallback capabilities
- **Error Handling & Retry Logic**: Comprehensive error handling with exponential backoff and circuit breaker patterns
- **Content Integrity**: Checksum validation and content verification
- **Caching**: Optional content caching for improved performance
- **Seamless Integration**: Works transparently with existing agent and channel operations

## Quick Start

### Basic Configuration

```typescript
import { createIPFSUtils, IPFSConfig } from '@ghostspeak/sdk'

// Pinata configuration
const ipfsConfig: IPFSConfig = {
  provider: {
    name: 'pinata',
    jwt: 'your-pinata-jwt-token'
  },
  gateways: [
    'https://gateway.pinata.cloud',
    'https://ipfs.io'
  ],
  sizeThreshold: 800, // Store on IPFS if content > 800 bytes
  maxRetries: 3,
  enableCache: true
}

const ipfsUtils = createIPFSUtils(ipfsConfig)
```

### Agent Creation with IPFS

```typescript
import { AgentInstructions } from '@ghostspeak/sdk'

// Configure the agent instructions with IPFS
const agentInstructions = new AgentInstructions({
  ...config,
  ipfsConfig
})

// Create agent with large metadata
const agentAddress = await agentInstructions.create(signer, {
  name: 'Advanced Research Assistant',
  description: `Very long description with detailed capabilities...`, // Large content
  category: 'research',
  capabilities: ['analysis', 'research', 'writing', 'data-processing'],
  serviceEndpoint: 'https://agent.example.com/api'
  // Large metadata will automatically be stored on IPFS
})
```

### Channel Messages with IPFS

```typescript
import { ChannelInstructions } from '@ghostspeak/sdk'

const channelInstructions = new ChannelInstructions({
  ...config,
  ipfsConfig
})

// Send large message that will be stored on IPFS
await channelInstructions.sendMessage(signer, channelAddress, {
  channelId: channelAddress,
  content: `Very long message content...`, // Large content
  forceIPFS: true // Force IPFS storage
})

// Send message with file attachments
await channelInstructions.sendMessageWithAttachments(
  signer,
  channelAddress,
  'Please review the attached files',
  [
    {
      filename: 'data.csv',
      content: csvData,
      contentType: 'text/csv'
    }
  ],
  { ipfsConfig }
)
```

### Manual IPFS Operations

```typescript
// Direct IPFS operations
const storageResult = await ipfsUtils.storeAgentMetadata({
  name: 'Agent Name',
  description: 'Agent description',
  capabilities: ['capability1', 'capability2'],
  serviceEndpoint: 'https://example.com'
})

console.log('Stored at:', storageResult.uri)
console.log('Uses IPFS:', storageResult.useIpfs)

// Retrieve content
if (storageResult.useIpfs) {
  const metadata = await ipfsUtils.retrieveAgentMetadata(storageResult.uri)
  console.log('Retrieved metadata:', metadata)
}
```

## Configuration Options

### Provider Configurations

#### Pinata
```typescript
{
  provider: {
    name: 'pinata',
    jwt: 'your-jwt-token',
    endpoint: 'https://api.pinata.cloud'
  }
}
```

#### Local IPFS Node
```typescript
{
  provider: {
    name: 'ipfs-http-client',
    endpoint: 'http://localhost:5001'
  }
}
```

#### Multiple Providers with Fallback
```typescript
{
  provider: {
    name: 'pinata',
    jwt: 'primary-provider-jwt'
  },
  fallbackProviders: [
    {
      name: 'ipfs-http-client',
      endpoint: 'http://localhost:5001'
    }
  ]
}
```

### Performance Tuning

```typescript
{
  sizeThreshold: 500,     // Lower threshold for more IPFS usage
  maxRetries: 5,          // More retries for reliability
  retryDelay: 2000,       // Longer delay between retries
  enableCache: true,      // Enable content caching
  cacheTTL: 600000        // 10-minute cache TTL
}
```

## Error Handling

The IPFS integration includes comprehensive error handling:

```typescript
import { withIPFSErrorHandling, createIPFSErrorHandler } from '@ghostspeak/sdk'

// Use error handling wrapper
const result = await withIPFSErrorHandling(
  async () => {
    return await ipfsUtils.storeAgentMetadata(metadata)
  },
  'agent-metadata-storage'
)

if (!result.success) {
  console.error('IPFS operation failed:', result.message)
  // Fallback to inline storage or other strategies
}

// Custom error handler with fallback strategies
const errorHandler = createIPFSErrorHandler({
  retryConfig: {
    maxRetries: 5,
    baseDelay: 1000
  },
  customFallbacks: [
    {
      errorType: 'QUOTA_EXCEEDED',
      strategy: async (error) => {
        // Custom fallback for quota issues
        console.warn('IPFS quota exceeded, using compressed storage')
        return compressAndStore(error)
      }
    }
  ]
})
```

## Content Types

The IPFS integration supports different content types:

- `agent-metadata`: Agent registration and profile data
- `channel-message`: Large channel messages
- `file-attachment`: File attachments and media
- `custom`: Custom application content

## Best Practices

1. **Size Thresholds**: Set appropriate size thresholds based on your use case
   - For high-frequency operations: 500-800 bytes
   - For occasional large content: 1000+ bytes

2. **Provider Selection**:
   - Use Pinata for production (reliable, fast)
   - Use local IPFS for development
   - Always configure fallback providers

3. **Caching**: Enable caching for read-heavy applications

4. **Error Handling**: Implement proper fallback strategies for critical operations

5. **Content Validation**: Verify content integrity after retrieval

## Advanced Features

### Circuit Breaker
Prevents cascading failures by temporarily stopping requests to failing providers:

```typescript
const errorHandler = new IPFSErrorHandler({
  retryConfig: {
    maxRetries: 3,
    baseDelay: 1000
  }
})

// Circuit breaker automatically opens after too many failures
// and allows recovery after a timeout period
```

### Batch Operations
Upload multiple items efficiently:

```typescript
const results = await ipfsUtils.batchUpload([
  { content: data1, type: 'agent-metadata', filename: 'agent1.json' },
  { content: data2, type: 'agent-metadata', filename: 'agent2.json' }
])
```

### Content Validation
Verify content integrity:

```typescript
const hash = ipfsUtils.extractIPFSHash(uri)
const isValid = ipfsUtils.isValidIPFSHash(hash)

if (!isValid) {
  console.error('Invalid IPFS hash detected')
}
```

## Examples

See `src/utils/ipfs-examples.ts` for comprehensive usage examples including:
- Agent creation with large metadata
- Channel messaging with attachments
- Batch operations
- Error handling scenarios
- Complete integration workflows

## Troubleshooting

### Common Issues

1. **"IPFS utils not configured"**: Configure IPFS before using IPFS-dependent operations
2. **"Network Error"**: Check provider endpoints and authentication
3. **"Quota Exceeded"**: Upgrade provider plan or implement content cleanup
4. **"Content too large"**: Consider content compression or chunking

### Debug Logging
Enable debug logging to troubleshoot issues:

```typescript
// The SDK includes comprehensive console logging
// Check browser/node console for detailed operation logs
```

## Security Considerations

1. **Private Content**: Use private IPFS networks for sensitive data
2. **Authentication**: Secure your provider API keys
3. **Content Validation**: Always verify retrieved content integrity
4. **Access Control**: Implement proper access controls for IPFS gateways

This IPFS integration makes large content handling seamless in the GhostSpeak protocol while maintaining the security and transparency benefits of blockchain technology.