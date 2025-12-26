/**
 * IPFS Upload Utility
 * 
 * Handles uploading metadata to IPFS for agent registration and other features.
 * Uses web3.storage or similar IPFS pinning service.
 */

// IPFS Gateway URLs for reading
const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
]

/**
 * Upload JSON metadata to IPFS
 * 
 * Uses the /api/ipfs/upload endpoint to keep Pinata JWT secure.
 * Falls back to direct Pinata API if running server-side with env access.
 */
export async function uploadMetadataToIPFS(metadata: Record<string, unknown>): Promise<string> {
  // Check if we're in browser - use API route
  if (typeof window !== 'undefined') {
    try {
      const response = await fetch('/api/ipfs/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata }),
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.uri) {
          return result.uri
        }
      }
      
      console.warn('API route upload failed, using data URI fallback')
    } catch (error) {
      console.warn('IPFS API route error:', error)
    }
  }
  
  const metadataJson = JSON.stringify(metadata, null, 2)
  
  // Server-side: Try Pinata directly
  const pinataJwt = process.env.PINATA_JWT
  
  if (pinataJwt) {
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
        }),
      })
      
      if (response.ok) {
        const result = await response.json()
        return `ipfs://${result.IpfsHash}`
      }
      
      console.warn('Pinata upload failed, falling back to data URI')
    } catch (error) {
      console.warn('Pinata upload error, falling back to data URI:', error)
    }
  }
  
  // Fallback: Use data URI (development only)
  console.warn('No IPFS provider available, using data URI')
  return `data:application/json;base64,${Buffer.from(metadataJson).toString('base64')}`
}

/**
 * Convert IPFS URI to HTTP gateway URL
 */
export function ipfsToHttp(uri: string): string {
  if (uri.startsWith('ipfs://')) {
    const cid = uri.replace('ipfs://', '')
    return `${IPFS_GATEWAYS[0]}${cid}`
  }
  
  if (uri.startsWith('data:')) {
    // Data URI, return as-is for now
    return uri
  }
  
  return uri
}

/**
 * Upload a file to IPFS
 */
export async function uploadFileToIPFS(file: File): Promise<string> {
  const web3StorageToken = process.env.NEXT_PUBLIC_WEB3_STORAGE_TOKEN
  
  if (web3StorageToken) {
    try {
      const response = await fetch('https://api.web3.storage/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${web3StorageToken}`,
          'X-Name': file.name,
        },
        body: file,
      })
      
      if (response.ok) {
        const result = await response.json()
        return `ipfs://${result.cid}`
      }
    } catch (error) {
      console.error('File upload to IPFS failed:', error)
    }
  }
  
  // Fallback: convert to data URI
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
