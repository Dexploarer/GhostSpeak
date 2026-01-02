export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-black mb-4">Cookie Policy</h1>
        <p className="text-muted-foreground mb-8">Last Updated: January 2, 2026</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. What Are Cookies?</h2>
            <p className="text-muted-foreground leading-relaxed">
              Cookies are small text files stored on your device when you visit a website. They help
              websites remember your preferences, analyze traffic, and provide a better user
              experience.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. How GhostSpeak Uses Cookies</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              GhostSpeak uses minimal cookies and tracking technologies. We prioritize user privacy
              and only use essential cookies required for the Service to function.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Types of Cookies We Use</h2>

            <h3 className="text-xl font-semibold mb-3 text-primary">3.1 Essential Cookies (Required)</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              These cookies are necessary for the website to function and cannot be disabled:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-border rounded-lg">
                <thead className="bg-card">
                  <tr>
                    <th className="text-left p-4 border-b border-border">Cookie Name</th>
                    <th className="text-left p-4 border-b border-border">Purpose</th>
                    <th className="text-left p-4 border-b border-border">Duration</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr>
                    <td className="p-4 border-b border-border font-mono">ghost_session</td>
                    <td className="p-4 border-b border-border">Maintains wallet connection state</td>
                    <td className="p-4 border-b border-border">Session</td>
                  </tr>
                  <tr>
                    <td className="p-4 border-b border-border font-mono">csrf_token</td>
                    <td className="p-4 border-b border-border">Security - prevents CSRF attacks</td>
                    <td className="p-4 border-b border-border">24 hours</td>
                  </tr>
                  <tr>
                    <td className="p-4 border-b border-border font-mono">theme_preference</td>
                    <td className="p-4 border-b border-border">Remembers light/dark mode choice</td>
                    <td className="p-4 border-b border-border">1 year</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-xl font-semibold mb-3 text-primary mt-8">3.2 Analytics Cookies (Optional)</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use Vercel Analytics (privacy-friendly, GDPR-compliant) to understand how users
              interact with our website:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-border rounded-lg">
                <thead className="bg-card">
                  <tr>
                    <th className="text-left p-4 border-b border-border">Cookie Name</th>
                    <th className="text-left p-4 border-b border-border">Purpose</th>
                    <th className="text-left p-4 border-b border-border">Duration</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr>
                    <td className="p-4 border-b border-border font-mono">_va</td>
                    <td className="p-4 border-b border-border">Vercel Analytics (anonymized page views)</td>
                    <td className="p-4 border-b border-border">1 year</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground leading-relaxed mt-4 text-sm">
              <strong>Note:</strong> Vercel Analytics does NOT track IP addresses, use fingerprinting,
              or share data with third parties. It is fully GDPR and CCPA compliant.
            </p>

            <h3 className="text-xl font-semibold mb-3 text-primary mt-8">3.3 Third-Party Cookies</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              When you connect external services (Crossmint, wallet providers), they may set their
              own cookies. We do not control these cookies. Refer to their privacy policies:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><a href="https://www.crossmint.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Crossmint Privacy Policy</a></li>
              <li><a href="https://phantom.app/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Phantom Wallet Privacy Policy</a></li>
              <li><a href="https://solflare.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Solflare Privacy Policy</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Local Storage</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              In addition to cookies, we use browser local storage to cache:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Wallet connection preferences</li>
              <li>UI state (sidebar collapsed/expanded)</li>
              <li>Recent transactions (client-side only)</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              This data NEVER leaves your browser and is not transmitted to our servers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. SDK and CLI Telemetry</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Our TypeScript SDK and CLI tools collect minimal telemetry (OPT-IN only):
            </p>

            <h3 className="text-xl font-semibold mb-3 text-primary">5.1 What We Collect</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>SDK version</li>
              <li>Command usage (e.g., "ghost register" invoked)</li>
              <li>Error messages (anonymized, no wallet addresses)</li>
              <li>RPC latency (performance monitoring)</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 text-primary mt-6">5.2 What We DON'T Collect</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Wallet addresses or private keys</li>
              <li>Transaction details or amounts</li>
              <li>Personal information</li>
              <li>IP addresses</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 text-primary mt-6">5.3 How to Opt Out</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">Disable telemetry:</p>
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 font-mono text-sm text-zinc-300">
              <p># Via CLI</p>
              <p className="text-primary">ghost config set telemetry false</p>
              <p className="mt-4"># Via SDK</p>
              <p className="text-primary">const client = new GhostSpeakClient({`{ telemetry: false }`})</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. How to Manage Cookies</h2>

            <h3 className="text-xl font-semibold mb-3 text-primary">6.1 Browser Settings</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You can control cookies through your browser settings:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Chrome:</strong> Settings → Privacy and Security → Cookies</li>
              <li><strong>Firefox:</strong> Preferences → Privacy & Security → Cookies</li>
              <li><strong>Safari:</strong> Preferences → Privacy → Cookies</li>
              <li><strong>Edge:</strong> Settings → Privacy → Cookies</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 text-primary mt-6">6.2 Clear GhostSpeak Data</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              To clear all GhostSpeak cookies and local storage:
            </p>
            <ol className="list-decimal list-inside text-muted-foreground space-y-2 ml-4">
              <li>Open browser DevTools (F12)</li>
              <li>Go to "Application" tab</li>
              <li>Select "Cookies" → ghostspeak.io</li>
              <li>Click "Clear all cookies"</li>
              <li>Select "Local Storage" → ghostspeak.io</li>
              <li>Click "Clear"</li>
            </ol>

            <p className="text-muted-foreground leading-relaxed mt-4 text-sm">
              <strong>Note:</strong> Clearing cookies will log you out and reset your preferences.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Do Not Track (DNT)</h2>
            <p className="text-muted-foreground leading-relaxed">
              GhostSpeak respects the "Do Not Track" (DNT) browser setting. When DNT is enabled, we
              automatically disable analytics cookies and SDK telemetry.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. GDPR & CCPA Compliance</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              For users in the EU and California:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>We use minimal tracking (privacy by design)</li>
              <li>Analytics are anonymized and GDPR-compliant</li>
              <li>You can opt out of all non-essential cookies</li>
              <li>We do NOT sell your data (CCPA compliance)</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              To exercise your data rights, email:{' '}
              <a href="mailto:privacy@ghostspeak.io" className="text-primary hover:underline">
                privacy@ghostspeak.io
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Cookie Policy periodically. Changes will be posted on this page with
              an updated "Last Updated" date. Continued use of GhostSpeak constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Questions about our use of cookies:
            </p>
            <ul className="list-none text-muted-foreground space-y-2">
              <li><strong>Email:</strong> <a href="mailto:privacy@ghostspeak.io" className="text-primary hover:underline">privacy@ghostspeak.io</a></li>
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
