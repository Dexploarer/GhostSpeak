/**
 * GhostSpeak Developer Community Features
 * 
 * Provides community engagement features including contribution tracking,
 * reward systems, developer profiles, and community governance.
 */

export interface DeveloperProfile {
  /** Developer public key */
  address: string;
  /** Display name */
  name: string;
  /** Profile description */
  bio?: string;
  /** Avatar URL */
  avatarUrl?: string;
  /** Social links */
  socialLinks?: SocialLinks;
  /** Developer skills */
  skills: string[];
  /** Specializations */
  specializations: DeveloperSpecialization[];
  /** Reputation score */
  reputation: number;
  /** Experience level */
  level: DeveloperLevel;
  /** Joined timestamp */
  joinedAt: number;
  /** Last active timestamp */
  lastActiveAt: number;
  /** Verification status */
  verified: boolean;
  /** Public profile flag */
  isPublic: boolean;
}

export interface SocialLinks {
  github?: string;
  twitter?: string;
  discord?: string;
  website?: string;
  linkedin?: string;
}

export type DeveloperSpecialization = 
  | 'smart-contracts'
  | 'frontend'
  | 'backend'
  | 'ai-agents'
  | 'defi'
  | 'nft'
  | 'gaming'
  | 'infrastructure'
  | 'security'
  | 'devtools';

export type DeveloperLevel = 'newcomer' | 'contributor' | 'expert' | 'champion' | 'legend';

export interface Contribution {
  /** Contribution ID */
  id: string;
  /** Contributor address */
  contributor: string;
  /** Contribution type */
  type: ContributionType;
  /** Title */
  title: string;
  /** Description */
  description: string;
  /** Repository URL */
  repositoryUrl?: string;
  /** Pull request URL */
  pullRequestUrl?: string;
  /** Submission timestamp */
  submittedAt: number;
  /** Review status */
  status: ContributionStatus;
  /** Reviewer address */
  reviewer?: string;
  /** Review comments */
  reviewComments?: string;
  /** Reward amount (in GHOST tokens) */
  rewardAmount: number;
  /** Tags */
  tags: string[];
  /** Difficulty level */
  difficulty: ContributionDifficulty;
  /** Community votes */
  votes: {
    upvotes: number;
    downvotes: number;
    voters: string[];
  };
}

export type ContributionType = 
  | 'bug-fix'
  | 'feature'
  | 'documentation'
  | 'tutorial'
  | 'tool'
  | 'integration'
  | 'security'
  | 'optimization'
  | 'test'
  | 'design';

export type ContributionStatus = 
  | 'pending'
  | 'under-review'
  | 'approved'
  | 'rejected'
  | 'merged'
  | 'rewarded';

export type ContributionDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface RewardProgram {
  /** Program ID */
  id: string;
  /** Program name */
  name: string;
  /** Description */
  description: string;
  /** Reward rules */
  rules: RewardRule[];
  /** Total reward pool */
  totalPool: number;
  /** Remaining pool */
  remainingPool: number;
  /** Start timestamp */
  startTime: number;
  /** End timestamp */
  endTime: number;
  /** Program status */
  status: 'active' | 'paused' | 'ended';
  /** Eligibility criteria */
  eligibility: EligibilityCriteria;
}

export interface RewardRule {
  /** Rule ID */
  id: string;
  /** Contribution type */
  contributionType: ContributionType;
  /** Difficulty multipliers */
  difficultyMultipliers: Record<ContributionDifficulty, number>;
  /** Base reward amount */
  baseReward: number;
  /** Maximum reward per contribution */
  maxReward: number;
  /** Quality threshold for rewards */
  qualityThreshold: number;
}

export interface EligibilityCriteria {
  /** Minimum reputation required */
  minReputation?: number;
  /** Required specializations */
  requiredSpecializations?: DeveloperSpecialization[];
  /** Minimum developer level */
  minLevel?: DeveloperLevel;
  /** Geographic restrictions */
  allowedRegions?: string[];
  /** Blacklisted addresses */
  blacklist?: string[];
}

export interface CommunityGovernance {
  /** Proposal ID */
  proposalId: string;
  /** Proposal title */
  title: string;
  /** Proposal description */
  description: string;
  /** Proposer address */
  proposer: string;
  /** Proposal type */
  type: GovernanceProposalType;
  /** Proposal data */
  data: any;
  /** Voting start time */
  votingStart: number;
  /** Voting end time */
  votingEnd: number;
  /** Minimum votes required */
  minVotes: number;
  /** Minimum approval percentage */
  minApproval: number;
  /** Current votes */
  votes: GovernanceVote[];
  /** Proposal status */
  status: GovernanceStatus;
  /** Execution timestamp */
  executedAt?: number;
}

