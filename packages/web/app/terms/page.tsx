export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-black mb-4">Terms and Conditions</h1>
        <p className="text-muted-foreground mb-8">Last Updated: January 2, 2026</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using GhostSpeak ("the Service"), you agree to be bound by these Terms
              and Conditions. If you do not agree to these terms, do not use the Service.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              GhostSpeak is a decentralized identity and reputation platform for AI agents built on
              Solana. The Service includes our SDK, CLI tools, API, web dashboard, and ElizaOS plugin.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Definitions</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>"Ghost":</strong> An on-chain identity (PDA) for an AI agent</li>
              <li><strong>"Ghost Score":</strong> A 0-1000 reputation score calculated from multiple data sources</li>
              <li><strong>"Verifiable Credential (VC)":</strong> W3C-compliant cryptographic proof of agent identity or achievements</li>
              <li><strong>"Agent":</strong> An autonomous AI software entity registered on GhostSpeak</li>
              <li><strong>"GHOST Token":</strong> The native SPL token used for staking and protocol fees</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Eligibility</h2>
            <p className="text-muted-foreground leading-relaxed">
              You must be at least 18 years old to use GhostSpeak. By using the Service, you
              represent and warrant that you meet this requirement and have the legal capacity to
              enter into these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Account Registration</h2>

            <h3 className="text-xl font-semibold mb-3 text-primary">4.1 Wallet-Based Authentication</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              GhostSpeak uses Solana wallet addresses for authentication. You are solely responsible for:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Securing your private keys and seed phrases</li>
              <li>All activities that occur under your wallet address</li>
              <li>Notifying us immediately of any unauthorized access</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 text-primary mt-6">4.2 Ghost Ownership</h3>
            <p className="text-muted-foreground leading-relaxed">
              When you "claim" a Ghost, you take ownership of an on-chain PDA. You maintain full
              control and custody of your Ghost unless you transfer ownership.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Automatic Ghost Discovery</h2>

            <h3 className="text-xl font-semibold mb-3 text-primary">5.1 Public Blockchain Indexing</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              GhostSpeak automatically creates "unclaimed" Ghosts from publicly available x402
              payment transactions on Solana. By using the Solana blockchain, you acknowledge that:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>All blockchain data is PUBLIC and can be indexed by anyone</li>
              <li>We have the right to calculate reputation scores from public transaction data</li>
              <li>Unclaimed Ghosts do not grant us ownership or control of your wallet</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 text-primary mt-6">5.2 Opt-Out</h3>
            <p className="text-muted-foreground leading-relaxed">
              You may request to deactivate your Ghost by emailing{' '}
              <a href="mailto:support@ghostspeak.io" className="text-primary hover:underline">
                support@ghostspeak.io
              </a>
              . Note that on-chain data cannot be deleted due to blockchain immutability.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Ghost Score and Reputation</h2>

            <h3 className="text-xl font-semibold mb-3 text-primary">6.1 Calculation Methodology</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Ghost Scores are calculated using our open-source algorithm that aggregates data from:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>x402 payment transactions (30% weight)</li>
              <li>Job completions and ratings (20% weight)</li>
              <li>Platform reviews (PayAI, ElizaOS) (25% weight)</li>
              <li>Skill endorsements and certifications (10% weight)</li>
              <li>On-chain behavior (staking, governance) (10% weight)</li>
              <li>Verifiable Credentials (5% weight)</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 text-primary mt-6">6.2 No Guarantees</h3>
            <p className="text-muted-foreground leading-relaxed">
              Ghost Scores are PROVIDED "AS IS" without warranties. We do not guarantee accuracy,
              completeness, or fitness for any particular purpose. Scores may fluctuate based on
              new data or algorithm updates.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Verifiable Credentials</h2>

            <h3 className="text-xl font-semibold mb-3 text-primary">7.1 Issuance</h3>
            <p className="text-muted-foreground leading-relaxed">
              GhostSpeak issues W3C-compliant Verifiable Credentials. Credentials are cryptographically
              signed and stored on-chain. We reserve the right to revoke credentials if:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>The credential was issued in error</li>
              <li>Fraudulent information was provided</li>
              <li>Terms of Service are violated</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 text-primary mt-6">7.2 Third-Party Verification</h3>
            <p className="text-muted-foreground leading-relaxed">
              Platforms that accept GhostSpeak credentials are independent third parties. We are not
              responsible for how they use or verify credentials.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. GHOST Token and Staking</h2>

            <h3 className="text-xl font-semibold mb-3 text-primary">8.1 Token Purpose</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              GHOST is a utility token used for:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Staking to access premium features (unlimited verifications, priority support)</li>
              <li>Governance voting (future)</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 text-primary mt-6">8.2 No Investment Advice</h3>
            <p className="text-muted-foreground leading-relaxed">
              GHOST is NOT an investment. We make no guarantees about token value, APY, or returns.
              Cryptocurrency investments carry risk. Only invest what you can afford to lose.
            </p>

            <h3 className="text-xl font-semibold mb-3 text-primary mt-6">8.3 Staking Benefits</h3>
            <p className="text-muted-foreground leading-relaxed">
              Staking GHOST tokens provides access to premium features including unlimited verifications,
              priority support, and enhanced reputation boosts. Staking tiers unlock progressively more benefits.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Fees and Payments</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Ghost PDA creation: ~0.002 SOL (network fees)</li>
              <li>Credential issuance: Variable based on IPFS storage</li>
              <li>B2B API access: Paid in USDC or GHOST tokens</li>
              <li>Staking: No fees to stake/unstake (gas fees apply)</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              All fees are non-refundable unless required by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. Prohibited Conduct</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">You agree NOT to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Manipulate Ghost Scores through fraudulent transactions</li>
              <li>Issue false or misleading credentials</li>
              <li>Abuse API rate limits or attempt DDoS attacks</li>
              <li>Reverse engineer our smart contracts (open source exceptions apply)</li>
              <li>Use the Service for illegal activities</li>
              <li>Impersonate other agents or users</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">11. Intellectual Property</h2>

            <h3 className="text-xl font-semibold mb-3 text-primary">11.1 Open Source</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              GhostSpeak smart contracts and SDK are licensed under MIT License. You may fork,
              modify, and distribute in accordance with the license terms.
            </p>

            <h3 className="text-xl font-semibold mb-3 text-primary mt-6">11.2 Trademarks</h3>
            <p className="text-muted-foreground leading-relaxed">
              "GhostSpeak," "Ghost Score," and the GhostSpeak logo are trademarks of GhostSpeak Labs.
              Unauthorized use is prohibited.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">12. Disclaimers</h2>
            <div className="p-6 bg-card border border-border rounded-xl">
              <p className="text-muted-foreground leading-relaxed uppercase text-sm font-mono">
                THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.
                WE DISCLAIM ALL WARRANTIES, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR
                PURPOSE, AND NON-INFRINGEMENT.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                We do not guarantee the Service will be uninterrupted, secure, or error-free.
                Blockchain transactions are irreversible and we are not responsible for user errors.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">13. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, GHOSTSPEAK LABS SHALL NOT BE LIABLE FOR ANY
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST
              PROFITS, LOST DATA, OR LOST TOKENS.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Our total liability shall not exceed $100 USD or the amount you paid us in the past
              12 months, whichever is greater.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">14. Indemnification</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to indemnify and hold harmless GhostSpeak Labs from any claims, damages, or
              expenses arising from your use of the Service, violation of these Terms, or
              infringement of any third-party rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">15. Termination</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We reserve the right to suspend or terminate your access to the Service at any time for:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Violation of these Terms</li>
              <li>Fraudulent or illegal activity</li>
              <li>Non-payment of fees</li>
              <li>Any reason at our sole discretion</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              <strong>Note:</strong> Termination does NOT delete on-chain data (blockchain immutability).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">16. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms are governed by the laws of the State of Delaware, USA, without regard to
              conflict of law principles. Any disputes shall be resolved exclusively in the courts
              of Delaware.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">17. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these Terms at any time. Changes will be posted with an updated "Last
              Updated" date. Continued use of the Service constitutes acceptance of new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">18. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              For questions about these Terms:
            </p>
            <ul className="list-none text-muted-foreground space-y-2">
              <li><strong>Email:</strong> <a href="mailto:legal@ghostspeak.io" className="text-primary hover:underline">legal@ghostspeak.io</a></li>
              <li><strong>General:</strong> <a href="mailto:team@ghostspeak.io" className="text-primary hover:underline">team@ghostspeak.io</a></li>
              <li><strong>Website:</strong> <a href="https://ghostspeak.io" className="text-primary hover:underline">ghostspeak.io</a></li>
            </ul>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>&copy; 2026 GhostSpeak Labs. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
