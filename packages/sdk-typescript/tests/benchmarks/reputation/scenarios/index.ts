/**
 * Attack Scenarios for Reputation Benchmarking
 *
 * Defines common attack vectors to test reputation strategy resilience
 */

import type { AttackScenario, AgentBehaviorProfile, AgentBehaviorType } from '../framework/types.js'

/**
 * Create agent behavior profile
 */
function createProfile(
  id: string,
  type: AgentBehaviorType,
  overrides: Partial<AgentBehaviorProfile> = {}
): AgentBehaviorProfile {
  const defaults: Record<AgentBehaviorType, Partial<AgentBehaviorProfile>> = {
    honest: {
      completionRate: 0.95,
      qualityScore: 85,
      timelinessFactor: 1.0,
      disputeRate: 0.05,
      clientSatisfaction: 90
    },
    gaming: {
      completionRate: 0.7,
      qualityScore: 60,
      timelinessFactor: 1.5,
      disputeRate: 0.3,
      clientSatisfaction: 50
    },
    sybil: {
      completionRate: 0.5,
      qualityScore: 40,
      timelinessFactor: 2.0,
      disputeRate: 0.4,
      clientSatisfaction: 30
    },
    colluding: {
      completionRate: 0.6,
      qualityScore: 50,
      timelinessFactor: 1.8,
      disputeRate: 0.35,
      clientSatisfaction: 40
    },
    selective: {
      completionRate: 0.75,
      qualityScore: 70,
      timelinessFactor: 1.2,
      disputeRate: 0.25,
      clientSatisfaction: 60
    },
    volatile: {
      completionRate: 0.65,
      qualityScore: 55,
      timelinessFactor: 1.6,
      disputeRate: 0.3,
      clientSatisfaction: 45
    },
    washing: {
      completionRate: 0.4,
      qualityScore: 35,
      timelinessFactor: 2.2,
      disputeRate: 0.45,
      clientSatisfaction: 25
    }
  }

  return {
    agentId: id,
    behaviorType: type,
    ...defaults[type],
    ...overrides
  }
}

/**
 * Baseline: Honest agents only
 *
 * Tests normal operation without any attacks
 */
export const HONEST_BASELINE: AttackScenario = {
  name: 'honest-baseline',
  description: 'Baseline scenario with only honest agents',
  attackerCount: 0,
  honestAgentCount: 100,
  rounds: 50,
  attackStrategy: 'sybil-coordinated',
  attackerProfiles: [],
  honestProfiles: Array.from({ length: 100 }, (_, i) =>
    createProfile(`honest-${i}`, 'honest')
  )
}

/**
 * Sybil Attack: Multiple fake coordinated agents
 *
 * Attackers create many fake accounts that give each other positive reviews
 */
export const SYBIL_ATTACK: AttackScenario = {
  name: 'sybil-attack',
  description: 'Multiple fake coordinated agents inflating each others reputation',
  attackerCount: 50,
  honestAgentCount: 100,
  rounds: 100,
  attackStrategy: 'sybil-coordinated',
  attackerProfiles: Array.from({ length: 50 }, (_, i) =>
    createProfile(`sybil-${i}`, 'sybil')
  ),
  honestProfiles: Array.from({ length: 100 }, (_, i) =>
    createProfile(`honest-${i}`, 'honest')
  )
}

/**
 * Reputation Gaming: Agents trying to artificially inflate scores
 *
 * Attackers try various techniques to game the reputation algorithm
 */
export const REPUTATION_GAMING: AttackScenario = {
  name: 'reputation-gaming',
  description: 'Agents attempting to artificially inflate reputation scores',
  attackerCount: 30,
  honestAgentCount: 100,
  rounds: 75,
  attackStrategy: 'reputation-gaming',
  attackerProfiles: Array.from({ length: 30 }, (_, i) =>
    createProfile(`gamer-${i}`, 'gaming')
  ),
  honestProfiles: Array.from({ length: 100 }, (_, i) =>
    createProfile(`honest-${i}`, 'honest')
  )
}

/**
 * Collusion Network: Coordinated group helping each other
 *
 * Network of agents that coordinate to boost each others' reputation
 */
export const COLLUSION_NETWORK: AttackScenario = {
  name: 'collusion-network',
  description: 'Network of colluding agents boosting each other',
  attackerCount: 40,
  honestAgentCount: 100,
  rounds: 80,
  attackStrategy: 'collusion-network',
  attackerProfiles: Array.from({ length: 40 }, (_, i) =>
    createProfile(`colluder-${i}`, 'colluding')
  ),
  honestProfiles: Array.from({ length: 100 }, (_, i) =>
    createProfile(`honest-${i}`, 'honest')
  )
}

