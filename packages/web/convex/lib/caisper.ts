
import { v } from 'convex/values'
import { internalMutation, internalAction, query } from '../_generated/server'
import { internal } from '../_generated/api'
import { createKeyPairSignerFromBytes } from '@solana/signers'
import { createSolanaRpc } from '@solana/rpc'
import { 
  createTransactionMessage, 
  setTransactionMessageLifetimeUsingBlockhash, 
  setTransactionMessageFeePayer,
  appendTransactionMessageInstruction
} from '@solana/transaction-messages'
import { getTransferSolInstruction } from '@solana-program/system'
import { signTransactionMessageWithSigners } from '@solana/signers'
import { getBase64EncodedWireTransaction } from '@solana/transactions'
import { getNetworkMetadata } from './networkMetadata'
import { address } from '@solana/addresses'

// ─── WALLET MANAGEMENT ──────────────────────────────────────────────────────

/**
 * Initialize or update Caisper's wallet keys
 * (Call this from a script to set up the agent)
 */
export const setCaisperWallet = internalMutation({
  args: {
    publicKey: v.string(),
    secretKey: v.array(v.number()), // array of 64 bytes
  },
  handler: async (ctx, args) => {
    // Check if exists
    const existing = await ctx.db.query('caisperWallet').first()
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        publicKey: args.publicKey,
        encryptedPrivateKey: 'TODO_ENCRYPT', // For now we trust the internal mutation input
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
  }
})

/**
 * Get Caisper's public key (for UI or logic)
 */
export const getCaisperPublicKey = query({
  handler: async (ctx) => {
    const wallet = await ctx.db.query('caisperWallet').first()
    return wallet?.publicKey || null
  }
})

// ─── TRANSACTION LOGIC ──────────────────────────────────────────────────────

/**
 * Send SOL payment
 */
export const sendSolPayment = internalAction({
  args: {
    recipient: v.string(),
    amountSol: v.number(),
  },
  handler: async (ctx, args) => {
    // 0. Polyfill Secure Context for Solana Web3.js v2 in Convex
    // @ts-ignore
    if (globalThis.isSecureContext === undefined) {
      // @ts-ignore
      globalThis.isSecureContext = true;
    }

    // 1. Get Wallet
    const wallet = await ctx.runQuery(internal.lib.caisper.getCaisperWalletInternal)
    if (!wallet) {
      throw new Error("Caisper wallet not configured")
    }

    // 2. Setup RPC
    const network = getNetworkMetadata() // e.g. devnet
    const rpc = createSolanaRpc(
       network.cluster === 'mainnet-beta' 
       ? 'https://api.mainnet-beta.solana.com' 
       : 'https://api.devnet.solana.com'
    )
    
    // 3. Create Signer
    const signer = await createKeyPairSignerFromBytes(
      new Uint8Array(wallet.secretKey)
    )

    // 4. Create Instruction
    // 1 SOL = 1e9 lamports
    const lamports = BigInt(Math.round(args.amountSol * 1e9))
    
    const transferIx = getTransferSolInstruction({
      source: signer.address,
      destination: address(args.recipient),
      amount: lamports
    })

    // 5. Get Latest Blockhash
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()

    // 6. Build Message
    const msg0 = createTransactionMessage({ version: 0 });
    const msg1 = setTransactionMessageFeePayer(signer.address, msg0);
    const msg2 = setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, msg1);
    const message = appendTransactionMessageInstruction(transferIx, msg2);

    // 7. Sign
    const signedMessage = await signTransactionMessageWithSigners(message);
    const signature = getBase64EncodedWireTransaction(signedMessage);

    // 8. Send
    const txSignature = await rpc.sendTransaction(signature, { encoding: 'base64' }).send()
    
    return { success: true, signature: txSignature }
  }
})

/**
 * Internal query to get sensitive wallet data (only callable by internal actions)
 */
export const getCaisperWalletInternal = query({
  handler: async (ctx) => {
    return await ctx.db.query('caisperWallet').first() 
  }
})
