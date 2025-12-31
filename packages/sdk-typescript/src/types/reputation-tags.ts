/**
 * Reputation Tags System
 *
 * Granular tagging system for agent reputation with confidence scoring.
 * Tags are automatically assigned based on metrics and evidence strength.
 *
 * Three tag categories:
 * - Skill Tags: Technical capabilities and domain expertise
 * - Behavior Tags: Service quality patterns and reliability
 * - Compliance Tags: Regulatory and security compliance status
 */

/**
 * Tag confidence score (basis points)
 * 0-10000 where 10000 = 100% confidence
 */
export interface TagScore {
  /** Tag identifier (e.g., "fast-responder", "defi-expert") */
  tagName: string
  /** Confidence level in basis points (0-10000) */
  confidence: number
  /** Number of supporting data points */
  evidenceCount: number
  /** Timestamp when tag was last updated */
  lastUpdated: number
}

/**
 * Tag categories for organization
 */
export enum TagCategory {
  Skill = 'skill',
  Behavior = 'behavior',
  Compliance = 'compliance'
}

/**
 * Skill-based reputation tags (20+ tags)
 *
 * These tags indicate technical capabilities and domain expertise
 * based on service delivery patterns and client feedback.
 */
export enum SkillTag {
  // AI/ML Services
  CodeGeneration = 'code-generation',
  DataAnalysis = 'data-analysis',
  ContentCreation = 'content-creation',
  ImageGeneration = 'image-generation',
  AudioProcessing = 'audio-processing',
  VideoProcessing = 'video-processing',
  NaturalLanguageProcessing = 'nlp-specialist',
  ComputerVision = 'computer-vision',
  ReinforcementLearning = 'reinforcement-learning',

  // Blockchain/Web3 Services
  DeFiExpert = 'defi-expert',
  NFTSpecialist = 'nft-specialist',
  SmartContractAudit = 'smart-contract-audit',
  BlockchainDevelopment = 'blockchain-dev',
  DAOGovernance = 'dao-governance',

  // Development Services
  GameDevelopment = 'game-dev',
  WebDevelopment = 'web-dev',
  MobileDevelopment = 'mobile-dev',
  APIIntegration = 'api-integration',
  DatabaseManagement = 'database-management',
  DevOpsAutomation = 'devops-automation',

  // Business Services
  FinancialAnalysis = 'financial-analysis',
  MarketResearch = 'market-research',
  LegalCompliance = 'legal-compliance',
  CustomerSupport = 'customer-support',
  TranslationServices = 'translation-services',

  // Security Services
  SecurityAudit = 'security-audit',
  PenetrationTesting = 'penetration-testing',
  ThreatDetection = 'threat-detection',
  IncidentResponse = 'incident-response',

  // Data Services
  DataEngineering = 'data-engineering',
  DataVisualization = 'data-visualization',
  PredictiveModeling = 'predictive-modeling',
  StatisticalAnalysis = 'statistical-analysis'
}

/**
 * Behavior-based reputation tags (20+ tags)
 *
 * These tags indicate service quality patterns, reliability,
 * and professional conduct based on performance metrics.
 */
export enum BehaviorTag {
  // Response Speed
  FastResponder = 'fast-responder', // avg < 60s
  QuickResponder = 'quick-responder', // avg < 5min
  SameDay = 'same-day', // avg < 24h

  // Quality & Consistency
  ConsistentQuality = 'consistent-quality', // low variance in ratings
  HighQuality = 'high-quality', // avg rating > 4.5
  TopRated = 'top-rated', // avg rating > 4.8
  PerfectRecord = 'perfect-record', // 100% success rate

  // Volume & Activity
  HighVolume = 'high-volume', // >1000 transactions
  VeryHighVolume = 'very-high-volume', // >10000 transactions
  MegaVolume = 'mega-volume', // >100000 transactions
  LongTermActive = 'long-term-active', // active >1 year
  MultiYear = 'multi-year', // active >3 years

  // Specialization
  CategorySpecialist = 'category-specialist', // >80% in one category
  MultiDomain = 'multi-domain', // active in 5+ categories
  Generalist = 'generalist', // balanced across categories

  // Reliability
  DisputeFree = 'dispute-free', // 0 disputes in 90 days
  LowDispute = 'low-dispute', // <1% dispute rate
  HighResolution = 'high-resolution', // >90% disputes resolved favorably

  // Tier Status
  PlatinumTier = 'platinum-tier', // reputation >9000
  GoldTier = 'gold-tier', // reputation >7500
  SilverTier = 'silver-tier', // reputation >5000
  BronzeTier = 'bronze-tier', // reputation >2000

  // Engagement
  Responsive = 'responsive', // quick message replies
  Communicative = 'communicative', // frequent updates
  Proactive = 'proactive', // ahead of schedule
  DetailOriented = 'detail-oriented', // thorough documentation

  // Trust Signals
  VerifiedIdentity = 'verified-identity', // KYC completed
  LongStanding = 'long-standing', // established reputation
  CommunityTrusted = 'community-trusted', // high peer ratings
  ClientFavorite = 'client-favorite', // high repeat client rate
}

/**
 * Compliance-based reputation tags (10+ tags)
 *
 * These tags indicate regulatory compliance, security certifications,
 * and adherence to industry standards.
 */
export enum ComplianceTag {
  // Identity Verification
  KYCVerified = 'kyc-verified', // Know Your Customer verification complete
  KYBVerified = 'kyb-verified', // Know Your Business verification complete
  AccreditedInvestor = 'accredited-investor', // SEC accreditation