/**
 * Selective Service Attack: Good to some, bad to others
 *
 * Agents provide good service selectively to build reputation,
 * but scam other users
 */
export const SELECTIVE_SERVICE: AttackScenario = {
  name: 'selective-service',
  description: 'Agents providing good service selectively to build fake reputation',
  attackerCount: 25,
  honestAgentCount: 100,
  rounds: 60,
  attackStrategy: 'selective-service',
  attackerProfiles: Array.from({ length: 25 }, (_, i) =>
    createProfile(`selective-${i}`, 'selective')
  ),
  honestProfiles: Array.from({ length: 100 }, (_, i) =>
    createProfile(`honest-${i}`, 'honest')
  )
}

/**
 * Rapid Registration Spam: Mass creation of fake agents
 *
 * Attacker rapidly creates many new agent accounts to spam the marketplace
 */
export const RAPID_REGISTRATION_SPAM: AttackScenario = {
  name: 'rapid-registration-spam',
  description: 'Mass creation of spam agent accounts',
  attackerCount: 200,
  honestAgentCount: 100,
  rounds: 50,
  attackStrategy: 'rapid-registration-spam',
  attackerProfiles: Array.from({ length: 200 }, (_, i) =>
    createProfile(`spam-${i}`, 'sybil', {
      completionRate: 0.1,
      qualityScore: 20
    })
  ),
  honestProfiles: Array.from({ length: 100 }, (_, i) =>
    createProfile(`honest-${i}`, 'honest')
  )
}

/**
 * Reputation Washing: Abandoning low-reputation accounts
 *
 * Attackers abandon accounts when reputation drops and create new ones
 */
export const REPUTATION_WASHING: AttackScenario = {
  name: 'reputation-washing',
  description: 'Attackers abandoning low-rep accounts and creating new ones',
  attackerCount: 50,
  honestAgentCount: 100,
  rounds: 100,
  attackStrategy: 'reputation-washing',
  attackerProfiles: Array.from({ length: 50 }, (_, i) =>
    createProfile(`washer-${i}`, 'washing')
  ),
  honestProfiles: Array.from({ length: 100 }, (_, i) =>
    createProfile(`honest-${i}`, 'honest')
  )
}

/**
 * Mixed Attack: Combination of multiple attack types
 *
 * Realistic scenario with multiple types of attackers
 */
export const MIXED_ATTACK: AttackScenario = {
  name: 'mixed-attack',
  description: 'Combination of sybil, gaming, and selective service attacks',
  attackerCount: 60,
  honestAgentCount: 100,
  rounds: 100,
  attackStrategy: 'sybil-coordinated',
  attackerProfiles: [
    ...Array.from({ length: 20 }, (_, i) => createProfile(`sybil-${i}`, 'sybil')),
    ...Array.from({ length: 20 }, (_, i) => createProfile(`gamer-${i}`, 'gaming')),
    ...Array.from({ length: 20 }, (_, i) => createProfile(`selective-${i}`, 'selective'))
  ],
  honestProfiles: Array.from({ length: 100 }, (_, i) =>
    createProfile(`honest-${i}`, 'honest')
  )
}

/**
 * All scenarios for comprehensive testing
 */
export const ALL_SCENARIOS: AttackScenario[] = [
  HONEST_BASELINE,
  SYBIL_ATTACK,
  REPUTATION_GAMING,
  COLLUSION_NETWORK,
  SELECTIVE_SERVICE,
  RAPID_REGISTRATION_SPAM,
  REPUTATION_WASHING,
  MIXED_ATTACK
]

/**
 * Quick scenarios for fast testing (fewer rounds/agents)
 */
export const QUICK_SCENARIOS: AttackScenario[] = [
  {
    ...HONEST_BASELINE,
    rounds: 20,
    honestAgentCount: 20,
    honestProfiles: Array.from({ length: 20 }, (_, i) =>
      createProfile(`honest-${i}`, 'honest')
    )
  },
  {
    ...SYBIL_ATTACK,
    rounds: 20,
    attackerCount: 10,
    honestAgentCount: 20,
    attackerProfiles: Array.from({ length: 10 }, (_, i) =>
      createProfile(`sybil-${i}`, 'sybil')
    ),
    honestProfiles: Array.from({ length: 20 }, (_, i) =>
      createProfile(`honest-${i}`, 'honest')
    )
  },
  {
    ...REPUTATION_GAMING,
    rounds: 20,
    attackerCount: 10,
    honestAgentCount: 20,
    attackerProfiles: Array.from({ length: 10 }, (_, i) =>
      createProfile(`gamer-${i}`, 'gaming')
    ),
    honestProfiles: Array.from({ length: 20 }, (_, i) =>
      createProfile(`honest-${i}`, 'honest')
    )
  }
]
