'use client'

import { motion } from 'framer-motion'
import { Shield, Lock, Eye, FileCheck, ExternalLink, GitBranch } from 'lucide-react'
import Link from 'next/link'

/**
 * TrustModel - Security and trust transparency section
 *
 * Addresses security researcher concerns by being transparent about:
 * - How credentials are signed and verified
 * - Trust anchors and dependencies
 * - Open source code and audits
 * - Data storage locations
 */
export function TrustModel() {
  const trustPillars = [
    {
      icon: Lock,
      title: 'Cryptographic Signatures',
      description:
        'All credentials are signed using Ed25519 keys derived from Solana keypairs. Signatures are verifiable on-chain.',
      details: 'Issuer signs → IPFS stores → Solana records CID',
    },
    {
      icon: Shield,
      title: 'W3C Verifiable Credentials',
      description:
        'Industry-standard credential format with built-in revocation checking and expiration support.',
      details: 'JSON-LD format with did:sol method',
    },
    {
      icon: Eye,
      title: 'On-Chain Transparency',
      description:
        'All agent registrations, reputation updates, and credential issuances are recorded on Solana.',
      details: 'Program ID: GpvFxu...cNC9',
    },
    {
      icon: FileCheck,
      title: 'Open Source',
      description: 'SDK, CLI, and smart contracts are fully open source. Verify the code yourself.',
      details: 'MIT licensed on GitHub',
    },
  ]

  const dependencies = [
    {
      name: 'Solana',
      role: 'Native blockchain for agent PDAs and reputation',
      trust: 'Decentralized consensus',
    },
    {
      name: 'IPFS',
      role: 'Credential document storage',
      trust: 'Content-addressed, pinned via web3.storage',
    },
    {
      name: 'Crossmint',
      role: 'Cross-chain credential sync to EVM',
      trust: 'Centralized bridge (optional feature)',
    },
  ]

  return (
    <section className="py-20 sm:py-28 md:py-36 bg-background relative overflow-hidden border-t border-border">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,var(--primary)/5,transparent_50%)]" />

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-mono uppercase tracking-widest backdrop-blur-xl mb-6"
          >
            <Shield className="w-4 h-4" />
            Trust Model
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter mb-6"
          >
            How We <span className="text-primary italic">Secure</span> Trust
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            Transparency about our security model, trust anchors, and dependencies. Don&apos;t
            trust—verify.
          </motion.p>
        </div>

        {/* Trust Pillars Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {trustPillars.map((pillar: any, i: number) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 * i }}
              className="p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <pillar.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2">{pillar.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{pillar.description}</p>
                  <code className="text-xs font-mono bg-muted px-2 py-1 rounded text-muted-foreground">
                    {pillar.details}
                  </code>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Dependencies Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mb-12"
        >
          <h3 className="text-xl font-bold mb-6 text-center">Trust Dependencies</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Dependency
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Role</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Trust Model
                  </th>
                </tr>
              </thead>
              <tbody>
                {dependencies.map((dep: any) => (
                  <tr key={dep.name} className="border-b border-border/50">
                    <td className="py-3 px-4 font-medium">{dep.name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{dep.role}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          dep.trust.includes('Decentralized')
                            ? 'bg-green-500/10 text-green-500'
                            : dep.trust.includes('Content-addressed')
                              ? 'bg-blue-500/10 text-blue-500'
                              : 'bg-yellow-500/10 text-yellow-500'
                        }`}
                      >
                        {dep.trust}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* CTA Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap justify-center gap-4"
        >
          <Link
            href="https://github.com/ghostspeak/ghostspeak"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors text-sm font-medium"
          >
            <GitBranch className="w-4 h-4" />
            View Source Code
            <ExternalLink className="w-3 h-3 text-muted-foreground" />
          </Link>
          <Link
            href="https://solscan.io/account/GpvFxus2eecFKcqa2bhxXeRjpstPeCEJNX216TQCcNC9"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors text-sm font-medium"
          >
            <Eye className="w-4 h-4" />
            View On-Chain Program
            <ExternalLink className="w-3 h-3 text-muted-foreground" />
          </Link>
          <Link
            href="https://docs.ghostspeak.io/security"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-colors text-sm font-medium"
          >
            <Shield className="w-4 h-4" />
            Security Documentation
            <ExternalLink className="w-3 h-3" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
