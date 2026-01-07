/**
 * Evaluate Agent Tokens Action
 *
 * Checks what tokens an agent holds and analyzes them for scam/exploitation risks
 * using Jupiter Ultra API (Tokens V2 + Shield + Holdings)
 */

import type { Action, IAgentRuntime, Memory, State } from '@elizaos/core'
import { JupiterUltraClient, analyzeTokenRisk, TokenInfo } from '@/lib/jupiter-ultra'

export const evaluateAgentTokensAction: Action = {
  name: 'EVALUATE_AGENT_TOKENS',
  description:
    "Analyze an agent's token holdings to detect potential risks, scams, or exploitation patterns.",

  // Validate: Trigger when asking about agent's tokens, portfolio, or specific financial evaluation
  validate: async (_runtime: IAgentRuntime, message: Memory, _state?: State) => {
    const text = (message.content.text || '').toLowerCase()

    // Must have a Solana address (or refer to "this agent" in context, but sticking to address extraction for safety)
    // Actually, trust assessment often works with "is this agent legit", so we should check for address + keywords
    const hasAddress = /[A-HJ-NP-Za-km-z1-9]{32,44}/.test(message.content.text || '')

    const keywords = [
      'what tokens',
      'holdings',
      'portfolio',
      'evaluate tokens',
      'token analysis',
      'assets',
      'what does it hold',
      'scam tokens',
      'risky tokens',
      'exploitation',
      'making money off',
      'rug pull',
    ]

    return hasAddress && keywords.some((k) => text.includes(k))
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: Record<string, unknown>,
    callback?: (response: any) => Promise<any[]>
  ) => {
    try {
      const text = message.content.text || ''

      // Extract agent address
      const addressMatch = text.match(/([A-HJ-NP-Za-km-z1-9]{32,44})/)
      const agentAddress = addressMatch ? addressMatch[1] : null

      if (!agentAddress) {
        if (callback)
          await callback({ text: 'I need a wallet address to inspect the token portfolio. 🧐' })
        return { success: false, error: 'No address found' }
      }

      const client = new JupiterUltraClient()

      // 1. Get Holdings
      const holdings = await client.getWalletHoldings(agentAddress)

      if (!holdings || !holdings.tokens || Object.keys(holdings.tokens).length === 0) {
        if (callback)
          await callback({
            text: `I checked wallet \`${agentAddress.slice(0, 8)}...\`, but it seems empty or active only in SOL. No other tokens found. 🧹`,
          })
        return { success: true, data: { holdingsCount: 0 } }
      }

      // 2. Identify tokens to analyze (get mints)
      const mints = Object.keys(holdings.tokens)
      const topMints = mints.slice(0, 20) // Limit to top 20 to avoid rate limits/spam

      // 3. Fetch Token Info & Shield Warnings in parallel
      const [tokenInfos, shieldData] = await Promise.all([
        // Search one by one or batch if supported? Search is usually one query string.
        // The search endpoint supports comma-separated mints!
        client.searchTokens(topMints.join(',')),
        client.getTokenShield(topMints),
      ])

      // Map results for easy lookup
      const tokenMap = new Map<string, TokenInfo>()
      tokenInfos.forEach((t) => tokenMap.set(t.id, t))

      // 4. Analyze Risks
      let totalValue = holdings.uiAmount // Start with SOL
      let riskyTokenCount = 0
      let verifiedTokenCount = 0
      let exploitScore = 0 // 0 = Good, 100 = BAD

      const analyzedTokens = topMints.map((mint) => {
        const token = tokenMap.get(mint)
        const account = holdings.tokens[mint][0]
        const warnings = shieldData.warnings[mint] || []

        let risk = { riskScore: 50, flags: { red: [], yellow: [], green: [] } as any }

        if (token) {
          risk = analyzeTokenRisk(token, warnings)
          if (token.isVerified) verifiedTokenCount++

          // Calculate Value if price available
          if (token.usdPrice) {
            const val = account.uiAmount * token.usdPrice
            totalValue += val
          }
        } else {
          // Unknown token = slight risk
          risk.riskScore = 40
          risk.flags.yellow.push('Unknown/Unindexed Token')
        }

        // Invert risk score for "Exploit Score" (Risk 100 is Safe in our util, so Exploit = 100 - Risk)
        const safetyScore = risk.riskScore
        const dangerScore = 100 - safetyScore

        if (dangerScore > 60) riskyTokenCount++
        exploitScore += dangerScore

        return {
          mint,
          symbol: token?.symbol || 'UNKNOWN',
          amount: account.uiAmount,
          valueUsd: token?.usdPrice ? account.uiAmount * token.usdPrice : 0,
          safetyScore, // 0-100 (100 is best)
          flags: risk.flags,
          isVerified: token?.isVerified || false,
        }
      })

      // Normalize exploit score
      const avgExploitScore = analyzedTokens.length > 0 ? exploitScore / analyzedTokens.length : 0

      // 5. Construct Response
      let responseText = `🔍 **Portfolio Analysis** for \`${agentAddress.slice(0, 6)}...${agentAddress.slice(-4)}\`\n\n`

      responseText += `**Overview:**\n`
      responseText += `- **Total Assets:** ~$${totalValue.toFixed(2)} (Estimated)\n`
      responseText += `- **Tokens Held:** ${mints.length} unique assets\n`
      responseText += `- **Verified:** ${verifiedTokenCount} ✅\n`
      responseText += `- **Risky/Unverified:** ${analyzedTokens.length - verifiedTokenCount} ⚠️\n\n`

      // Highlight Risky Tokens
      const redFlagTokens = analyzedTokens.filter((t) => t.safetyScore < 40)
      if (redFlagTokens.length > 0) {
        responseText += `🚩 **Risk Alerts:**\n`
        redFlagTokens.slice(0, 3).forEach((t) => {
          responseText += `- **${t.symbol}**: ${t.flags.red.join(', ') || 'Low Trust Score'}\n`
        })
        if (redFlagTokens.length > 3)
          responseText += `...and ${redFlagTokens.length - 3} more suspicious tokens.\n`
        responseText += `\n`
      }

      // Verdict
      responseText += `**Verdict:** `
      if (avgExploitScore > 70) {
        responseText += `🚨 **HIGH RISK.** This wallet holds significant amounts of low-quality or suspicious tokens. Proceed with extreme caution.`
      } else if (avgExploitScore > 40) {
        responseText += `⚠️ **MODERATE RISK.** Mix of verified and unverified assets. Standard for a degenerate DeFi user, but check credentials.`
      } else {
        responseText += `✅ **CLEAN.** Mostly verified, high-quality assets. Looks like a legitimate operator.`
      }

      const response = {
        text: responseText,
        ui: {
          type: 'token-evaluation',
          agentAddress,
          totalValue,
          tokenCount: mints.length,
          verifiedCount: verifiedTokenCount,
          riskyCount: redFlagTokens.length,
          avgExploitScore, // 0-100 (High is BAD)
          tokens: analyzedTokens.sort((a, b) => b.valueUsd - a.valueUsd).slice(0, 10), // Send top 10 by value to UI
        },
      }

      if (callback) await callback(response)

      return {
        success: true,
        data: response.ui,
      }
    } catch (error) {
      console.error('Error evaluating tokens:', error)
      if (callback)
        await callback({
          text: 'Failed to fetch token data. The blockchain ghosts are interfering. 👻',
        })
      return { success: false, error: String(error) }
    }
  },

  examples: [
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Evaluate the tokens for agent 5eLbn3wj3iScc2fVH8hyNGRBttDTY5rZpeGk1rcjLek2',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: '🔍 **Portfolio Analysis**...\n\n**Verdict:** ⚠️ MODERATE RISK.',
          action: 'EVALUATE_AGENT_TOKENS',
        },
      },
    ],
  ],
}