  // Security Compliance
  SOC2Compliant = 'soc2-compliant', // SOC 2 Type II certification
  ISO27001 = 'iso-27001', // ISO 27001 certified
  GDPR = 'gdpr-compliant', // GDPR compliant processing
  HIPAA = 'hipaa-compliant', // HIPAA compliant for healthcare data
  PCI_DSS = 'pci-dss', // PCI DSS for payment card data

  // Code & Service Quality
  AuditedCode = 'audited-code', // Smart contract audit completed
  BugBounty = 'bug-bounty', // Active bug bounty program
  OpenSource = 'open-source', // Open source codebase

  // Insurance & Guarantees
  InsuredService = 'insured-service', // Service liability insurance
  BondedAgent = 'bonded-agent', // Performance bond posted

  // Regulatory
  LicensedProfessional = 'licensed-professional', // Professional license verified
  RegulatedEntity = 'regulated-entity', // Operating under regulatory framework

  // Transparency
  PublicAuditTrail = 'public-audit-trail', // Public transaction history
  TransparentPricing = 'transparent-pricing', // Clear pricing structure
  VerifiedMetrics = 'verified-metrics', // Third-party verified metrics
}

/**
 * Tag assignment criteria
 * Defines the rules for automatic tag assignment
 */
export interface TagCriteria {
  /** Tag to assign */
  tag: SkillTag | BehaviorTag | ComplianceTag
  /** Category of the tag */
  category: TagCategory
  /** Minimum confidence threshold (basis points) */
  minConfidence: number
  /** Evaluation function */
  evaluate: (metrics: ReputationMetrics) => TagEvaluation
}

/**
 * Result of tag evaluation
 */
export interface TagEvaluation {
  /** Whether tag should be assigned */
  shouldAssign: boolean
  /** Confidence score (0-10000 basis points) */
  confidence: number
  /** Evidence count supporting this tag */
  evidenceCount: number
  /** Explanation of why tag was assigned */
  reason?: string
}

/**
 * Reputation metrics for tag evaluation
 */
export interface ReputationMetrics {
  // Payment metrics
  successfulPayments: bigint
  failedPayments: bigint
  totalResponseTime: bigint
  responseTimeCount: bigint

  // Quality metrics
  totalDisputes: number
  disputesResolved: number
  totalRating: number
  totalRatingsCount: number

  // Time metrics
  createdAt: number
  updatedAt: number

  // Derived metrics
  avgResponseTime: number // milliseconds
  successRate: number // basis points
  avgRating: number // 0-100 scale
  disputeResolutionRate: number // basis points
}

/**
 * Tag filtering options
 */
export interface TagFilters {
  /** Filter by category */
  category?: TagCategory
  /** Minimum confidence threshold */
  minConfidence?: number
  /** Maximum age in seconds */
  maxAge?: number
  /** Include only active tags */
  activeOnly?: boolean
}

/**
 * Tag update request
 */
export interface TagUpdateRequest {
  /** Tag name to update */
  tagName: string
  /** New confidence score */
  confidence: number
  /** Evidence count */
  evidenceCount: number
  /** Timestamp */
  timestamp?: number
}

/**
 * Bulk tag update request
 */
export interface BulkTagUpdateRequest {
  /** Skill tags to add */
  skillTags?: string[]
  /** Behavior tags to add */
  behaviorTags?: string[]
  /** Compliance tags to add */
  complianceTags?: string[]
  /** Tag scores to update */
  tagScores?: TagUpdateRequest[]
  /** Timestamp for updates */
  timestamp?: number
}

/**
 * Tag query result
 */
export interface TagQueryResult {
  /** All tags */
  allTags: string[]
  /** Skill tags */
  skillTags: string[]
  /** Behavior tags */
  behaviorTags: string[]
  /** Compliance tags */
  complianceTags: string[]
  /** Tag scores */
  tagScores: TagScore[]
  /** Last updated timestamp */
  lastUpdated: number
}

/**
 * Constants for tag system
 */
export const TAG_CONSTANTS = {
  /** Maximum skill tags per agent */
  MAX_SKILL_TAGS: 20,
  /** Maximum behavior tags per agent */
  MAX_BEHAVIOR_TAGS: 20,
  /** Maximum compliance tags per agent */
  MAX_COMPLIANCE_TAGS: 10,
  /** Maximum total tag scores */
  MAX_TAG_SCORES: 50,
  /** Maximum tag name length */
  MAX_TAG_NAME_LENGTH: 32,
  /** Stale tag threshold (90 days in seconds) */
  STALE_TAG_THRESHOLD: 90 * 24 * 60 * 60,
  /** Minimum confidence for tag assignment */
  MIN_TAG_CONFIDENCE: 5000, // 50%
  /** Maximum confidence */
  MAX_TAG_CONFIDENCE: 10000, // 100%
  /** Basis points max */
  BASIS_POINTS_MAX: 10000,
} as const

/**
 * Tag decay configuration
 */
export interface TagDecayConfig {
  /** Decay rate per day (basis points) */
  decayRatePerDay: number
  /** Minimum confidence before removal */
  minConfidence: number
  /** Maximum age before forced decay */
  maxAgeSeconds: number
}

/**
 * Default tag decay settings
 */
export const DEFAULT_TAG_DECAY: TagDecayConfig = {
  decayRatePerDay: 10, // 0.1% per day
  minConfidence: 2000, // Remove when below 20%
  maxAgeSeconds: 90 * 24 * 60 * 60, // 90 days
}

/**
 * Tag confidence levels
 */
export enum TagConfidenceLevel {
  VeryLow = 2000, // 20%
  Low = 4000, // 40%
  Medium = 6000, // 60%
  High = 8000, // 80%
  VeryHigh = 9500, // 95%
  Absolute = 10000, // 100%
}
