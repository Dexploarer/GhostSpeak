/**
 * Interactive Airdrop Command (Ink UI)
 * Beautiful animated interface for claiming devnet GHOST tokens
 */

import React, { useState, useEffect } from 'react'
import { Box, Text, useApp } from 'ink'
import Spinner from 'ink-spinner'
import Gradient from 'ink-gradient'
import { Layout } from '../components/Layout.js'
import { InfoRow } from '../components/InfoRow.js'
import { StatusBadge } from '../components/StatusBadge.js'
import { createCustomClient } from '../../core/solana-client.js'
import { address } from '@solana/addresses'
import { createKeyPairSignerFromBytes } from '@solana/signers'
import {
  getCreateAssociatedTokenInstructionAsync,
  getTransferInstruction,
  fetchToken,
  findAssociatedTokenPda,
  TOKEN_PROGRAM_ADDRESS,
} from '@solana-program/token'
import {
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  pipe,
  signTransactionMessageWithSigners,
  sendAndConfirmTransactionFactory,
} from '@solana/kit'
import { readFileSync } from 'fs'

const DEVNET_GHOST_MINT = 'BV4uhhMJ84zjwRomS15JMH5wdXVrMP8o9E1URS4xtYoh'
const AIRDROP_AMOUNT = 10000
const DECIMALS = 6

interface AirdropProps {
  recipient?: string
}

type Stage =
  | 'init'
  | 'checking'
  | 'transferring'
  | 'success'
  | 'error'
  | 'rate_limited'

export const Airdrop: React.FC<AirdropProps> = ({ recipient }) => {
  const { exit } = useApp()
  const [stage, setStage] = useState<Stage>('init')
  const [walletAddress, setWalletAddress] = useState<string>('')
  const [balance, setBalance] = useState<number>(0)
  const [signature, setSignature] = useState<string>('')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    performAirdrop()
  }, [])

  const performAirdrop = async () => {
    try {
      setStage('checking')

      // Load wallet
      const walletPath = process.env.HOME + '/.config/solana/id.json'
      const secretKeyBytes = new Uint8Array(JSON.parse(readFileSync(walletPath, 'utf-8')))
      const wallet = await createKeyPairSignerFromBytes(secretKeyBytes)

      const recipientAddress = recipient
        ? address(recipient)
        : wallet.address

      setWalletAddress(recipientAddress)

      // Connect using Gill
      const solanaClient = createCustomClient('https://api.devnet.solana.com')
      const rpc = solanaClient.rpc
      const ghostMintAddress = address(DEVNET_GHOST_MINT)

      // Get token accounts
      const [faucetTokenAccount] = await findAssociatedTokenPda({
        mint: ghostMintAddress,
        owner: wallet.address,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
      })

      const [recipientTokenAccount] = await findAssociatedTokenPda({
        mint: ghostMintAddress,
        owner: recipientAddress,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
      })

      setStage('transferring')

      // Build transaction
      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()

      // Create ATA instruction (idempotent - will do nothing if already exists)
      const createAtaInstruction = await getCreateAssociatedTokenInstructionAsync({
        payer: wallet,
        mint: ghostMintAddress,
        owner: recipientAddress,
        ata: recipientTokenAccount,
      })

      // Create transfer instruction
      const amountWithDecimals = BigInt(AIRDROP_AMOUNT) * BigInt(10 ** DECIMALS)
      const transferInstruction = getTransferInstruction({
        source: faucetTokenAccount,
        destination: recipientTokenAccount,
        authority: wallet,
        amount: amountWithDecimals,
      })

      // Build and sign transaction using modern v5 patterns
      const transactionMessage = await pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayerSigner(wallet, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstruction(createAtaInstruction, tx),
        (tx) => appendTransactionMessageInstruction(transferInstruction, tx)
      )

      // Sign transaction
      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)

      // Send and confirm using factory pattern (without subscriptions for now)
      const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
        rpc: rpc as Parameters<typeof sendAndConfirmTransactionFactory>[0]['rpc'],
        rpcSubscriptions: undefined as any // Subscriptions not currently available
      })

      await sendAndConfirmTransaction(signedTransaction as Parameters<typeof sendAndConfirmTransaction>[0], {
        commitment: 'confirmed'
      })

      // Extract signature from signed transaction
      const sig = Object.keys((signedTransaction as any).signatures || {})[0] || ''
      setSignature(sig)

      // Get new balance
      const accountInfo = await fetchToken(rpc, recipientTokenAccount)
      const newBalance = Number(accountInfo.data.amount) / 10 ** DECIMALS

      setBalance(newBalance)
      setStage('success')

      // Auto-exit after 3 seconds
      setTimeout(() => exit(), 3000)
    } catch (err: any) {
      setError(err.message)
      setStage('error')
      setTimeout(() => exit(), 3000)
    }
  }

  const renderStage = () => {
    switch (stage) {
      case 'init':
      case 'checking':
        return (
          <Box flexDirection="column" gap={1}>
            <Box>
              <Spinner type="dots" />
              <Text> Checking rate limits...</Text>
            </Box>
            {walletAddress && <InfoRow label="Recipient" value={walletAddress} />}
          </Box>
        )

      case 'transferring':
        return (
          <Box flexDirection="column" gap={1}>
            <Box>
              <Spinner type="dots" />
              <Text> Transferring tokens...</Text>
            </Box>
            <InfoRow label="Amount" value={`${AIRDROP_AMOUNT.toLocaleString()} GHOST`} color="yellow" />
            <InfoRow label="Recipient" value={walletAddress} />
          </Box>
        )

      case 'success':
        return (
          <Box flexDirection="column" gap={1}>
            <StatusBadge status="success" text="Airdrop successful!" />
            <Box marginTop={1} flexDirection="column">
              <InfoRow
                label="Amount"
                value={`${AIRDROP_AMOUNT.toLocaleString()} GHOST`}
                color="green"
              />
              <InfoRow label="New Balance" value={`${balance.toLocaleString()} GHOST`} color="green" />
              <InfoRow label="Recipient" value={walletAddress} />
            </Box>
            <Box marginTop={1}>
              <Text dimColor>Transaction: </Text>
              <Text color="cyan">{signature.slice(0, 40)}...</Text>
            </Box>
            <Box marginTop={1}>
              <Text bold color="greenBright">Tokens delivered! Check your wallet!</Text>
            </Box>
          </Box>
        )

      case 'rate_limited':
        return (
          <Box flexDirection="column" gap={1}>
            <StatusBadge status="warning" text="Rate limit exceeded" />
            <Text>You can claim again in 24 hours.</Text>
          </Box>
        )

      case 'error':
        return (
          <Box flexDirection="column" gap={1}>
            <StatusBadge status="error" text="Airdrop failed" />
            <Text color="red">{error}</Text>
          </Box>
        )
    }
  }

  return (
    <Layout title="🪂 Devnet GHOST Airdrop" showFooter={stage === 'success'}>
      {renderStage()}
    </Layout>
  )
}
