/**
 * IPFS Upload Utility for CLI
 * 
 * Handles uploading metadata to IPFS via Pinata for agent registration.
 */

import { getErrorMessage } from './type-guards.js'

/**
 * Upload JSON metadata to IPFS via Pinata
 */
export async function uploadMetadataToIPFS(metadata: Record<string, unknown>): Promise<string> {
  const pinataJwt = process.env.PINATA_JWT
  
  if (!pinataJwt) {
    console.warn('⚠️  PINATA_JWT not configured, using data URI fallback (not recommended for production)')
    const metadataJson = JSON.stringify(metadata, null, 2)
    return `data:application/json;base64,${Buffer.from(metadataJson).toString('base64')}`
  }

  try {
    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pinataJwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataOptions: { cidVersion: 1 },
        pinataMetadata: {
          name: (metadata.name as string) || 'ghostspeak-metadata',
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Pinata upload failed: ${errorText}`)
    }

    const result = await response.json() as { IpfsHash: string }
    const cid = result.IpfsHash
    
    console.log(`✅ Metadata uploaded to IPFS: ipfs://${cid}`)
    return `ipfs://${cid}`
  } catch (error) {
    console.warn(`⚠️  IPFS upload failed: ${getErrorMessage(error)}, using data URI fallback`)
    const metadataJson = JSON.stringify(metadata, null, 2)
    return `data:application/json;base64,${Buffer.from(metadataJson).toString('base64')}`
  }
}

/**
 * Convert IPFS URI to HTTP gateway URL
 */
export function ipfsToHttp(uri: string): string {
  if (uri.startsWith('ipfs://')) {
    const cid = uri.replace('ipfs://', '')
    return `https://gateway.pinata.cloud/ipfs/${cid}`
  }
  return uri
}
