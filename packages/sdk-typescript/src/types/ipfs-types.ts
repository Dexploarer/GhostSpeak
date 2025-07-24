/**
 * IPFS configuration and types for GhostSpeak SDK
 */

/**
 * IPFS provider configuration
 */
export interface IPFSProviderConfig {
  /** Provider name */
  name: 'pinata' | 'infura' | 'ipfs-http-client' | 'web3-storage' | 'custom' | 'test'
  /** API endpoint URL */
  endpoint?: string
  /** API key for authentication */
  apiKey?: string
  /** API secret for authentication */
  apiSecret?: string
  /** JWT token for authentication */
  jwt?: string
  /** Custom headers */
  headers?: Record<string, string>
  /** Request timeout in milliseconds */
  timeout?: number
}

/**
 * IPFS client configuration
 */
export interface IPFSConfig {
  /** Primary provider */
  provider: IPFSProviderConfig
  /** Fallback providers */
  fallbackProviders?: IPFSProviderConfig[]
  /** Default IPFS gateway for retrieving content */
  gateway?: string
  /** Additional gateways for redundancy */
  gateways?: string[]
  /** Whether to automatically pin uploaded content */
  autoPinning?: boolean
  /** Content size threshold for IPFS (bytes) - content above this will use IPFS */
  sizeThreshold?: number
  /** Maximum retry attempts for failed operations */
  maxRetries?: number
  /** Retry delay in milliseconds */
  retryDelay?: number
  /** Enable caching of IPFS content */
  enableCache?: boolean
  /** Cache TTL in milliseconds */
  cacheTTL?: number
}

/**
 * IPFS upload options
 */
export interface IPFSUploadOptions {
  /** Pin the content after upload */
  pin?: boolean
  /** Custom filename for the content */
  filename?: string
  /** Metadata to associate with the upload */
  metadata?: Record<string, unknown>
  /** Content type/MIME type */
  contentType?: string
  /** Whether to wrap in directory */
  wrapWithDirectory?: boolean
  /** Progress callback for large uploads */
  onProgress?: (uploaded: number, total: number) => void
}

/**
 * IPFS upload result
 */
export interface IPFSUploadResult {
  /** IPFS hash/CID of the uploaded content */
  hash: string
  /** Full IPFS URI (ipfs://<hash>) */
  uri: string
  /** Size of uploaded content in bytes */
  size: number
  /** Upload timestamp */
  timestamp: number
  /** Whether content was pinned */
  pinned: boolean
  /** Gateway URLs for accessing the content */
  gateways: string[]
}

/**
 * IPFS retrieval options
 */
export interface IPFSRetrievalOptions {
  /** Preferred gateway to use */
  gateway?: string
  /** Timeout for retrieval in milliseconds */
  timeout?: number
  /** Whether to cache retrieved content */
  cache?: boolean
  /** Content type to expect */
  expectedType?: string
}

/**
 * IPFS retrieval result
 */
export interface IPFSRetrievalResult {
  /** Retrieved content */
  content: string | Uint8Array
  /** Content type */
  contentType?: string
  /** Content size in bytes */
  size: number
  /** IPFS hash */
  hash: string
  /** Gateway used for retrieval */
  gateway: string
  /** Whether content was served from cache */
  fromCache: boolean
}

/**
 * IPFS pin operation result
 */
export interface IPFSPinResult {
  /** IPFS hash that was pinned */
  hash: string
  /** Whether pin was successful */
  success: boolean
  /** Pin status */
  status: 'pinned' | 'pinning' | 'failed'
  /** Error message if failed */
  error?: string
}

/**
 * IPFS content metadata for large content storage
 */
export interface IPFSContentMetadata {
  /** Type of content stored */
  type: 'agent-metadata' | 'channel-message' | 'file-attachment' | 'custom'
  /** Original content size before IPFS storage */
  originalSize: number
  /** IPFS hash of the content */
  ipfsHash: string
  /** Content encoding used */
  encoding?: 'utf8' | 'base64' | 'binary'
  /** Compression algorithm used */
  compression?: 'gzip' | 'brotli' | 'none'
  /** Content MIME type */
  mimeType?: string
  /** Upload timestamp */
  uploadedAt: number
  /** Whether content is pinned */
  pinned: boolean
  /** Checksum for integrity verification */
  checksum?: string
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Error types for IPFS operations
 */
export type IPFSError = 
  | 'UPLOAD_FAILED'
  | 'RETRIEVAL_FAILED'
  | 'PIN_FAILED'
  | 'UNPIN_FAILED'
  | 'PROVIDER_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'INVALID_HASH'
  | 'INVALID_CONFIG'
  | 'CONTENT_TOO_LARGE'
  | 'QUOTA_EXCEEDED'
  | 'AUTHENTICATION_FAILED'

/**
 * IPFS operation result with error handling
 */
export interface IPFSOperationResult<T> {
  /** Whether operation was successful */
  success: boolean
  /** Result data if successful */
  data?: T
  /** Error type if failed */
  error?: IPFSError
  /** Human-readable error message */
  message?: string
  /** Operation duration in milliseconds */
  duration?: number
  /** Provider used for the operation */
  provider?: string
}

/**
 * Utility type for content that can be stored on IPFS or inline
 */
export interface FlexibleContent {
  /** Content stored inline (for small content) */
  inline?: string
  /** IPFS reference (for large content) */
  ipfs?: IPFSContentMetadata
}

/**
 * Helper type for converting content to IPFS when size threshold is exceeded
 */
export interface ContentStorageResult {
  /** Final content URI (either data: or ipfs:) */
  uri: string
  /** Whether content was stored on IPFS */
  useIpfs: boolean
  /** IPFS metadata if stored on IPFS */
  ipfsMetadata?: IPFSContentMetadata
  /** Content size in bytes */
  size: number
}