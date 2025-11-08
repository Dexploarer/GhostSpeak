/*!
 * Commit-Reveal Scheme for Auction Security
 *
 * Implements a two-phase commit-reveal pattern to prevent front-running
 * in sensitive auctions. Based on cryptographic commitments using hash functions.
 */

use anchor_lang::prelude::*;
use sha3::{Digest, Keccak256};
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, TokenAccount};
use anchor_spl::token_2022::Token2022;

/// Commitment state for bid hiding
#[account]
pub struct BidCommitment {
    /// The bidder who made the commitment
    pub bidder: Pubkey,

    /// The auction this commitment is for
    pub auction: Pubkey,

    /// Hash of (bid_amount, nonce) - hidden until reveal phase
    pub commitment_hash: [u8; 32],

    /// Timestamp when committed
    pub committed_at: i64,

    /// Whether this commitment has been revealed
    pub is_revealed: bool,

    /// The revealed bid amount (0 until revealed)
    pub revealed_amount: u64,

    /// Reveal deadline - must reveal before this time
    pub reveal_deadline: i64,

    /// Bump seed for PDA
    pub bump: u8,
}

/// Revealed bid data for verification
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct RevealedBid {
    pub amount: u64,
    pub nonce: [u8; 32],
}

impl BidCommitment {
    pub const LEN: usize = 8 + // discriminator
        32 + // bidder
        32 + // auction
        32 + // commitment_hash
        8 + // committed_at
        1 + // is_revealed
        8 + // revealed_amount
        8 + // reveal_deadline
        1; // bump

    /// Create a commitment hash from bid amount and nonce
    pub fn create_commitment(amount: u64, nonce: [u8; 32]) -> [u8; 32] {
        let mut data = Vec::new();
        data.extend_from_slice(&amount.to_le_bytes());
        data.extend_from_slice(&nonce);

        keccak::hash(&data).to_bytes()
    }

    /// Verify a revealed bid matches the commitment
    pub fn verify_commitment(&self, amount: u64, nonce: [u8; 32]) -> bool {
        let computed_hash = Self::create_commitment(amount, nonce);
        computed_hash == self.commitment_hash
    }

    /// Check if reveal window has expired
    pub fn is_reveal_expired(&self) -> Result<bool> {
        let clock = Clock::get()?;
        Ok(clock.unix_timestamp > self.reveal_deadline)
    }
}

/// Enhanced auction with commit-reveal support
#[account]
pub struct CommitRevealAuction {
    /// Standard auction fields
    pub creator: Pubkey,
    pub item_description: String,
    pub start_time: i64,
    pub end_time: i64,
    pub min_bid: u64,
    pub payment_token: Pubkey,

    /// Commit-reveal specific fields
    pub commit_phase_end: i64,
    pub reveal_phase_end: i64,
    pub highest_bidder: Option<Pubkey>,
    pub highest_bid: u64,
    pub total_commitments: u32,
    pub total_reveals: u32,

    /// Auction state
    pub is_finalized: bool,
    pub winner: Option<Pubkey>,
    pub winning_bid: u64,

    /// Security fields
    pub escrow_account: Pubkey,
    pub bump: u8,
}

impl CommitRevealAuction {
    pub const LEN: usize = 8 + // discriminator
        32 + // creator
        256 + // item_description
        8 + // start_time
        8 + // end_time
        8 + // min_bid
        32 + // payment_token
        8 + // commit_phase_end
        8 + // reveal_phase_end
        33 + // highest_bidder (Option)
        8 + // highest_bid
        4 + // total_commitments
        4 + // total_reveals
        1 + // is_finalized
        33 + // winner (Option)
        8 + // winning_bid
        32 + // escrow_account
        1; // bump

