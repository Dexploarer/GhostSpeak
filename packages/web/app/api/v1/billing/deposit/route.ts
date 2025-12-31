/**
 * POST /api/v1/billing/deposit
 *
 * Initiate a USDC deposit to team's prepaid account
 *
 * Requires: X-API-Key header
 * Body: { amount: number, walletAddress: string }
 * Returns: Transaction to sign
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/api/auth'
import { createDepositTransaction, getOrCreateTeamTokenAccount } from '@/lib/b2b-token-accounts'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { address } from '@solana/addresses'

const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: NextRequest) {
  try {
    // Authenticate API key
    const authUser = await authenticateApiKey(request)

    if (!authUser) {
      return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { amount, walletAddress } = body

    // Validate inputs
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount. Must be a positive number.' },
        { status: 400 }
      )
    }

    if (!walletAddress || typeof walletAddress !== 'string') {
      return NextResponse.json(
        { error: 'Invalid walletAddress. Must be a Solana address.' },
        { status: 400 }
      )
    }

    // Get team info
    const teamMembers = await convexClient.query(api.teamMembers.getByUser, {
      userId: authUser.userId as Id<'users'>,
    })

    if (!teamMembers || teamMembers.length === 0) {
      return NextResponse.json({ error: 'User is not part of any team' }, { status: 404 })
    }

    const teamId = teamMembers[0].teamId
    const team = await convexClient.query(api.teams.getById, { teamId })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Determine network
    const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'mainnet' ? 'mainnet' : 'devnet'

    // Get or create team token account
    let tokenAccountAddress: string
    if (team.usdcTokenAccount) {
      tokenAccountAddress = team.usdcTokenAccount
    } else {
      // Create team token account (ATA)
      const teamWalletAddr = address(walletAddress)
      const { tokenAccount, created } = await getOrCreateTeamTokenAccount(teamWalletAddr, network)

      tokenAccountAddress = tokenAccount.toString()

      // Save to Convex if newly created
      if (created) {
        // @ts-expect-error - updateTokenAccount not in generated types, run `bunx convex dev` to regenerate
        await convexClient.mutation(api.teams.updateTokenAccount, {
          teamId,
          usdcTokenAccount: tokenAccountAddress,
        })
      }
    }

    // Create deposit transaction
    const depositTx = await createDepositTransaction(
      address(walletAddress),
      address(tokenAccountAddress),
      amount,
      network
    )

    return NextResponse.json({
      success: true,
      deposit: {
        amount: depositTx.amountUi,
        amountRaw: depositTx.amount.toString(),
        tokenAccount: tokenAccountAddress,
        network,
      },
      transaction: {
        serialized: depositTx.transaction,
        description: `Deposit ${amount} USDC to your team's prepaid account`,
      },
      instructions: [
        'Sign the transaction with your wallet',
        'The USDC will be deposited to your team account',
        'Your API usage will be deducted from this balance',
      ],
    })
  } catch (error) {
    console.error('[API] /api/v1/billing/deposit error:', error)

    return NextResponse.json(
      {
        error: 'Failed to create deposit transaction',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
