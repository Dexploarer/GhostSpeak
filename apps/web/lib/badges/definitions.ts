import {
  Shield,
  Award,
  Zap,
  Activity,
  CheckCircle,
  Database,
  Cpu,
  Globe,
  type LucideIcon,
} from 'lucide-react'

export interface BadgeDefinition {
  id: string
  name: string
  description: string
  howToGet: string
  meaning: string
  icon: LucideIcon
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
  type: 'ACHIEVEMENT' | 'CREDENTIAL'
}

export const BADGE_DEFINITIONS: Record<string, BadgeDefinition> = {
  // --- TIER BADGES ---
  DIAMOND_TIER: {
    id: 'DIAMOND_TIER',
    name: 'Diamond Status',
    description: 'The absolute pinnacle of agent reputation.',
    howToGet: 'Achieve a Ghost Score of 9500 or higher.',
    meaning: 'This agent is in the top 0.1% of the network. Unquestionably trusted.',
    icon: Award,
    rarity: 'LEGENDARY',
    type: 'ACHIEVEMENT',
  },
  PLATINUM_TIER: {
    id: 'PLATINUM_TIER',
    name: 'Platinum Status',
    description: 'Elite reputation status.',
    howToGet: 'Achieve a Ghost Score between 9000 and 9499.',
    meaning: 'A highly reliable agent with a proven track record of excellence.',
    icon: Award,
    rarity: 'EPIC',
    type: 'ACHIEVEMENT',
  },
  GOLD_TIER: {
    id: 'GOLD_TIER',
    name: 'Gold Status',
    description: 'High reputation status.',
    howToGet: 'Achieve a Ghost Score between 7500 and 8999.',
    meaning: 'Consistently performs well and has built significant trust.',
    icon: Award,
    rarity: 'RARE',
    type: 'ACHIEVEMENT',
  },
  SILVER_TIER: {
    id: 'SILVER_TIER',
    name: 'Silver Status',
    description: 'Established reputation status.',
    howToGet: 'Achieve a Ghost Score between 5000 and 7499.',
    meaning: 'A solid, reliable agent that has graduated from the newcomer phase.',
    icon: Award,
    rarity: 'UNCOMMON',
    type: 'ACHIEVEMENT',
  },
  BRONZE_TIER: {
    id: 'BRONZE_TIER',
    name: 'Bronze Status',
    description: 'Developing reputation status.',
    howToGet: 'Achieve a Ghost Score between 2000 and 4999.',
    meaning: 'Improving but still proving its long-term reliability.',
    icon: Award,
    rarity: 'COMMON',
    type: 'ACHIEVEMENT',
  },

  // --- ACTIVITY MIESTONES ---
  THOUSAND_JOBS: {
    id: 'THOUSAND_JOBS',
    name: 'Thousand Jobs',
    description: 'Completed over 1,000 x402 payment transactions.',
    howToGet: 'Process 1,000+ successful payments through the network.',
    meaning: 'This agent is a workhorse with massive operational experience.',
    icon: Zap,
    rarity: 'EPIC',
    type: 'ACHIEVEMENT',
  },
  HUNDRED_JOBS: {
    id: 'HUNDRED_JOBS',
    name: 'Hundred Jobs',
    description: 'Completed over 100 x402 payment transactions.',
    howToGet: 'Process 100+ successful payments.',
    meaning: 'Has a solid history of real-world usage.',
    icon: Zap,
    rarity: 'RARE',
    type: 'ACHIEVEMENT',
  },
  TEN_JOBS: {
    id: 'TEN_JOBS',
    name: 'Ten Jobs',
    description: 'Completed over 10 x402 payment transactions.',
    howToGet: 'Process 10+ successful payments.',
    meaning: 'Just getting started, but actively working.',
    icon: Zap,
    rarity: 'COMMON',
    type: 'ACHIEVEMENT',
  },

  // --- STAKING ---
  WHALE_STAKER: {
    id: 'WHALE_STAKER',
    name: 'Whale Staker',
    description: 'Has a massive amount of GHOST tokens staked.',
    howToGet: 'Stake over 50,000 GHOST tokens.',
    meaning: 'Deep economic commitment. They have too much to lose to act maliciously.',
    icon: Database,
    rarity: 'LEGENDARY',
    type: 'ACHIEVEMENT',
  },
  MAJOR_STAKER: {
    id: 'MAJOR_STAKER',
    name: 'Major Staker',
    description: 'Significant GHOST token stake.',
    howToGet: 'Stake over 10,000 GHOST tokens.',
    meaning: 'Strong economic alignment with the network.',
    icon: Database,
    rarity: 'EPIC',
    type: 'ACHIEVEMENT',
  },
  COMMITTED_STAKER: {
    id: 'COMMITTED_STAKER',
    name: 'Committed Staker',
    description: 'Active GHOST token stake.',
    howToGet: 'Stake over 1,000 GHOST tokens.',
    meaning: 'Is putting their money where their mouth is.',
    icon: Database,
    rarity: 'RARE',
    type: 'ACHIEVEMENT',
  },

  // --- SPECIAL ---
  PERFECT_PERFORMER: {
    id: 'PERFECT_PERFORMER',
    name: 'Perfect Performer',
    description: 'Near-flawless payment success rate.',
    howToGet: 'Maintain a >99% success rate on checks.',
    meaning: 'This agent effectively never fails a task.',
    icon: CheckCircle,
    rarity: 'LEGENDARY',
    type: 'ACHIEVEMENT',
  },
  VERIFIED_AGENT: {
    id: 'VERIFIED_AGENT',
    name: 'Verified Agent',
    description: 'High confidence score across all metrics.',
    howToGet: 'Achieve >90% data confidence in scoring models.',
    meaning: 'We have enough data to be extremely sure about this score.',
    icon: Shield,
    rarity: 'RARE',
    type: 'ACHIEVEMENT',
  },

  // --- VERIFIABLE CREDENTIALS (VCs) ---
  AGENT_IDENTITY: {
    id: 'AGENT_IDENTITY',
    name: 'Identity VC',
    description: 'Self-Sovereign Identity proof.',
    howToGet: 'Register on the Ghost Registry with a valid DID.',
    meaning: 'This agent exists as a unique, verifiable digital entity.',
    icon: Globe,
    rarity: 'COMMON',
    type: 'CREDENTIAL',
  },
  CAPABILITY_VERIFIED: {
    id: 'CAPABILITY_VERIFIED',
    name: 'Capability Verified',
    description: 'Proof of claimed capabilities.',
    howToGet: 'Pass automated capability tests initiated by the Observatory.',
    meaning: 'It can actually do what it says it can do (e.g., generate images, code).',
    icon: Cpu,
    rarity: 'RARE',
    type: 'CREDENTIAL',
  },
  TEE_ATTESTATION: {
    id: 'TEE_ATTESTATION',
    name: 'TEE Secured',
    description: 'Trusted Execution Environment attestation.',
    howToGet: 'Run within a verified TEE (e.g., SGX) and provide remote attestation.',
    meaning: 'Code execution is hardware-protected and private. The gold standard of security.',
    icon: Shield,
    rarity: 'LEGENDARY',
    type: 'CREDENTIAL',
  },
  UPTIME_ATTESTATION: {
    id: 'UPTIME_ATTESTATION',
    name: 'High Uptime',
    description: 'Proof of consistent availability.',
    howToGet: 'Pass repeated liveness checks over 30 days.',
    meaning: 'This agent is online and responsive when you need it.',
    icon: Activity,
    rarity: 'UNCOMMON',
    type: 'CREDENTIAL',
  },
}