    /// Get current phase of the auction
    pub fn get_phase(&self) -> Result<AuctionPhase> {
        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp;

        if current_time < self.start_time {
            Ok(AuctionPhase::NotStarted)
        } else if current_time <= self.commit_phase_end {
            Ok(AuctionPhase::Commit)
        } else if current_time <= self.reveal_phase_end {
            Ok(AuctionPhase::Reveal)
        } else if !self.is_finalized {
            Ok(AuctionPhase::Finalization)
        } else {
            Ok(AuctionPhase::Completed)
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum AuctionPhase {
    NotStarted,
    Commit,
    Reveal,
    Finalization,
    Completed,
}

/// Context for creating a commit-reveal auction
#[derive(Accounts)]
#[instruction(auction_id: String)]
pub struct CreateCommitRevealAuction<'info> {
    #[account(
        init,
        payer = creator,
        space = CommitRevealAuction::LEN,
        seeds = [b"commit_reveal_auction", creator.key().as_ref(), auction_id.as_bytes()],
        bump
    )]
    pub auction: Account<'info, CommitRevealAuction>,

    #[account(
        init,
        payer = creator,
        associated_token::mint = payment_token,
        associated_token::authority = auction,
    )]
    pub auction_escrow_token_account: Account<'info, TokenAccount>,

    /// The token mint used for payments in this auction
    pub payment_token: Account<'info, Mint>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

/// Context for committing a bid
#[derive(Accounts)]
#[instruction(commitment_hash: [u8; 32])]
pub struct CommitBid<'info> {
    #[account(
        mut,
        constraint = auction.get_phase()? == AuctionPhase::Commit @ crate::GhostSpeakError::InvalidState
    )]
    pub auction: Account<'info, CommitRevealAuction>,

    #[account(
        init,
        payer = bidder,
        space = BidCommitment::LEN,
        seeds = [b"bid_commitment", auction.key().as_ref(), bidder.key().as_ref()],
        bump
    )]
    pub commitment: Account<'info, BidCommitment>,

    #[account(mut)]
    pub bidder: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Context for revealing a bid
#[derive(Accounts)]
pub struct RevealBid<'info> {
    #[account(
        mut,
        constraint = auction.get_phase()? == AuctionPhase::Reveal @ crate::GhostSpeakError::InvalidState
    )]
    pub auction: Account<'info, CommitRevealAuction>,

    #[account(
        mut,
        seeds = [b"bid_commitment", auction.key().as_ref(), bidder.key().as_ref()],
        bump = commitment.bump,
        constraint = !commitment.is_revealed @ crate::GhostSpeakError::InvalidState,
        constraint = commitment.bidder == bidder.key() @ crate::GhostSpeakError::UnauthorizedAccess
    )]
    pub commitment: Account<'info, BidCommitment>,

    /// Bidder's token account to transfer bid amount from
    #[account(
        mut,
        associated_token::mint = payment_token,
        associated_token::authority = bidder,
    )]
    pub bidder_token_account: Account<'info, TokenAccount>,

    /// Auction's escrow token account to receive bid amount
    #[account(
        mut,
        associated_token::mint = payment_token,
        associated_token::authority = auction,
    )]
    pub auction_escrow_token_account: Account<'info, TokenAccount>,

    /// Previous highest bidder's token account for refunds (optional - may not exist for first bid)
    pub previous_bidder_token_account: Option<Account<'info, TokenAccount>>,

    /// The token mint used for payments
    pub payment_token: Account<'info, Mint>,

    #[account(mut)]
    pub bidder: Signer<'info>,

    pub token_program: Program<'info, Token2022>,
}

