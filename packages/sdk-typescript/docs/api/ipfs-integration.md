# IPFS Integration

The GhostSpeak SDK provides seamless IPFS integration for storing and retrieving large content that exceeds blockchain storage limits.

## Overview

IPFS (InterPlanetary File System) integration enables decentralized storage of agent metadata, communication logs, work deliverables, and other large content. The SDK handles uploads, downloads, pinning, and fallback strategies automatically.

```typescript
import { 
  IPFSClient,
  createIPFSUtils,
  IPFSConfig 
} from '@ghostspeak/sdk';
```

## Configuration

### Basic Configuration

```typescript
// Configure IPFS in client
const client = new GhostSpeakClient({
  rpc,
  ipfs: {
    providers: [
      {
        name: 'infura',
        endpoint: 'https://ipfs.infura.io:5001',
        projectId: 'YOUR_PROJECT_ID',
        projectSecret: 'YOUR_PROJECT_SECRET'
      }
    ]
  }
});
```

### Advanced Configuration

```typescript
// Full IPFS configuration
const ipfsConfig: IPFSConfig = {
  providers: [
    {
      name: 'infura',
      endpoint: 'https://ipfs.infura.io:5001',
      headers: {
        'Authorization': 'Basic ' + btoa(`${projectId}:${projectSecret}`)
      },
      priority: 1
    },
    {
      name: 'pinata',
      apiKey: 'YOUR_PINATA_KEY',
      apiSecret: 'YOUR_PINATA_SECRET',
      priority: 2
    },
    {
      name: 'local',
      endpoint: 'http://localhost:5001',
      priority: 3
    }
  ],
  
  // Retry configuration
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
  
  // Content settings
  maxFileSize: 104857600, // 100MB
  contentThreshold: 1024, // Use IPFS for content > 1KB
  
  // Pinning settings
  pinByDefault: true,
  pinningService: 'pinata',
  
  // Timeout settings
  uploadTimeout: 30000,
  downloadTimeout: 20000,
  
  // Circuit breaker
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,
    resetTimeout: 60000
  }
};

const client = new GhostSpeakClient({ rpc, ipfs: ipfsConfig });
```

### Provider Fallback

```typescript
// IPFS client with automatic provider fallback
const ipfsUtils = createIPFSUtils({
  providers: [
    { name: 'primary', endpoint: 'https://primary.ipfs.io' },
    { name: 'secondary', endpoint: 'https://backup.ipfs.io' },
    { name: 'tertiary', endpoint: 'https://fallback.ipfs.io' }
  ],
  
  fallbackStrategy: {
    enabled: true,
    retryFailedProviders: true,
    healthCheckInterval: 300000 // 5 minutes
  }
});
```

## Uploading Content

### Basic Upload

```typescript
// Upload simple content
const result = await client.ipfs.upload({
  content: "Large agent description with detailed capabilities...",
  name: "agent-metadata.json",
  pin: true
});

console.log("IPFS hash:", result.hash);
console.log("Gateway URL:", result.url);
console.log("Size:", result.size);

// Use in agent registration
const agent = await client.agent.register(signer, {
  name: "AI Assistant",
  description: "See full description in metadata",
  metadataUri: `ipfs://${result.hash}`
});
```

### Upload JSON Objects

```typescript
// Upload structured data
const metadata = {
  name: "Advanced AI Agent",
  fullDescription: "... very long description ...",
  capabilities: {
    "code-review": {
      languages: ["typescript", "rust", "python"],
      frameworks: ["react", "anchor", "django"],
      experience: "5 years"
    },
    "data-analysis": {
      tools: ["pandas", "numpy", "scikit-learn"],
      domains: ["finance", "healthcare"]
    }
  },
  portfolio: [
    { project: "DeFi Protocol", role: "Auditor", uri: "..." },
    { project: "NFT Marketplace", role: "Developer", uri: "..." }
  ],
  certifications: ["AWS", "Google Cloud", "Blockchain Council"],
  availability: {
    timezone: "UTC",
    hours: "9-5",
    responseTime: "< 2 hours"
  }
};

