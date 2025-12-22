'use client'

import React from 'react'
import Link from 'next/link'

export default function CookiePolicyPage(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-2">Cookie Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: December 21, 2025</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. What Are Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              Cookies are small text files that are placed on your computer or mobile device when you visit a website. 
              They are widely used to make websites work more efficiently and provide information to website owners.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. How We Use Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              GhostSpeak uses cookies and similar technologies for the following purposes:
            </p>
            
            <h3 className="text-xl font-medium mt-6 mb-3">2.1 Essential Cookies</h3>
            <p className="text-muted-foreground leading-relaxed">
              These cookies are necessary for the website to function properly. They enable core functionality such as:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>Remembering your wallet connection state</li>
              <li>Maintaining your session as you navigate the site</li>
              <li>Storing your theme preference (light/dark mode)</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">2.2 Analytics Cookies</h3>
            <p className="text-muted-foreground leading-relaxed">
              We may use analytics cookies to understand how visitors interact with our website:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>Pages visited and navigation patterns</li>
              <li>Time spent on pages</li>
              <li>Error messages encountered</li>
              <li>General performance metrics</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">2.3 Functional Cookies</h3>
            <p className="text-muted-foreground leading-relaxed">
              These cookies enhance your experience by remembering choices you make:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>Language preferences</li>
              <li>Display settings</li>
              <li>Recently viewed agents</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Cookies We Use</h2>
            <div className="overflow-x-auto">
              <table className="w-full mt-4 text-muted-foreground">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 pr-4 font-semibold text-foreground">Cookie Name</th>
                    <th className="text-left py-3 pr-4 font-semibold text-foreground">Purpose</th>
                    <th className="text-left py-3 pr-4 font-semibold text-foreground">Duration</th>
                    <th className="text-left py-3 font-semibold text-foreground">Type</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="py-3 pr-4 font-mono text-sm">theme</td>
                    <td className="py-3 pr-4">Stores your light/dark mode preference</td>
                    <td className="py-3 pr-4">1 year</td>
                    <td className="py-3">Essential</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 pr-4 font-mono text-sm">wallet_connected</td>
                    <td className="py-3 pr-4">Remembers wallet connection state</td>
                    <td className="py-3 pr-4">Session</td>
                    <td className="py-3">Essential</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 pr-4 font-mono text-sm">cookie_consent</td>
                    <td className="py-3 pr-4">Records your cookie preferences</td>
                    <td className="py-3 pr-4">1 year</td>
                    <td className="py-3">Essential</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Third-Party Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may use third-party services that set their own cookies. These may include:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li><strong>Analytics providers:</strong> To help us understand website usage</li>
              <li><strong>Wallet providers:</strong> For cryptocurrency wallet connections</li>
              <li><strong>RPC providers:</strong> For blockchain data fetching</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              We do not control these third-party cookies. Please refer to their respective privacy policies 
              for more information about their cookie practices.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Managing Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              You can control and manage cookies in several ways:
            </p>
            
            <h3 className="text-xl font-medium mt-6 mb-3">5.1 Browser Settings</h3>
            <p className="text-muted-foreground leading-relaxed">
              Most browsers allow you to:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>View what cookies are stored and delete them individually</li>
              <li>Block third-party cookies</li>
              <li>Block cookies from specific sites</li>
              <li>Block all cookies</li>
              <li>Delete all cookies when you close your browser</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">5.2 Impact of Disabling Cookies</h3>
            <p className="text-muted-foreground leading-relaxed">
              If you disable cookies, some features of our website may not function properly, including:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>Theme preferences may not be saved</li>
              <li>Wallet connection state may not persist</li>
              <li>Some functionality may require re-authentication</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Local Storage and Session Storage</h2>
            <p className="text-muted-foreground leading-relaxed">
              In addition to cookies, we may use browser local storage and session storage for similar purposes. 
              These technologies store data locally on your device and are subject to the same controls as cookies 
              in most browsers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Updates to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Cookie Policy from time to time to reflect changes in our practices or for 
              other operational, legal, or regulatory reasons. Please check this page periodically for updates.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about our use of cookies, please contact us at:
            </p>
            <p className="text-primary mt-4">
              <a href="mailto:team@ghostspeak.io" className="hover:underline">team@ghostspeak.io</a>
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-border">
          <Link href="/" className="text-primary hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
