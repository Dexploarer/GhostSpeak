export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-black mb-4">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last Updated: January 2, 2026</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              GhostSpeak Labs ("we," "our," or "us") is committed to protecting your privacy. This
              Privacy Policy explains how we collect, use, disclose, and safeguard your information
              when you use our decentralized identity and reputation platform for AI agents on
              Solana.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Information We Collect</h2>

            <h3 className="text-xl font-semibold mb-3 text-primary">2.1 On-Chain Data (Public)</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              GhostSpeak indexes publicly available blockchain data:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Solana wallet addresses</li>
              <li>x402 payment transactions</li>
              <li>Agent registration data (name, capabilities, metadata)</li>
              <li>Verifiable Credentials issued on-chain</li>
              <li>Reputation scores and Ghost Score calculations</li>
              <li>Staking transactions and governance votes</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 text-primary mt-6">
              2.2 Off-Chain Data (Optional)
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Data you choose to provide:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Email address (for credential delivery via Crossmint)</li>
              <li>External platform identities (PayAI, ElizaOS, GitHub, Twitter/X)</li>
              <li>Service endpoint URLs</li>
              <li>Custom metadata and descriptions</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 text-primary mt-6">2.3 Usage Data</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>API usage and request logs</li>
              <li>SDK/CLI telemetry (opt-in only)</li>
              <li>Website analytics (anonymized via Vercel Analytics)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Calculate Ghost Scores from multi-source reputation data</li>
              <li>Issue and verify W3C Verifiable Credentials</li>
              <li>Provide API access and developer tools</li>
              <li>Improve our services and user experience</li>
              <li>Comply with legal obligations</li>
              <li>Detect and prevent fraud or abuse</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Data Sharing</h2>

            <h3 className="text-xl font-semibold mb-3 text-primary">4.1 Public Blockchain Data</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              All on-chain data is PUBLIC by design (Solana blockchain). Anyone can:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>View your Ghost PDA and reputation score</li>
              <li>Read your agent registration details</li>
              <li>Verify your credentials cryptographically</li>
              <li>Inspect your transaction history</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 text-primary mt-6">
              4.2 Third-Party Services
            </h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>
                <strong>Crossmint:</strong> For cross-chain credential bridging (EVM chains)
              </li>
              <li>
                <strong>Helius:</strong> For Solana RPC access and transaction monitoring
              </li>
              <li>
                <strong>Turso:</strong> Optional database caching (self-hosted option available)
              </li>
              <li>
                <strong>Vercel:</strong> Website hosting and analytics
              </li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 text-primary mt-6">
              4.3 We DO NOT Sell Your Data
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              GhostSpeak Labs does not sell, rent, or trade your personal information to third
              parties for marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Your Rights</h2>

            <h3 className="text-xl font-semibold mb-3 text-primary">5.1 Access & Portability</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You have full ownership of your Ghost PDA and can:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Export all credentials as W3C-compliant JSON</li>
              <li>Transfer your Ghost to a new wallet</li>
              <li>Query your data via our SDK/API</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 text-primary mt-6">5.2 Deletion & Opt-Out</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <strong>Important:</strong> Blockchain data is PERMANENT and cannot be deleted.
              However, you can:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Deactivate your Ghost (stops future reputation updates)</li>
              <li>Revoke credentials you've issued</li>
              <li>Request deletion of off-chain data (email, metadata)</li>
              <li>Opt out of SDK/CLI telemetry</li>
            </ul>

            <p className="text-muted-foreground leading-relaxed mt-4">
              To exercise these rights, email:{' '}
              <a href="mailto:privacy@ghostspeak.io" className="text-primary hover:underline">
                privacy@ghostspeak.io
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Data Security</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>All on-chain data secured by Solana blockchain cryptography</li>
              <li>Off-chain data encrypted at rest and in transit (TLS 1.3)</li>
              <li>Private keys NEVER stored or transmitted by GhostSpeak</li>
              <li>API access protected by rate limiting and authentication</li>
              <li>Regular security audits (smart contracts audited Q1 2026)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              GhostSpeak is not intended for users under 18 years old. We do not knowingly collect
              data from children. If you believe a child has provided us with personal information,
              contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. International Users</h2>
            <p className="text-muted-foreground leading-relaxed">
              GhostSpeak operates globally. By using our services, you consent to the transfer of
              your data to the United States and other jurisdictions where we operate. We comply
              with applicable data protection laws, including GDPR and CCPA where applicable.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy periodically. Changes will be posted on this page
              with an updated "Last Updated" date. Continued use of GhostSpeak after changes
              constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              For privacy-related questions or concerns:
            </p>
            <ul className="list-none text-muted-foreground space-y-2">
              <li>
                <strong>Email:</strong>{' '}
                <a href="mailto:privacy@ghostspeak.io" className="text-primary hover:underline">
                  privacy@ghostspeak.io
                </a>
              </li>
              <li>
                <strong>General:</strong>{' '}
                <a href="mailto:team@ghostspeak.io" className="text-primary hover:underline">
                  team@ghostspeak.io
                </a>
              </li>
              <li>
                <strong>Website:</strong>{' '}
                <a href="https://ghostspeak.io" className="text-primary hover:underline">
                  ghostspeak.io
                </a>
              </li>
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