/// Implementation functions
pub fn create_commit_reveal_auction(
    ctx: Context<CreateCommitRevealAuction>,
    _auction_id: String,
    item_description: String,
    duration_hours: u32,
    commit_phase_hours: u32,
    reveal_phase_hours: u32,
    min_bid: u64,
    payment_token: Pubkey,
) -> Result<()> {
    let auction = &mut ctx.accounts.auction;
    let clock = Clock::get()?;

    // Validate inputs
    require!(
        duration_hours >= commit_phase_hours + reveal_phase_hours,
        crate::GhostSpeakError::InvalidState
    );
    require!(
        commit_phase_hours >= 1 && reveal_phase_hours >= 1,
        crate::GhostSpeakError::InvalidState
    );
    require!(min_bid > 0, crate::GhostSpeakError::InvalidAmount);

    // Initialize auction
    auction.creator = ctx.accounts.creator.key();
    auction.item_description = item_description;
    auction.start_time = clock.unix_timestamp;
    auction.end_time = clock.unix_timestamp + (duration_hours as i64 * 3600);
    auction.commit_phase_end = clock.unix_timestamp + (commit_phase_hours as i64 * 3600);
    auction.reveal_phase_end = auction.commit_phase_end + (reveal_phase_hours as i64 * 3600);
    auction.min_bid = min_bid;
    auction.payment_token = payment_token;
    auction.highest_bidder = None;
    auction.highest_bid = 0;
    auction.total_commitments = 0;
    auction.total_reveals = 0;
    auction.is_finalized = false;
    auction.winner = None;
    auction.winning_bid = 0;
    auction.escrow_account = ctx.accounts.auction_escrow_token_account.key();
    auction.bump = ctx.bumps.auction;

    Ok(())
}