const result = await client.ipfs.uploadJSON(metadata, {
  name: "agent-full-metadata.json",
  wrapInDirectory: true,
  pin: true
});
```

### Upload Files

```typescript
// Upload file from path
const fileResult = await client.ipfs.uploadFile('/path/to/document.pdf', {
  name: 'project-specs.pdf',
  pin: true,
  metadata: {
    description: 'Project specifications',
    version: '1.0',
    author: 'Project Team'
  }
});

// Upload multiple files
const files = [
  { path: 'src/contract.rs', content: contractCode },
  { path: 'src/lib.rs', content: libCode },
  { path: 'Cargo.toml', content: cargoToml },
  { path: 'README.md', content: readme }
];

const directoryResult = await client.ipfs.uploadDirectory(files, {
  name: 'smart-contract-project',
  wrapInDirectory: true,
  pin: true
});

console.log("Directory hash:", directoryResult.hash);
console.log("Files:", directoryResult.files);
```

### Upload with Progress

```typescript
// Upload large file with progress tracking
const largeFile = new Blob([largeContent], { type: 'video/mp4' });

const uploadResult = await client.ipfs.uploadWithProgress(
  largeFile,
  {
    name: 'tutorial-video.mp4',
    onProgress: (progress) => {
      console.log(`Upload progress: ${progress.percent}%`);
      console.log(`Bytes uploaded: ${progress.loaded}/${progress.total}`);
    },
    onChunk: (chunk) => {
      console.log(`Uploaded chunk: ${chunk.index}/${chunk.total}`);
    }
  }
);
```

## Retrieving Content

### Basic Retrieval

```typescript
// Retrieve content by hash
const content = await client.ipfs.retrieve('QmXxx...', {
  timeout: 10000
});

console.log("Content:", content);

// Retrieve as specific type
const jsonData = await client.ipfs.retrieveJSON<AgentMetadata>(
  'QmYyy...'
);

console.log("Agent name:", jsonData.name);
console.log("Capabilities:", jsonData.capabilities);
```

### Retrieve with Fallback

```typescript
// Retrieve with gateway fallback
const gateways = [
  'https://ipfs.io',
  'https://gateway.pinata.cloud',
  'https://cloudflare-ipfs.com'
];

const content = await client.ipfs.retrieveWithFallback(hash, {
  gateways,
  maxAttempts: 3,
  validateContent: true
});
```

### Stream Large Files

```typescript
// Stream large file downloads
const stream = await client.ipfs.stream(hash, {
  chunkSize: 1048576 // 1MB chunks
});

let totalSize = 0;
for await (const chunk of stream) {
  totalSize += chunk.length;
  console.log(`Received ${totalSize} bytes`);
  
  // Process chunk
  await processChunk(chunk);
}
```

## Content Management

### Pinning

```typescript
// Pin important content
const pinResult = await client.ipfs.pin(hash, {
  name: 'critical-contract-data',
  metadata: {
    type: 'contract',
    importance: 'high',
    expiresAt: Date.now() + 31536000000 // 1 year
  }
});

console.log("Pin ID:", pinResult.id);
console.log("Pinned to:", pinResult.providers);

// List pinned content
const pins = await client.ipfs.listPins({
  status: 'pinned',
  metadata: { type: 'contract' }
});

// Unpin content
await client.ipfs.unpin(hash);
```

### Content Validation

```typescript
// Validate content integrity
const validation = await client.ipfs.validate(hash, {
  expectedSize: 1024000,
  expectedMimeType: 'application/json',
  checksum: 'sha256:abc123...'
});

if (!validation.valid) {
  console.error("Validation failed:", validation.errors);
}
```

### Garbage Collection

```typescript
// Clean up old content
const cleaned = await client.ipfs.garbageCollect({
  olderThan: Date.now() - 2592000000, // 30 days
  unpinnedOnly: true,
  minSize: 1048576 // Only files > 1MB
});

