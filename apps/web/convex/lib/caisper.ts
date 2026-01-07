import { v } from 'convex/values'
import { internalMutation, internalAction, query, internalQuery } from '../_generated/server'
import { internal } from '../_generated/api'
import {
  createTransactionMessage,
  setTransactionMessageLifetimeUsingBlockhash,
  setTransactionMessageFeePayer,
  appendTransactionMessageInstruction,
  compileTransactionMessage,
  getCompiledTransactionMessageEncoder,
} from '@solana/transaction-messages'
import { getTransferSolInstruction } from '@solana-program/system'
import { getNetworkMetadata } from './networkMetadata'
import { address, type Address } from '@solana/addresses'
import nacl from 'tweetnacl'

// ─── WALLET MANAGEMENT ──────────────────────────────────────────────────────

export const setCaisperWallet = internalMutation({
  args: {
    publicKey: v.string(),
    secretKey: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('caisperWallet').first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        publicKey: args.publicKey,
        encryptedPrivateKey: 'TODO_ENCRYPT',
        secretKey: args.secretKey,
        updatedAt: Date.now(),
      })
    } else {
      await ctx.db.insert('caisperWallet', {
        publicKey: args.publicKey,
        encryptedPrivateKey: 'TODO_ENCRYPT',
        secretKey: args.secretKey,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    }
  },
})

export const getCaisperPublicKey = query({
  handler: async (ctx) => {
    const wallet = await ctx.db.query('caisperWallet').first()
    return wallet?.publicKey || null
  },
})

// ─── DIRECT RPC HELPERS ─────────────────────────────────────────────────────

async function jsonRpc(rpcUrl: string, method: string, params: unknown[]) {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
  })
  const json = await res.json()
  if (json.error) throw new Error(`RPC Error: ${JSON.stringify(json.error)}`)
  return json.result
}

// ─── TRANSACTION LOGIC ──────────────────────────────────────────────────────

export const sendSolPayment = internalAction({
  args: {
    recipient: v.string(),
    amountSol: v.number(),
  },
  handler: async (ctx, args) => {
    // 1. Get Wallet
    const wallet = await ctx.runQuery(internal.lib.caisper.getCaisperWalletInternal)
    if (!wallet) {
      throw new Error('Caisper wallet not configured')
    }

    // 2. Setup RPC URL (using environment variable with mainnet fallback)
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
    console.log(`[Caisper] Using RPC URL: ${rpcUrl}`)

    // 3. Key material
    const secretKeyBytes = new Uint8Array(wallet.secretKey)
    const payerAddress = address(wallet.publicKey) as Address

    // 4. Create Instruction
    const lamports = BigInt(Math.round(args.amountSol * 1e9))
    const transferIx = getTransferSolInstruction({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      source: payerAddress as any,
      destination: address(args.recipient),
      amount: lamports,
    })

    // 5. Get Latest Blockhash via direct RPC
    const blockhashResult = await jsonRpc(rpcUrl, 'getLatestBlockhash', [
      { commitment: 'finalized' },
    ])
    const latestBlockhash = {
      blockhash: blockhashResult.value.blockhash as string,
      lastValidBlockHeight: BigInt(blockhashResult.value.lastValidBlockHeight),
    }

    // 6. Build Message
    const msg0 = createTransactionMessage({ version: 0 })
    const msg1 = setTransactionMessageFeePayer(payerAddress, msg0)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msg2 = setTransactionMessageLifetimeUsingBlockhash(latestBlockhash as any, msg1)
    const message = appendTransactionMessageInstruction(transferIx, msg2)

    // 7. Compile and serialize message to bytes
    const compiledMessage = compileTransactionMessage(message)
    const messageEncoder = getCompiledTransactionMessageEncoder()
    const messageBytes = messageEncoder.encode(compiledMessage)

    // 8. Sign with tweetnacl
    const signature = nacl.sign.detached(new Uint8Array(messageBytes), secretKeyBytes)

    // 9. Construct signed transaction wire format
    // [compact-u16 sig count][sig(s)][message]
    const signedTx = new Uint8Array(1 + 64 + messageBytes.length)
    signedTx[0] = 1 // 1 signature (compact-u16 encoding for 1)
    signedTx.set(signature, 1)
    signedTx.set(messageBytes, 1 + 64)

    // 10. Send via direct RPC (use btoa for base64, no Node Buffer)
    const base64Tx = btoa(String.fromCharCode(...signedTx))
    const txSignature = await jsonRpc(rpcUrl, 'sendTransaction', [
      base64Tx,
      { encoding: 'base64', preflightCommitment: 'confirmed' },
    ])

    console.log(`[Caisper] Payment sent! Sig: ${txSignature}`)
    return { success: true, signature: txSignature as string }
  },
})

export const getCaisperWalletInternal = internalQuery({
  handler: async (ctx) => {
    return await ctx.db.query('caisperWallet').first()
  },
})
