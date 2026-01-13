
import { JupiterUltraClient, analyzeTokenRisk, TokenInfo } from '../lib/jupiter-ultra'

async function runVerification() {
    const targetWallet = 'DwQDiEQzk5QAdYvA8aBcf9txLCUhV1MG5zzoDcDLnEqc'
    console.log(`\n🕵️  Verifying Token Scanner for Wallet: ${targetWallet}`)
    console.log('='.repeat(60))

    try {
        const client = new JupiterUltraClient()

        // 1. Get Holdings
        console.log('\n📡 Fetching Wallet Holdings...')
        const holdings = await client.getWalletHoldings(targetWallet)
        console.log(`✅ Holdings found: ${Object.keys(holdings.tokens).length} token types`)
        console.log(`💰 SOL Balance: ${holdings.uiAmount} SOL`)

        if (!holdings || !holdings.tokens || Object.keys(holdings.tokens).length === 0) {
            console.log('⚠️  Wallet is empty.')
            return
        }

        // 2. Identify tokens
        const mints = Object.keys(holdings.tokens)
        const topMints = mints.slice(0, 20)
        console.log(`🔍 Analyzing top ${topMints.length} assets...`)

        // 3. Fetch Info & Shield
        const [tokenInfos, shieldData] = await Promise.all([
            client.searchTokens(topMints.join(',')),
            client.getTokenShield(topMints),
        ])

        const tokenMap = new Map<string, TokenInfo>()
        tokenInfos.forEach((t: any) => tokenMap.set(t.id, t))

        // 4. Analyze Risks
        let totalValue = holdings.uiAmount // Start with SOL value? (simplified, technically need SQL price)
        let riskyTokenCount = 0
        let verifiedTokenCount = 0
        let exploitScore = 0

        console.log('\n📊 Detailed Token Analysis:')
        console.log('-'.repeat(60))

        const analyzedTokens = topMints.map((mint: any) => {
            const token = tokenMap.get(mint)
            const account = holdings.tokens[mint][0]
            const warnings = shieldData.warnings[mint] || []

            let risk = { riskScore: 50, flags: { red: [], yellow: [], green: [] } as any }

            if (token) {
                risk = analyzeTokenRisk(token, warnings)
                if (token.isVerified) verifiedTokenCount++

                // Value calc
                if (token.usdPrice) {
                    totalValue += account.uiAmount * token.usdPrice
                }
            } else {
                risk.riskScore = 40
                risk.flags.yellow.push('Unknown/Unindexed Token')
            }

            const safetyScore = risk.riskScore
            const dangerScore = 100 - safetyScore

            if (dangerScore > 60) riskyTokenCount++
            exploitScore += dangerScore

            // Log details for each token
            console.log(`\n🪙  ${token?.symbol || 'UNKNOWN'} (${mint.slice(0, 8)}...)`)
            console.log(`   Balance: ${account.uiAmount}`)
            console.log(`   Value: $${(token?.usdPrice ? account.uiAmount * token.usdPrice : 0).toFixed(2)}`)
            console.log(`   Detailed Safety Score: ${safetyScore}/100`)
            if (risk.flags.red.length > 0) console.log(`   🚩 Red Flags: ${risk.flags.red.join(', ')}`)
            if (risk.flags.yellow.length > 0) console.log(`   ⚠️  Yellow Flags: ${risk.flags.yellow.join(', ')}`)
            if (risk.flags.green.length > 0) console.log(`   ✅ Green Flags: ${risk.flags.green.join(', ')}`)

            return {
                mint,
                symbol: token?.symbol || 'UNKNOWN',
                safetyScore
            }
        })

        const avgExploitScore = analyzedTokens.length > 0 ? exploitScore / analyzedTokens.length : 0

        console.log('\n' + '='.repeat(60))
        console.log('🏆 FINAL VERDICT')
        console.log('='.repeat(60))
        console.log(`Total Portfolio Value: ~$${totalValue.toFixed(2)}`)
        console.log(`Exploitation Risk Score: ${avgExploitScore.toFixed(0)}/100 (Lower is Better)`)
        console.log(`Verified Assets: ${verifiedTokenCount}/${analyzedTokens.length}`)
        console.log(`Risky Assets: ${riskyTokenCount}`)

        if (avgExploitScore > 70) console.log('\n🚨 RESULT: HIGH RISK WALLET')
        else if (avgExploitScore > 40) console.log('\n⚠️  RESULT: MODERATE RISK WALLET')
        else console.log('\n✅ RESULT: CLEAN WALLET')

    } catch (error) {
        console.error('❌ Verification Failed:', error)
    }
}

runVerification()
