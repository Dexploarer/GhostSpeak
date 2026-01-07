/**
 * Quick USDC Balance Check for Caisper
 */

const CAISPER_WALLET = 'CjNXSBUPTM3aAuqLB2KWBN66VTmnh5o1sYeQW8YaQimc'
const USDC_MAINNET = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const USDC_DEVNET = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'

async function rpcCall(url: string, method: string, params: any[]) {
  const res = await fetch(url, {
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
  if (json.error) throw new Error(JSON.stringify(json.error))
  return json.result
}

async function checkBalance(rpcUrl: string, network: string, mint: string) {
  console.log(`\nChecking ${network}...`)
  try {
    const result = await rpcCall(rpcUrl, 'getTokenAccountsByOwner', [CAISPER_WALLET])
    const usdcAccounts = result.value?.filter(
      (acc: any) => acc.account.data.parsed.info.mint === mint
    )

    if (usdcAccounts && usdcAccounts.length > 0) {
      const info = usdcAccounts[0].account.data.parsed.info
      const balance = Number(info.tokenAmount.amount) / 10 ** info.tokenAmount.decimals
      console.log(`  ✅ Balance: ${balance.toFixed(2)} USDC`)
      return balance
    }
    console.log(`  ⚠️  No USDC account found`)
    return 0
  } catch (e) {
    console.log(`  ❌ Error: ${e}`)
    return 0
  }
}

console.log('🔐 Caisper USDC Balance Check\n')
console.log(`Wallet: ${CAISPER_WALLET}\n`)

;(
  async () => {
    const mainnet = await checkBalance(
  'https://api.mainnet-beta.solana.com',
  'mainnet',
  USDC_MAINNET
)

const devnet = await checkBalance(
  'https://api.devnet.solana.com',
  'devnet',
  USDC_DEVNET
)

console.log('\nSummary:')
console.log(`  Mainnet: ${mainnet.toFixed(2)} USDC`)
console.log(`  Devnet: ${devnet.toFixed(2)} USDC`)

if (mainnet === 0 && devnet === 0) {
  console.log('\n❌ No USDC balance!')
  console.log('💡 x402 payments require USDC tokens.')
  console.log('\nTo fund:')
  console.log('  1. Mainnet: Send USDC to the wallet address')
  console.log('  2. Devnet: Use faucet at https://faucet.solana.com')
} else {
  console.log('\n✅ Caisper has USDC - x402 payments ready!')
}