export type GovernanceProposalType = 
  | 'reward-program'
  | 'contribution-rules'
  | 'treasury-allocation'
  | 'protocol-upgrade'
  | 'community-guidelines'
  | 'partnership'
  | 'grant-distribution';

export interface GovernanceVote {
  /** Voter address */
  voter: string;
  /** Vote choice */
  choice: 'yes' | 'no' | 'abstain';
  /** Voting power */
  power: number;
  /** Vote timestamp */
  timestamp: number;
  /** Vote reason */
  reason?: string;
}

export type GovernanceStatus = 
  | 'pending'
  | 'active'
  | 'passed'
  | 'rejected'
  | 'executed'
  | 'expired';

class CommunityManager {
  private profiles: Map<string, DeveloperProfile> = new Map();
  private contributions: Map<string, Contribution> = new Map();
  private rewardPrograms: Map<string, RewardProgram> = new Map();
  private governance: Map<string, CommunityGovernance> = new Map();

  /**
   * Create or update developer profile
   */
  async createProfile(profile: Partial<DeveloperProfile> & { address: string }): Promise<DeveloperProfile> {
    const existingProfile = this.profiles.get(profile.address);
    
    const newProfile: DeveloperProfile = {
      name: '',
      skills: [],
      specializations: [],
      reputation: 0,
      level: 'newcomer',
      joinedAt: Date.now(),
      lastActiveAt: Date.now(),
      verified: false,
      isPublic: true,
      ...existingProfile,
      ...profile
    };

    this.profiles.set(profile.address, newProfile);
    return newProfile;
  }

  /**
   * Get developer profile
   */
  getProfile(address: string): DeveloperProfile | null {
    return this.profiles.get(address) || null;
  }

  /**
   * Search developer profiles
   */
  searchProfiles(criteria: {
    skills?: string[];
    specializations?: DeveloperSpecialization[];
    minReputation?: number;
    level?: DeveloperLevel;
    verified?: boolean;
    limit?: number;
  }): DeveloperProfile[] {
    const profiles = Array.from(this.profiles.values());
    
    return profiles
      .filter(profile => {
        if (!profile.isPublic) return false;
        
        if (criteria.skills && !criteria.skills.some(skill => 
          profile.skills.includes(skill)
        )) return false;
        
        if (criteria.specializations && !criteria.specializations.some(spec => 
          profile.specializations.includes(spec)
        )) return false;
        
        if (criteria.minReputation && profile.reputation < criteria.minReputation) return false;
        if (criteria.level && profile.level !== criteria.level) return false;
        if (criteria.verified !== undefined && profile.verified !== criteria.verified) return false;
        
        return true;
      })
      .sort((a, b) => b.reputation - a.reputation)
      .slice(0, criteria.limit || 50);
  }

  /**
   * Submit a contribution
   */
  async submitContribution(contribution: Omit<Contribution, 'id' | 'submittedAt' | 'status' | 'votes'>): Promise<Contribution> {
    const newContribution: Contribution = {
      ...contribution,
      id: this.generateId('contrib'),
      submittedAt: Date.now(),
      status: 'pending',
      votes: {
        upvotes: 0,
        downvotes: 0,
        voters: []
      }
    };

    this.contributions.set(newContribution.id, newContribution);
    
    // Update contributor activity
    this.updateProfileActivity(contribution.contributor);
    
    return newContribution;
  }

  /**
   * Review a contribution
   */
  async reviewContribution(
    contributionId: string, 
    reviewer: string, 
    status: ContributionStatus, 
    comments?: string,
    rewardAmount?: number
  ): Promise<Contribution> {
    const contribution = this.contributions.get(contributionId);
    if (!contribution) {
      throw new Error('Contribution not found');
    }

    contribution.status = status;
    contribution.reviewer = reviewer;
    contribution.reviewComments = comments;
    
    if (rewardAmount !== undefined) {
      contribution.rewardAmount = rewardAmount;
    }

    // If approved, calculate and assign rewards
    if (status === 'approved' || status === 'merged') {
      await this.processReward(contribution);
    }

    this.contributions.set(contributionId, contribution);
    return contribution;
  }

