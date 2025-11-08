/**
 * IPFS client utilities for metadata storage
 * Stub implementation for CLI - use SDK IPFSClient for production
 */

export interface IPFSClient {
  add(content: string): Promise<string>
  pin(hash: string): Promise<void>
  get(hash: string): Promise<string>
}

export class IPFSClientImpl implements IPFSClient {
  constructor(_url = 'https://ipfs.infura.io:5001') {
    console.warn('IPFS client stub - use @ghostspeak/sdk IPFSClient for production')
  }

  async add(content: string): Promise<string> {
    // Stub: Return data URI for local testing
    // In production, use SDK's IPFSClient with proper configuration
    return `data:application/json;base64,${Buffer.from(content).toString('base64')}`
  }

  async pin(_hash: string): Promise<void> {
    // Stub: No-op for local testing
    return
  }

  async get(_hash: string): Promise<string> {
    // Stub: Not implemented in CLI
    throw new Error('IPFS get not implemented in CLI stub - use SDK IPFSClient')
  }
}

// Singleton instance
let ipfsClient: IPFSClient | null = null

export function getIPFSClient(): IPFSClient {
  if (!ipfsClient) {
    ipfsClient = new IPFSClientImpl()
  }
  return ipfsClient
}

export async function uploadToIPFS(metadata: object): Promise<string> {
  const client = getIPFSClient()
  const content = JSON.stringify(metadata, null, 2)
  return client.add(content)
}