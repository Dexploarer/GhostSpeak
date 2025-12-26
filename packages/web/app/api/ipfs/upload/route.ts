/**
 * IPFS Upload API Route
 * 
 * Server-side endpoint for uploading metadata to IPFS via Pinata.
 * This allows client-side components to upload without exposing API keys.
 */

import { NextRequest, NextResponse } from 'next/server'

interface UploadRequest {
  metadata: Record<string, unknown>
}

interface UploadResponse {
  success: boolean
  uri?: string
  cid?: string
  error?: string
}

const PINATA_JWT = process.env.PINATA_JWT

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    const body = await request.json() as UploadRequest
    
    if (!body.metadata || typeof body.metadata !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid metadata' },
        { status: 400 }
      )
    }

    if (!PINATA_JWT) {
      // Fallback to data URI if no Pinata configured
      const metadataJson = JSON.stringify(body.metadata, null, 2)
      const dataUri = `data:application/json;base64,${Buffer.from(metadataJson).toString('base64')}`
      
      return NextResponse.json({
        success: true,
        uri: dataUri,
        cid: 'data-uri-fallback',
      })
    }

    // Upload to Pinata
    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pinataContent: body.metadata,
        pinataOptions: { cidVersion: 1 },
        pinataMetadata: {
          name: body.metadata.name || 'ghostspeak-metadata',
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Pinata upload failed:', errorText)
      return NextResponse.json(
        { success: false, error: 'IPFS upload failed' },
        { status: 500 }
      )
    }

    const result = await response.json()
    const cid = result.IpfsHash
    
    return NextResponse.json({
      success: true,
      uri: `ipfs://${cid}`,
      cid,
    })
  } catch (error) {
    console.error('IPFS upload error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