  /**
   * Vote on a contribution
   */
  async voteOnContribution(
    contributionId: string, 
    voter: string, 
    vote: 'up' | 'down'
  ): Promise<Contribution> {
    const contribution = this.contributions.get(contributionId);
    if (!contribution) {
      throw new Error('Contribution not found');
    }

    // Remove previous vote if exists
    const previousVote = contribution.votes.voters.indexOf(voter);
    if (previousVote !== -1) {
      contribution.votes.voters.splice(previousVote, 1);
      contribution.votes.upvotes = Math.max(0, contribution.votes.upvotes - 1);
    }

    // Add new vote
    contribution.votes.voters.push(voter);
    if (vote === 'up') {
      contribution.votes.upvotes++;
    } else {
      contribution.votes.downvotes++;
    }

    this.contributions.set(contributionId, contribution);
    return contribution;
  }

  /**
   * Get contributions
   */
  getContributions(filters: {
    contributor?: string;
    type?: ContributionType;
    status?: ContributionStatus;
    difficulty?: ContributionDifficulty;
    limit?: number;
  } = {}): Contribution[] {
    const contributions = Array.from(this.contributions.values());
    
    return contributions
      .filter(contrib => {
        if (filters.contributor && contrib.contributor !== filters.contributor) return false;
        if (filters.type && contrib.type !== filters.type) return false;
        if (filters.status && contrib.status !== filters.status) return false;
        if (filters.difficulty && contrib.difficulty !== filters.difficulty) return false;
        return true;
      })
      .sort((a, b) => b.submittedAt - a.submittedAt)
      .slice(0, filters.limit || 50);
  }

  /**
   * Create reward program
   */
  createRewardProgram(program: Omit<RewardProgram, 'id'>): RewardProgram {
    const newProgram: RewardProgram = {
      ...program,
      id: this.generateId('reward'),
      remainingPool: program.totalPool
    };

    this.rewardPrograms.set(newProgram.id, newProgram);
    return newProgram;
  }

  /**
   * Get active reward programs
   */
  getActiveRewardPrograms(): RewardProgram[] {
    const now = Date.now();
    return Array.from(this.rewardPrograms.values())
      .filter(program => 
        program.status === 'active' && 
        program.startTime <= now && 
        program.endTime > now
      );
  }

  /**
   * Submit governance proposal
   */
  async submitProposal(proposal: Omit<CommunityGovernance, 'proposalId' | 'votes' | 'status'>): Promise<CommunityGovernance> {
    const newProposal: CommunityGovernance = {
      ...proposal,
      proposalId: this.generateId('prop'),
      votes: [],
      status: 'pending'
    };

    this.governance.set(newProposal.proposalId, newProposal);
    return newProposal;
  }

  /**
   * Vote on governance proposal
   */
  async voteOnProposal(
    proposalId: string, 
    voter: string, 
    choice: 'yes' | 'no' | 'abstain',
    power: number,
    reason?: string
  ): Promise<CommunityGovernance> {
    const proposal = this.governance.get(proposalId);
    if (!proposal) {
      throw new Error('Proposal not found');
    }

    const now = Date.now();
    if (now < proposal.votingStart || now > proposal.votingEnd) {
      throw new Error('Voting period not active');
    }

    // Remove previous vote if exists
    proposal.votes = proposal.votes.filter(vote => vote.voter !== voter);

    // Add new vote
    proposal.votes.push({
      voter,
      choice,
      power,
      timestamp: now,
      reason
    });

    // Check if proposal should be executed
    this.checkProposalExecution(proposal);

    this.governance.set(proposalId, proposal);
    return proposal;
  }

  /**
   * Get governance proposals
   */
  getProposals(filters: {
    status?: GovernanceStatus;
    type?: GovernanceProposalType;
    proposer?: string;
    limit?: number;
  } = {}): CommunityGovernance[] {
    const proposals = Array.from(this.governance.values());
    
    return proposals
      .filter(proposal => {
        if (filters.status && proposal.status !== filters.status) return false;
        if (filters.type && proposal.type !== filters.type) return false;
        if (filters.proposer && proposal.proposer !== filters.proposer) return false;
        return true;
      })
      .sort((a, b) => b.votingStart - a.votingStart)
      .slice(0, filters.limit || 50);
  }

