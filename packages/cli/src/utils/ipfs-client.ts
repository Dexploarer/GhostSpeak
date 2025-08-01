/**
 * IPFS client utilities for metadata storage
 */

import { create } from 'kubo-rpc-client'

export interface IPFSClient {
  add(content: string): Promise<string>
  pin(hash: string): Promise<void>
  get(hash: string): Promise<string>
}

export class IPFSClientImpl implements IPFSClient {
  private client: any

  constructor(url = 'https://ipfs.infura.io:5001') {
    try {
      this.client = create({ url })
    } catch {
      console.warn('IPFS client not available, using fallback storage')
      this.client = null
    }
  }

  async add(content: string): Promise<string> {
    if (!this.client) {
      // Fallback: Use data URI for local testing
      return `data:application/json;base64,${Buffer.from(content).toString('base64')}`
    }

    try {
      const result = await this.client.add(content)
      const hash = result.cid.toString()
      
      // Pin the content to ensure it persists
      await this.pin(hash)
      
      return `https://ipfs.io/ipfs/${hash}`
    } catch (error) {
      console.warn(`Failed to load plugin from ${file}:`, error)
      // Fallback to data URI
      return `data:application/json;base64,${Buffer.from(content).toString('base64')}`
    }
  }

  async pin(hash: string): Promise<void> {
    if (!this.client) return

    try {
      await this.client.pin.add(hash)
    } catch (error) {
      console.warn(`Failed to load plugin from ${file}:`, error)
      // Non-fatal error - content may still be accessible
    }
  }

  async get(hash: string): Promise<string> {
    if (!this.client) {
      throw new Error('IPFS client not available')
    }

    try {
      const chunks = []
      for await (const chunk of this.client.cat(hash)) {
        chunks.push(chunk)
      }
      return Buffer.concat(chunks).toString()
    } catch {
      throw new Error(`Failed to retrieve IPFS content: ${error}`)
    }
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