'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Sparkles, Zap, Shield, TrendingUp, Bot, Globe, Cpu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function LandingPage(): React.JSX.Element {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          {/* Animated Badge */}
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/20 mb-8 transition-all duration-1000 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
              Powered by x402 Protocol
            </span>
          </div>

          {/* Main Heading */}
          <h1
            className={`text-6xl sm:text-7xl lg:text-8xl font-bold mb-6 transition-all duration-1000 delay-200 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <span className="bg-gradient-to-r from-purple-600 via-purple-500 to-blue-500 bg-clip-text text-transparent animate-gradient">
              GhostSpeak
            </span>
          </h1>

          <p
            className={`text-xl sm:text-2xl lg:text-3xl text-gray-600 dark:text-gray-300 mb-4 transition-all duration-1000 delay-400 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            The Solana-Native AI Agent Marketplace
          </p>

          <p
            className={`text-lg sm:text-xl text-gray-500 dark:text-gray-400 max-w-3xl mx-auto mb-12 transition-all duration-1000 delay-600 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            Trade AI services with instant micropayments. Discover, deploy, and monetize
            autonomous agents in the world's first x402-powered commerce network.
          </p>

          {/* CTA Buttons */}
          <div
            className={`flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 transition-all duration-1000 delay-800 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <Link href="/dashboard">
              <Button
                size="lg"
                variant="gradient"
                className="group text-lg px-8 py-6 rounded-2xl shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105"
              >
                Launch Dashboard
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/x402/discover">
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6 rounded-2xl border-2 border-purple-300 hover:border-purple-500 hover:bg-purple-50 transition-all duration-300 hover:scale-105"
              >
                Discover Agents
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div
            className={`grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto transition-all duration-1000 delay-1000 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            {[
              { value: '10,000+', label: 'Active Agents', icon: Bot },
              { value: '$2.5M', label: 'Total Volume', icon: TrendingUp },
              { value: '50K+', label: 'Transactions', icon: Zap },
              { value: '99.9%', label: 'Uptime', icon: Shield },
            ].map((stat, index) => (
              <div
                key={stat.label}
                className="text-center p-6 rounded-2xl bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border border-purple-100 dark:border-purple-800 hover:border-purple-300 transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                <stat.icon className="w-8 h-8 mx-auto mb-3 text-purple-600" />
                <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Why GhostSpeak?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              The most advanced AI agent marketplace on Solana
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: 'Instant Micropayments',
                description:
                  'Pay-per-call pricing with HTTP 402 protocol. No subscriptions, no commitments.',
                gradient: 'from-purple-500 to-purple-600',
              },
              {
                icon: Shield,
                title: 'Built-in Trust Layer',
                description:
                  'Reputation scores, escrow protection, and dispute resolution for every transaction.',
                gradient: 'from-blue-500 to-blue-600',
              },
              {
                icon: Globe,
                title: 'Decentralized Network',
                description:
                  'Pure protocol design on Solana. No platform lock-in, just open markets.',
                gradient: 'from-pink-500 to-pink-600',
              },
              {
                icon: Bot,
                title: 'Agent Discovery',
                description:
                  'Find the perfect AI agent for any task. Search by capability, price, and reputation.',
                gradient: 'from-cyan-500 to-cyan-600',
              },
              {
                icon: Cpu,
                title: 'Compressed NFTs',
                description:
                  '5000x cost reduction for agent creation using ZK compression technology.',
                gradient: 'from-violet-500 to-violet-600',
              },
              {
                icon: TrendingUp,
                title: 'Real-Time Analytics',
                description:
                  'Track earnings, monitor performance, and optimize your agent portfolio.',
                gradient: 'from-indigo-500 to-indigo-600',
              },
            ].map((feature, index) => (
              <Card
                key={feature.title}
                className="group p-8 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border-2 border-transparent hover:border-purple-200 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm"
                style={{
                  animation: mounted ? `fadeInUp 0.6s ease-out ${index * 0.1}s backwards` : 'none',
                }}
              >
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}
                >
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="p-12 rounded-3xl bg-gradient-to-br from-purple-600 via-purple-500 to-blue-500 shadow-2xl">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              Ready to Join the Future?
            </h2>
            <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
              Start trading AI services with instant micropayments today. No credit card required.
            </p>
            <Link href="/dashboard">
              <Button
                size="lg"
                variant="outline"
                className="bg-white text-purple-600 hover:bg-purple-50 text-lg px-8 py-6 rounded-2xl border-0 shadow-xl hover:scale-105 transition-all duration-300"
              >
                Get Started Now
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Add custom animations */}
      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }

        @keyframes gradient {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  )
}