  /**
   * Get leaderboard
   */
  getLeaderboard(type: 'reputation' | 'contributions' | 'rewards', limit = 50): any[] {
    const profiles = Array.from(this.profiles.values());
    
    switch (type) {
      case 'reputation':
        return profiles
          .filter(p => p.isPublic)
          .sort((a, b) => b.reputation - a.reputation)
          .slice(0, limit)
          .map((profile, index) => ({
            rank: index + 1,
            address: profile.address,
            name: profile.name,
            reputation: profile.reputation,
            level: profile.level
          }));

      case 'contributions':
        const contributionCounts = new Map<string, number>();
        this.contributions.forEach(contrib => {
          if (contrib.status === 'approved' || contrib.status === 'merged') {
            contributionCounts.set(
              contrib.contributor,
              (contributionCounts.get(contrib.contributor) || 0) + 1
            );
          }
        });

        return Array.from(contributionCounts.entries())
          .map(([address, count]) => ({
            address,
            profile: this.profiles.get(address),
            contributions: count
          }))
          .filter(item => item.profile?.isPublic)
          .sort((a, b) => b.contributions - a.contributions)
          .slice(0, limit)
          .map((item, index) => ({
            rank: index + 1,
            address: item.address,
            name: item.profile?.name,
            contributions: item.contributions
          }));

      case 'rewards':
        const rewardTotals = new Map<string, number>();
        this.contributions.forEach(contrib => {
          if (contrib.status === 'rewarded' && contrib.rewardAmount > 0) {
            rewardTotals.set(
              contrib.contributor,
              (rewardTotals.get(contrib.contributor) || 0) + contrib.rewardAmount
            );
          }
        });

        return Array.from(rewardTotals.entries())
          .map(([address, total]) => ({
            address,
            profile: this.profiles.get(address),
            rewards: total
          }))
          .filter(item => item.profile?.isPublic)
          .sort((a, b) => b.rewards - a.rewards)
          .slice(0, limit)
          .map((item, index) => ({
            rank: index + 1,
            address: item.address,
            name: item.profile?.name,
            rewards: item.rewards
          }));

      default:
        return [];
    }
  }

  private async processReward(contribution: Contribution): Promise<void> {
    const activePrograms = this.getActiveRewardPrograms();
    
    for (const program of activePrograms) {
      const rule = program.rules.find(r => r.contributionType === contribution.type);
      if (!rule) continue;

      const multiplier = rule.difficultyMultipliers[contribution.difficulty] || 1;
      const calculatedReward = Math.min(
        rule.baseReward * multiplier,
        rule.maxReward
      );

      if (program.remainingPool >= calculatedReward) {
        contribution.rewardAmount = calculatedReward;
        contribution.status = 'rewarded';
        program.remainingPool -= calculatedReward;

        // Update contributor reputation
        await this.updateReputation(contribution.contributor, calculatedReward);
        break;
      }
    }
  }

  private async updateReputation(address: string, rewardAmount: number): Promise<void> {
    const profile = this.profiles.get(address);
    if (!profile) return;

    // Simple reputation calculation based on rewards
    profile.reputation += Math.floor(rewardAmount / 100);
    
    // Update level based on reputation
    if (profile.reputation >= 10000) profile.level = 'legend';
    else if (profile.reputation >= 5000) profile.level = 'champion';
    else if (profile.reputation >= 1000) profile.level = 'expert';
    else if (profile.reputation >= 100) profile.level = 'contributor';

    this.profiles.set(address, profile);
  }

  private updateProfileActivity(address: string): void {
    const profile = this.profiles.get(address);
    if (profile) {
      profile.lastActiveAt = Date.now();
      this.profiles.set(address, profile);
    }
  }

  private checkProposalExecution(proposal: CommunityGovernance): void {
    const now = Date.now();
    if (now <= proposal.votingEnd) return;

    const totalVotes = proposal.votes.length;
    if (totalVotes < proposal.minVotes) {
      proposal.status = 'rejected';
      return;
    }

    const yesVotes = proposal.votes.filter(v => v.choice === 'yes').length;
    const approvalPercentage = (yesVotes / totalVotes) * 100;

    if (approvalPercentage >= proposal.minApproval) {
      proposal.status = 'passed';
      // Execution would be handled by protocol governance
    } else {
      proposal.status = 'rejected';
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}

/**
 * Create a community manager instance
 */
export function createCommunityManager(): CommunityManager {
  return new CommunityManager();
}

export { CommunityManager };