/**
 * Register Caisper Agent with New Wallet
 * 
 * This script registers Caisper as a discovered agent using the NEW wallet address
 * from environment variables. NO PRIVATE KEYS ARE USED OR EXPOSED.
 * 
 * Usage: bun scripts/register-caisper.ts
 */

import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api'

async function main() {
    // Use environment variable - NO hardcoded addresses
    const caisperAddress = process.env.CAISPER_WALLET_ADDRESS
    const adminAddress = process.env.ADMIN_WALLET_ADDRESS

    if (!caisperAddress) {
        console.error('❌ CAISPER_WALLET_ADDRESS not set in environment')
        process.exit(1)
    }

    console.log('🔐 Security Check: Using environment variables only (no keys exposed)')
    console.log('')
    console.log('📋 Registration Details:')
    console.log(`   Caisper Address: ${caisperAddress}`)
    console.log(`   Admin Address: ${adminAddress || 'Not set'}`)
    console.log('')

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
    if (!convexUrl) {
        console.error('❌ NEXT_PUBLIC_CONVEX_URL not set')
        process.exit(1)
    }

    const convex = new ConvexHttpClient(convexUrl)

    try {
        // Step 1: Check if old Caisper exists and remove it
        console.log('🔍 Checking for existing Caisper records...')

        const oldCaisperAddress = 'CjNXSBUPTM3aAuqLB2KWBN66VTmnh5o1sYeQW8YaQimc'
        const oldAgent = await convex.query(api.ghostDiscovery.getDiscoveredAgent, {
            ghostAddress: oldCaisperAddress
        })

        if (oldAgent) {
            console.log(`   Found old Caisper record: ${oldAgent._id}`)
            console.log('   ⚠️  Old record will remain for historical purposes')
            console.log('   (Manual deletion via Convex dashboard if needed)')
        } else {
            console.log('   No old Caisper record found')
        }

        // Step 2: Check if new Caisper already exists
        console.log('')
        console.log('🔍 Checking for new Caisper record...')

        const newAgent = await convex.query(api.ghostDiscovery.getDiscoveredAgent, {
            ghostAddress: caisperAddress
        })

        if (newAgent) {
            console.log(`   ✅ New Caisper already registered: ${newAgent._id}`)
            console.log(`   Status: ${newAgent.status}`)
            console.log(`   Created: ${new Date(newAgent.createdAt || 0).toISOString()}`)
            return
        }

        // Step 3: Register new Caisper using bulk import (public mutation)
        console.log('')
        console.log('📝 Registering new Caisper agent...')

        const result = await convex.mutation(api.ghostDiscovery.bulkImportDiscoveredAgents, {
            agents: [{
                ghostAddress: caisperAddress,
                firstTxSignature: `caisper_registration_${Date.now()}`,
                firstSeenTimestamp: Date.now(),
                discoverySource: 'manual_registration',
                slot: 0,
            }]
        })

        console.log(`   ✅ Registered! Imported: ${result.imported}, Skipped: ${result.skipped}`)

        // Step 4: Update metadata
        console.log('')
        console.log('📝 Updating Caisper metadata...')

        // Note: updateAgentMetadata requires callerWallet to match claimedBy
        // Since this is a new registration, we need to claim it first

        const claimResult = await convex.mutation(api.ghostDiscovery.claimAgent, {
            ghostAddress: caisperAddress,
            claimedBy: adminAddress || caisperAddress, // Admin claims it, or self-claim
            claimTxSignature: `caisper_claim_${Date.now()}`,
        })

        console.log(`   ✅ Claimed by: ${adminAddress || caisperAddress}`)
        console.log(`   Credential Issued: ${claimResult.credentialIssued}`)
        if (claimResult.credentialId) {
            console.log(`   Credential ID: ${claimResult.credentialId}`)
        }

        // Step 5: Update agent metadata
        const metadataResult = await convex.mutation(api.ghostDiscovery.updateAgentMetadata, {
            ghostAddress: caisperAddress,
            callerWallet: adminAddress || caisperAddress,
            name: 'Caisper',
            description: 'GhostSpeak\'s AI-powered credential verification and reputation analysis agent. Your blockchain trust detective.',
            x402Enabled: true,
        })

        console.log(`   ✅ Metadata updated: ${metadataResult.updatedFields.join(', ')}`)

        console.log('')
        console.log('🎉 Caisper registration complete!')
        console.log('')
        console.log('Next steps:')
        console.log('1. Fund the wallet with devnet SOL: solana airdrop 2 ' + caisperAddress + ' --url devnet')
        console.log('2. Restart the dev server to use new wallet')

    } catch (error) {
        console.error('❌ Registration failed:', error)
        process.exit(1)
    }
}

main()
