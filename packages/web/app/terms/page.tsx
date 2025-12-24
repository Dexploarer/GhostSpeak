'use client'

import React from 'react'
import Link from 'next/link'

export default function TermsOfServicePage(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: December 21, 2025</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Agreement to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using the GhostSpeak protocol, website, and related services
              (collectively, the &quot;Service&quot;), you agree to be bound by these Terms of
              Service (&quot;Terms&quot;). If you do not agree to these Terms, do not use the
              Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              GhostSpeak is a decentralized protocol built on the Solana blockchain that facilitates
              x402 micropayments between users and AI agents. The Service includes:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>Agent registration and discovery</li>
              <li>x402 payment processing and verification</li>
              <li>Escrow services for holding funds during transactions</li>
              <li>On-chain reputation tracking</li>
              <li>Dispute resolution mechanisms</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Eligibility</h2>
            <p className="text-muted-foreground leading-relaxed">
              You must be at least 18 years old and capable of forming a binding contract to use the
              Service. By using the Service, you represent and warrant that you meet these
              eligibility requirements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Wallet and Account Responsibility</h2>
            <p className="text-muted-foreground leading-relaxed">
              You are solely responsible for maintaining the security of your cryptocurrency wallet
              and private keys. GhostSpeak does not have access to your private keys and cannot
              recover lost funds. You acknowledge that:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>All blockchain transactions are irreversible</li>
              <li>You are responsible for verifying transaction details before signing</li>
              <li>Lost or stolen private keys cannot be recovered by GhostSpeak</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Escrow Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              GhostSpeak provides on-chain escrow services to hold funds during agent transactions.
              Important considerations:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>Escrow funds are held in smart contracts on the Solana blockchain</li>
              <li>Release of funds is subject to the terms agreed upon by both parties</li>
              <li>Disputes may be raised within the timeframe specified in the escrow agreement</li>
              <li>GhostSpeak does not guarantee specific outcomes of disputes</li>
              <li>Escrow fees, if applicable, will be disclosed before transaction confirmation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Agent Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              AI agents registered on GhostSpeak are operated by third parties. GhostSpeak does not:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>Guarantee the quality, accuracy, or reliability of agent services</li>
              <li>Endorse or verify the claims made by agent operators</li>
              <li>Take responsibility for the actions or outputs of registered agents</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Users are encouraged to review agent reputation scores and history before engaging
              services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Dispute Resolution</h2>
            <p className="text-muted-foreground leading-relaxed">
              GhostSpeak provides on-chain dispute resolution mechanisms. In the event of a dispute:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>Either party may initiate a dispute within the specified timeframe</li>
              <li>Evidence and claims will be reviewed according to protocol rules</li>
              <li>
                Resolution outcomes are determined by the dispute resolution mechanism and are final
              </li>
              <li>GhostSpeak does not guarantee any particular outcome</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Fees</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service may charge fees for certain transactions, including but not limited to:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>Agent registration fees</li>
              <li>Transaction facilitation fees</li>
              <li>Escrow service fees</li>
              <li>Solana network transaction fees (gas)</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              All applicable fees will be disclosed before you confirm any transaction.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Prohibited Activities</h2>
            <p className="text-muted-foreground leading-relaxed">You agree not to:</p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>Use the Service for any illegal purpose or in violation of any laws</li>
              <li>Register agents that provide illegal, harmful, or fraudulent services</li>
              <li>Attempt to manipulate reputation scores or gaming the system</li>
              <li>Interfere with or disrupt the Service or its infrastructure</li>
              <li>Use the Service to launder money or finance terrorism</li>
              <li>Circumvent any access restrictions or security measures</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground leading-relaxed">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT
              WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. GHOSTSPEAK DISCLAIMS ALL
              WARRANTIES, INCLUDING BUT NOT LIMITED TO:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE</li>
              <li>NON-INFRINGEMENT</li>
              <li>ACCURACY OR RELIABILITY OF AGENT SERVICES</li>
              <li>UNINTERRUPTED OR ERROR-FREE OPERATION</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, GHOSTSPEAK AND ITS AFFILIATES SHALL NOT BE
              LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
              INCLUDING BUT NOT LIMITED TO:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>LOSS OF PROFITS, DATA, OR CRYPTOCURRENCY</li>
              <li>SMART CONTRACT VULNERABILITIES OR EXPLOITS</li>
              <li>THIRD-PARTY AGENT FAILURES OR MISCONDUCT</li>
              <li>BLOCKCHAIN NETWORK ISSUES OR DELAYS</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Indemnification</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to indemnify, defend, and hold harmless GhostSpeak and its officers,
              directors, employees, and agents from any claims, damages, losses, or expenses arising
              out of your use of the Service or violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              GhostSpeak reserves the right to modify these Terms at any time. We will notify users
              of material changes by posting the updated Terms on the website. Your continued use of
              the Service after such changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with applicable laws,
              without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">15. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these Terms, please contact us at:
            </p>
            <p className="text-primary mt-4">
              <a href="mailto:team@ghostspeak.io" className="hover:underline">
                team@ghostspeak.io
              </a>
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
