/**
 * IPFS Upload API Route
 *
 * Securely uploads metadata to IPFS using Pinata.
 * Keeps Pinata JWT server-side for security.
 *
 * Used by: Agent registration, DID document storage, credential metadata
 */

import { withMiddleware, jsonResponse, errorResponse, handleCORS } from '@/lib/api/middleware'

export const POST = withMiddleware(async (request) => {
  const body = await request.json()
  const { metadata } = body

  if (!metadata || typeof metadata !== 'object') {
    return errorResponse('Missing or invalid metadata object', 400)
  }

  const pinataJwt = process.env.PINATA_JWT
  const pinataApiKey = process.env.PINATA_API_KEY
  const pinataSecretKey = process.env.PINATA_SECRET_KEY

  if (!pinataJwt && (!pinataApiKey || !pinataSecretKey)) {
    console.warn('[IPFS Upload] Pinata not configured, using data URI fallback')
    // Fallback to data URI for development
    const metadataJson = JSON.stringify(metadata, null, 2)
    const dataUri = `data:application/json;base64,${Buffer.from(metadataJson).toString('base64')}`

    return jsonResponse({
      success: true,
      uri: dataUri,
      cid: null,
      fallback: true,
      message: 'Pinata not configured, used data URI fallback',
    })
  }

  // Prepare headers based on auth method
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (pinataJwt) {
    headers.Authorization = `Bearer ${pinataJwt}`
  } else if (pinataApiKey && pinataSecretKey) {
    headers.pinata_api_key = pinataApiKey
    headers.pinata_secret_api_key = pinataSecretKey
  }

  // Upload to Pinata
  const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      pinataContent: metadata,
      pinataOptions: {
        cidVersion: 1,
      },
      pinataMetadata: {
        name: `ghostspeak-${Date.now()}.json`,
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[IPFS Upload] Pinata error:', errorText)

    // Fallback to data URI
    const metadataJson = JSON.stringify(metadata, null, 2)
    const dataUri = `data:application/json;base64,${Buffer.from(metadataJson).toString('base64')}`

    return jsonResponse({
      success: true,
      uri: dataUri,
      cid: null,
      fallback: true,
      message: 'Pinata upload failed, used data URI fallback',
    })
  }

  const result = await response.json()
  const ipfsUri = `ipfs://${result.IpfsHash}`
  const pinataGateway =
    process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs'
  const gatewayUrl = `${pinataGateway.replace(/\/ipfs\/?$/, '')}/ipfs/${result.IpfsHash}`

  return jsonResponse({
    success: true,
    uri: ipfsUri,
    cid: result.IpfsHash,
    gatewayUrl,
    fallback: false,
  })
})

export const OPTIONS = handleCORS
