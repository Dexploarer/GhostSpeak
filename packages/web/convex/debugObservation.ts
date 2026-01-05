
import { v } from 'convex/values'
import { internalAction } from './_generated/server'
import { internal } from './_generated/api'

export const debugRun = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log('=== START DEBUG OBSERVATION RUN ===')

    // 0. SEED WALLET (Temporary Fix from .env.local)
    const secretKey = [114,134,95,219,29,189,88,124,77,192,107,166,121,18,105,194,216,93,89,17,141,233,2,159,67,31,69,245,83,213,222,151,174,75,73,203,55,63,108,34,199,25,195,177,46,129,232,10,115,134,81,155,57,1,35,63,31,152,119,122,19,92,77,39]
    const publicKey = "CjNXSBUPTM3aAuqLB2KWBN66VTmnh5o1sYeQW8YaQimc"
    
    await ctx.runMutation(internal.lib.caisper.setCaisperWallet, {
        publicKey,
        secretKey
    })
    console.log('[Debug] Wallet seeded.')

    // 1. Check Wallet
    const wallet = await ctx.runQuery(internal.lib.caisper.getCaisperWalletInternal)
    if (wallet) {
        console.log(`[Debug] Wallet configured: ${wallet.publicKey}`)
    } else {
        console.error('[Debug] CAISPER WALLET NOT CONFIGURED! Payment will fail.')
    }

    // 2. Define target
    const url = 'https://x402factory.ai/solana/note'
    console.log(`[Debug] Fetching ${url}...`)

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ message: "Debug Probe" }),
            redirect: 'manual'
        })

        console.log(`[Debug] Status: ${response.status}`)
        
        const authHeader = response.headers.get('www-authenticate') || ''
        console.log(`[Debug] Auth Header: "${authHeader}"`)

        if (response.status === 402) {
            console.log('[Debug] 402 Detailed Parsing...')
            
            let recipient = ''
            let amount = 0
            let token = 'SOL' // Assume SOL unless specified otherwise

            if (authHeader.includes('recipient=')) {
                console.log('[Debug] Parsing from Header...')
                const match = authHeader.match(/recipient="?([a-zA-Z0-9]+)"?/)
                if (match) recipient = match[1]
                
                const amountMatch = authHeader.match(/amount="?(\d+)"?/)
                if (amountMatch) amount = parseInt(amountMatch[1])
            } else {
                console.log('[Debug] Parsing from Body...')
                 try {
                     const json = await response.json()
                     // console.log('[Debug] Body JSON:', JSON.stringify(json, null, 2))
                     
                     if (json.recipient) {
                         recipient = json.recipient
                         if (json.amount) amount = json.amount
                         if (json.token) token = json.token
                     } else if (json.accepts && Array.isArray(json.accepts) && json.accepts.length > 0) {
                         // Parse x402 style accepts array
                         // Find solana network offer
                         const offer = json.accepts.find((a: any) => a.network === 'solana') || json.accepts[0]
                         if (offer) {
                             recipient = offer.payTo
                             amount = parseInt(offer.maxAmountRequired || '0')
                             // TODO: Handle Asset/Token check. x402factory uses USDC.
                             // But let's see if we can extract it.
                             if (offer.asset) token = offer.asset
                         }
                     }

                 } catch (e) {
                     console.error('[Debug] Failed to parse body:', e)
                 }
            }

            console.log(`[Debug] Parsed Result: Recipient=${recipient}, Amount=${amount}, Token=${token}`)
            
            // Try to PAY if parsed
            if (recipient && amount > 0) {
                 console.log(`[Debug] Attempting Payment: ${amount} ${token} to ${recipient}`)
                 
                 // If token is NOT 'SOL' and NOT 'USDC-mock' (or whatever), warn.
                 // Caisper assumes 'SOL' in sendSolPayment.
                 // If the amount is small (1000 lamports = 0.000001 SOL), let's try sending SOL? 
                 // But wait, "1000" in x402 usually means units of the ASSET.
                 // USDC has 6 decimals. 1000 = 0.001 USDC.
                 // Sending 1000 lamports is 0.000001 SOL.
                 // The Recipient expects USDC. sending SOL might fail or be lost.
                 // BUT maybe Caisper needs a `sendSplPayment`?
                 
                 if (token !== 'SOL') {
                     console.warn('[Debug] WARNING: Token is ' + token + '. Caisper only supports SOL native currently (via sendSolPayment). Payment might fail or be rejected.')
                 }

                 // Override amountSol for test: 
                 // If it wants 1000 units of USDC, we need to send equivalent Value? No.
                 // We need to send USDC.
                 // But let's try sending standard SOL amount for now just to trigger the flow?
                 // Recipient wallet handles both?
                 
                 // Let's call sendSolPayment just to test the mechanism.
                 // 1000 lamports is safely small.
                 // sendSolPayment takes amountSol. 1000 / 1e9 = 0.000001 SOL.
                 const amountSol = amount / 1e9 

                 const payResult = await ctx.runAction(internal.lib.caisper.sendSolPayment, {
                   recipient,
                   amountSol: 0.00001, // Mock small amount test
                 })
                 
                 if (payResult.success) {
                     console.log(`[Debug] Payment SUCCESS! Sig: ${payResult.signature}`)
                 } else {
                     console.log(`[Debug] Payment FAILED.`)
                 }
            } else {
                console.log('[Debug] Could not parse payment details.')
            }

        } else {
            console.log('[Debug] Not a 402 response.')
        }

    } catch (e: any) {
        console.error('[Debug] Fetch Failed:', e)
    }

    console.log('=== END DEBUG OBSERVATION RUN ===')
  }
})