console.log("Cleaned up:", cleaned.count, "files");
console.log("Space freed:", cleaned.bytesFreed);
```

## Integration Examples

### Agent Metadata

```typescript
// Store comprehensive agent data
async function createAgentWithRichMetadata(signer: KeyPairSigner) {
  // Prepare rich metadata
  const metadata = {
    profile: {
      name: "AI Research Assistant",
      avatar: await client.ipfs.upload(avatarImage),
      banner: await client.ipfs.upload(bannerImage)
    },
    capabilities: {
      research: {
        domains: ["blockchain", "AI", "quantum"],
        tools: ["arxiv", "scholar", "patents"],
        languages: ["en", "es", "zh"]
      }
    },
    portfolio: await Promise.all(
      projects.map(p => client.ipfs.uploadJSON(p))
    ),
    documentation: await client.ipfs.uploadFile('docs/guide.pdf')
  };
  
  // Upload metadata
  const metadataUri = await client.ipfs.uploadJSON(metadata);
  
  // Register agent with IPFS metadata
  return client.agent.register(signer, {
    name: metadata.profile.name,
    description: "AI Research Assistant - Full details on IPFS",
    metadataUri: `ipfs://${metadataUri.hash}`,
    capabilities: Object.keys(metadata.capabilities)
  });
}
```

### Work Deliverables

```typescript
// Upload work deliverables
async function submitDeliverables(workOrder: Address, files: File[]) {
  // Create deliverables package
  const deliverables = {
    workOrder,
    submittedAt: Date.now(),
    files: []
  };
  
  // Upload each file
  for (const file of files) {
    const result = await client.ipfs.uploadFile(file, {
      pin: true,
      metadata: {
        workOrder,
        filename: file.name,
        size: file.size,
        type: file.type
      }
    });
    
    deliverables.files.push({
      name: file.name,
      hash: result.hash,
      size: file.size
    });
  }
  
  // Upload manifest
  const manifest = await client.ipfs.uploadJSON(deliverables);
  
  // Submit to blockchain
  return client.marketplace.submitDeliverables(signer, workOrder, {
    deliverablesUri: `ipfs://${manifest.hash}`,
    fileCount: files.length
  });
}
```

### Message Attachments

```typescript
// A2A messages with attachments
async function sendMessageWithAttachments(
  session: Address,
  content: string,
  attachments: Array<{ name: string; data: Blob }>
) {
  // Upload attachments
  const uploaded = await Promise.all(
    attachments.map(async (att) => {
      const result = await client.ipfs.upload(att.data, {
        name: att.name,
        pin: false // Temporary content
      });
      
      return {
        name: att.name,
        uri: `ipfs://${result.hash}`,
        size: att.data.size,
        type: att.data.type
      };
    })
  );
  
  // Send message with attachment references
  return client.a2a.sendMessage(signer, session, {
    content,
    attachments: uploaded,
    messageType: 'with_attachments'
  });
}
```

## Advanced Features

### Content Addressing

```typescript
// Generate content ID before upload
const contentId = await client.ipfs.generateContentId(content);
console.log("Content will have hash:", contentId);

// Check if content exists
const exists = await client.ipfs.exists(contentId);
if (!exists) {
  await client.ipfs.upload(content);
}
```

### Batch Operations

```typescript
// Batch upload with transaction
const batch = await client.ipfs.createBatch();

try {
  // Add files to batch
  await batch.add('file1.txt', content1);
  await batch.add('file2.json', content2);
  await batch.add('file3.pdf', content3);
  
  // Commit batch
  const results = await batch.commit({
    pin: true,
    wrapInDirectory: true
  });
  
  console.log("Batch root:", results.root);
  console.log("Individual files:", results.files);
} catch (error) {
  await batch.abort();
}
```

### IPNS Publishing

```typescript
// Publish mutable reference
const ipnsKey = await client.ipfs.createIPNSKey('agent-profile');

// Publish content to IPNS
await client.ipfs.publishIPNS(ipnsKey, contentHash, {
  lifetime: '24h',
  ttl: '1h'
});

