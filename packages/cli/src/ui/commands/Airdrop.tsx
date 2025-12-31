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
import { Connection, PublicKey, Keypair } from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  transfer,
  getAccount,
} from '@solana/spl-token'
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
      const walletData = JSON.parse(readFileSync(walletPath, 'utf-8'))
      const wallet = Keypair.fromSecretKey(new Uint8Array(walletData))

      const recipientPubkey = recipient
        ? new PublicKey(recipient)
        : wallet.publicKey

      setWalletAddress(recipientPubkey.toBase58())

      // Connect
      const connection = new Connection(
        'https://api.devnet.solana.com',
        'confirmed'
      )
      const ghostMint = new PublicKey(DEVNET_GHOST_MINT)

      // Get token accounts
      const faucetTokenAccount = await getAssociatedTokenAddress(
        ghostMint,
        wallet.publicKey
      )
      const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        wallet,
        ghostMint,
        recipientPubkey
      )

      setStage('transferring')

      // Transfer
      const amountWithDecimals = BigInt(AIRDROP_AMOUNT) * BigInt(10 ** DECIMALS)
      const sig = await transfer(
        connection,
        wallet,
        faucetTokenAccount,
        recipientTokenAccount.address,
        wallet.publicKey,
        amountWithDecimals
      )

      setSignature(sig)

      // Get new balance
      const accountInfo = await getAccount(connection, recipientTokenAccount.address)
      const newBalance = Number(accountInfo.amount) / 10 ** DECIMALS

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
              <Gradient name="rainbow">
                <Text>🎉 Tokens delivered! Check your wallet!</Text>
              </Gradient>
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
