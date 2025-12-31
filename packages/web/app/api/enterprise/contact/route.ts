/**
 * Enterprise Contact Form API
 *
 * Handles enterprise inquiry submissions.
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { companyName, contactName, email, phone, companySize, useCase, message } = body

    // Validate required fields
    if (!companyName || !contactName || !email || !companySize || !useCase) {
      return NextResponse.json(
        { error: 'Missing required fields', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // TODO: Send to sales email or CRM
    // For now, just log it
    console.log('[Enterprise Contact] New inquiry:', {
      companyName,
      contactName,
      email,
      phone,
      companySize,
      useCase,
      message,
      timestamp: new Date().toISOString(),
    })

    // In production, you would:
    // 1. Send email to sales team
    // 2. Add to CRM (Salesforce, HubSpot, etc.)
    // 3. Trigger Slack notification
    // 4. Auto-create enterprise API key tier

    return NextResponse.json({
      success: true,
      message: 'Thank you for your interest! Our team will contact you within 24 hours.',
    })
  } catch (error: any) {
    console.error('[Enterprise Contact] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
