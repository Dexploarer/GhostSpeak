// Governance command type definitions

export interface CreateMultisigOptions {
  name?: string
  members?: string
  threshold?: string
}

export interface CreateProposalOptions {
  title?: string
  description?: string
  type?: string
}

export interface VoteOptions {
  proposal?: string
  choice?: 'yes' | 'no' | 'abstain'
}

export interface RBACOptions {
  action?: 'grant' | 'revoke'
  user?: string
  role?: string
}