pub fn commit_bid(ctx: Context<CommitBid>, commitment_hash: [u8; 32]) -> Result<()> {
    let auction = &mut ctx.accounts.auction;
    let commitment = &mut ctx.accounts.commitment;
    let clock = Clock::get()?;

    // Verify we're in commit phase
    require!(
        auction.get_phase()? == AuctionPhase::Commit,
        crate::GhostSpeakError::InvalidState
    );

    // Initialize commitment
    commitment.bidder = ctx.accounts.bidder.key();
    commitment.auction = auction.key();
    commitment.commitment_hash = commitment_hash;
    commitment.committed_at = clock.unix_timestamp;
    commitment.is_revealed = false;
    commitment.revealed_amount = 0;
    commitment.reveal_deadline = auction.reveal_phase_end;
    commitment.bump = ctx.bumps.commitment;

    // Update auction stats
    auction.total_commitments = auction.total_commitments.saturating_add(1);

    emit!(BidCommittedEvent {
        auction: auction.key(),
        bidder: ctx.accounts.bidder.key(),
        commitment_hash,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

pub fn reveal_bid(
    ctx: Context<RevealBid>,
    _auction_id: String,
    amount: u64,
    nonce: [u8; 32],
) -> Result<()> {
    let auction = &mut ctx.accounts.auction;
    let commitment = &mut ctx.accounts.commitment;

    // Verify we're in reveal phase
    require!(
        auction.get_phase()? == AuctionPhase::Reveal,
        crate::GhostSpeakError::InvalidState
    );

    // Verify the commitment
    require!(
        commitment.verify_commitment(amount, nonce),
        crate::GhostSpeakError::InvalidState
    );

    // Verify bid meets minimum
    require!(
        amount >= auction.min_bid,
        crate::GhostSpeakError::InvalidAmount
    );

    // Verify bidder has sufficient token balance
    require!(
        ctx.accounts.bidder_token_account.amount >= amount,
        crate::GhostSpeakError::InsufficientBalance
    );

    // Verify token accounts use the correct mint
    require!(
        ctx.accounts.bidder_token_account.mint == ctx.accounts.payment_token.key(),
        crate::GhostSpeakError::InvalidTokenAccount
    );

    require!(
        ctx.accounts.auction_escrow_token_account.mint == ctx.accounts.payment_token.key(),
        crate::GhostSpeakError::InvalidTokenAccount
    );

    // If previous bidder token account is provided, validate it uses the correct mint
    if let Some(ref previous_account) = ctx.accounts.previous_bidder_token_account {
        require!(
            previous_account.mint == ctx.accounts.payment_token.key(),
            crate::GhostSpeakError::InvalidTokenAccount
        );
    }

    // Mark as revealed
    commitment.is_revealed = true;
    commitment.revealed_amount = amount;

    // First, transfer the bid amount from bidder to auction escrow
    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        anchor_spl::token_2022::Transfer {
            from: ctx.accounts.bidder_token_account.to_account_info(),
            to: ctx.accounts.auction_escrow_token_account.to_account_info(),
            authority: ctx.accounts.bidder.to_account_info(),
        },
    );

    anchor_spl::token_2022::transfer(transfer_ctx, amount)?;
    msg!(
        "Transferred {} tokens from bidder to auction escrow",
        amount
    );

    // Update highest bid if this bid is higher
    if amount > auction.highest_bid {
        // Return previous highest bid to previous highest bidder if one exists
        if let Some(_previous_bidder) = auction.highest_bidder {
            if auction.highest_bid > 0 {
                // We need a PDA signer to authorize the refund transfer from escrow
                // The auction account itself is the authority for its escrow token account
                let creator_key = auction.creator;
                let auction_id_bytes = b"auction"; // Use a fixed seed since we have the bump
                let signer_seeds = &[
                    b"commit_reveal_auction",
                    creator_key.as_ref(),
                    auction_id_bytes,
                    &[auction.bump],
                ];
                let signer = &[&signer_seeds[..]];

                // Only refund if we have the previous bidder's token account provided
                if let Some(previous_bidder_account) = &ctx.accounts.previous_bidder_token_account {
                    let refund_ctx = CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        anchor_spl::token_2022::Transfer {
                            from: ctx.accounts.auction_escrow_token_account.to_account_info(),
                            to: previous_bidder_account.to_account_info(),
                            authority: auction.to_account_info(),
                        },
                        signer,
                    );

                    anchor_spl::token_2022::transfer(refund_ctx, auction.highest_bid)?;
                    msg!(
                        "Refunded {} tokens to previous highest bidder",
                        auction.highest_bid
                    );
                } else {
                    // If previous bidder token account not provided, we can't refund automatically
                    // This is a limitation - in practice, the client should always provide this account
                    msg!("Warning: Previous highest bidder token account not provided for refund");
                }
            }
        }

        // Update auction state with new highest bid
        auction.highest_bidder = Some(ctx.accounts.bidder.key());
        auction.highest_bid = amount;

        msg!(
            "New highest bid: {} tokens from bidder: {}",
            amount,
            ctx.accounts.bidder.key()
        );
    } else {
        // This bid is not the highest, but tokens are still held in escrow
        // The bidder can be refunded later or at auction completion
        msg!(
            "Bid of {} tokens accepted but not highest (current highest: {})",
            amount,
            auction.highest_bid
        );
    }

    // Update stats
    auction.total_reveals = auction.total_reveals.saturating_add(1);

    emit!(BidRevealedEvent {
        auction: auction.key(),
        bidder: ctx.accounts.bidder.key(),
        amount,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

/// Events
#[event]
pub struct BidCommittedEvent {
    pub auction: Pubkey,
    pub bidder: Pubkey,
    pub commitment_hash: [u8; 32],
    pub timestamp: i64,
}

#[event]
pub struct BidRevealedEvent {
    pub auction: Pubkey,
    pub bidder: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_commitment_hash() {
        let amount = 1000u64;
        let nonce = [1u8; 32];

        let hash1 = BidCommitment::create_commitment(amount, nonce);
        let hash2 = BidCommitment::create_commitment(amount, nonce);

        // Same inputs should produce same hash
        assert_eq!(hash1, hash2);

        // Different amount should produce different hash
        let hash3 = BidCommitment::create_commitment(2000u64, nonce);
        assert_ne!(hash1, hash3);

        // Different nonce should produce different hash
        let nonce2 = [2u8; 32];
        let hash4 = BidCommitment::create_commitment(amount, nonce2);
        assert_ne!(hash1, hash4);
    }
}
