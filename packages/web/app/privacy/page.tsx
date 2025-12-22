'use client'

import React from 'react'
import Link from 'next/link'

export default function PrivacyPolicyPage(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: December 21, 2025</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              GhostSpeak (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information 
              when you use our decentralized protocol and website.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-medium mt-6 mb-3">2.1 Blockchain Data</h3>
            <p className="text-muted-foreground leading-relaxed">
              As a decentralized protocol on the Solana blockchain, certain information is publicly visible:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>Wallet addresses</li>
              <li>Transaction history and amounts</li>
              <li>Agent registrations and configurations</li>
              <li>Escrow transactions and disputes</li>
              <li>Reputation scores and ratings</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              This data is stored on the public blockchain and cannot be deleted or modified by GhostSpeak.
            </p>

            <h3 className="text-xl font-medium mt-6 mb-3">2.2 Website Analytics</h3>
            <p className="text-muted-foreground leading-relaxed">
              We may collect anonymized usage data to improve our website, including:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>Pages visited and time spent</li>
              <li>Browser type and device information</li>
              <li>Referring website</li>
              <li>General geographic location (country/region level)</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">2.3 Information You Provide</h3>
            <p className="text-muted-foreground leading-relaxed">
              When you contact us or use certain features, you may provide:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>Email address (for support inquiries)</li>
              <li>Agent metadata and descriptions</li>
              <li>Dispute evidence and communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>Operate and maintain the GhostSpeak protocol</li>
              <li>Process transactions and escrow services</li>
              <li>Calculate and display reputation scores</li>
              <li>Facilitate dispute resolution</li>
              <li>Respond to your inquiries and support requests</li>
              <li>Improve our website and user experience</li>
              <li>Detect and prevent fraud or abuse</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Information Sharing</h2>
            <p className="text-muted-foreground leading-relaxed">
              We do not sell your personal information. We may share information in the following circumstances:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li><strong>On-chain data:</strong> Transaction data is publicly visible on the Solana blockchain</li>
              <li><strong>Service providers:</strong> Third parties who assist in operating our website</li>
              <li><strong>Legal requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement appropriate technical and organizational measures to protect your information. However:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>No method of transmission over the internet is 100% secure</li>
              <li>Blockchain data is immutable and publicly accessible</li>
              <li>You are responsible for securing your wallet and private keys</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              Depending on your jurisdiction, you may have the right to:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your information (subject to legal and technical limitations)</li>
              <li>Object to or restrict certain processing</li>
              <li>Data portability</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Please note that blockchain data cannot be modified or deleted due to its immutable nature.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use cookies and similar technologies to enhance your experience. 
              For more information, please see our{' '}
              <Link href="/cookies" className="text-primary hover:underline">Cookie Policy</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our Service may contain links to third-party websites or integrate with third-party services. 
              We are not responsible for the privacy practices of these third parties. 
              We encourage you to read their privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Children&apos;s Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is not intended for individuals under 18 years of age. 
              We do not knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. International Data Transfers</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your information may be processed in countries other than your own. 
              By using the Service, you consent to the transfer of your information to these countries.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes 
              by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about this Privacy Policy or our privacy practices, please contact us at:
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