// Resolve IPNS name
const resolved = await client.ipfs.resolveIPNS(ipnsKey.id);
console.log("Current content:", resolved);

// Update IPNS reference
await client.ipfs.updateIPNS(ipnsKey, newContentHash);
```

### Encryption

```typescript
// Encrypt before upload
const encrypted = await client.ipfs.uploadEncrypted(
  sensitiveData,
  {
    recipientPublicKey: agentPublicKey,
    algorithm: 'aes-256-gcm'
  }
);

// Decrypt after download
const decrypted = await client.ipfs.retrieveEncrypted(
  encrypted.hash,
  {
    privateKey: agentPrivateKey
  }
);
```

## Error Handling

### Retry Strategies

```typescript
// Configure retry behavior
const ipfsWithRetry = createIPFSUtils({
  retryConfig: {
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableErrors: [
      'ETIMEDOUT',
      'ECONNREFUSED',
      'ENOTFOUND',
      'NetworkError'
    ]
  }
});

// Manual retry with exponential backoff
async function uploadWithRetry(content: any, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await client.ipfs.upload(content);
    } catch (error) {
      if (i === attempts - 1) throw error;
      
      const delay = Math.min(1000 * Math.pow(2, i), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

### Circuit Breaker

```typescript
// Circuit breaker prevents cascading failures
const breaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 60000,
  monitorInterval: 10000
});

// Wrap IPFS operations
const protectedUpload = breaker.protect(
  async (content) => client.ipfs.upload(content)
);

try {
  await protectedUpload(content);
} catch (error) {
  if (error.code === 'CIRCUIT_OPEN') {
    console.log("IPFS temporarily unavailable");
    // Use alternative storage
  }
}
```

## Best Practices

### 1. Content Strategy

```typescript
// Determine storage method based on content
function determineStorageMethod(content: any): 'onchain' | 'ipfs' {
  const size = new Blob([JSON.stringify(content)]).size;
  
  if (size < 1024) return 'onchain'; // < 1KB
  if (size > 10485760) return 'ipfs'; // > 10MB always IPFS
  
  // Consider content type
  if (content.type === 'metadata') return 'ipfs';
  if (content.type === 'reference') return 'onchain';
  
  return size > 4096 ? 'ipfs' : 'onchain';
}
```

### 2. Caching

```typescript
// Implement content caching
class IPFSCache {
  private cache = new Map<string, CachedContent>();
  
  async get(hash: string): Promise<any> {
    const cached = this.cache.get(hash);
    
    if (cached && cached.expiresAt > Date.now()) {
      return cached.content;
    }
    
    const content = await client.ipfs.retrieve(hash);
    this.cache.set(hash, {
      content,
      expiresAt: Date.now() + 3600000 // 1 hour
    });
    
    return content;
  }
}
```

### 3. Pinning Strategy

```typescript
// Strategic pinning based on importance
const pinningStrategy = {
  critical: {
    providers: ['infura', 'pinata'],
    replicationTarget: 3,
    checkInterval: 86400000 // Daily
  },
  
  important: {
    providers: ['pinata'],
    replicationTarget: 2,
    checkInterval: 604800000 // Weekly
  },
  
  temporary: {
    providers: [],
    ttl: 2592000000, // 30 days
    autoUnpin: true
  }
};
```

### 4. Performance Optimization

```typescript
// Optimize IPFS operations
class IPFSOptimizer {
  // Deduplicate uploads
  async uploadUnique(content: any) {
    const hash = await generateHash(content);
    const exists = await client.ipfs.exists(hash);
    
    if (exists) {
      return { hash, cached: true };
    }
    
    return client.ipfs.upload(content);
  }
  
  // Parallel uploads
  async uploadMany(items: any[]) {
    const chunks = chunk(items, 5); // 5 parallel uploads
    const results = [];
    
    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(item => this.uploadUnique(item))
      );
      results.push(...chunkResults);
    }
    
    return results;
  }
}
```