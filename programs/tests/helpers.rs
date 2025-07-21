use anchor_lang::prelude::*;
use anchor_spl::token_2022::{
    spl_token_2022::{
        self,
        extension::{ExtensionType},
        state::{Mint},
    }
};
use solana_program_test::*;
use solana_sdk::{
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    signature::Keypair,
    signer::Signer,
    system_instruction,
    transaction::Transaction,
};
use crate::state::*;
use crate::instructions::*;

/// Test environment with common utilities
pub struct TestEnvironment {
    pub context: ProgramTestContext,
    pub program_id: Pubkey,
    pub authority: Keypair,
    pub treasury: Pubkey,
    pub platform_signer: Keypair,
}

impl TestEnvironment {
    /// Create a new test environment
    pub async fn new() -> Self {
        let program_id = crate::ID;
        let mut program_test = ProgramTest::new(
            "ghostspeak_marketplace",
            program_id,
            processor!(crate::entry),
        );

        // Add SPL Token 2022 program
        program_test.add_program(
            "spl_token_2022",
            spl_token_2022::ID,
            processor!(spl_token_2022::processor::Processor::process),
        );

        let mut context = program_test.start_with_context().await;
        let authority = Keypair::new();
        let treasury = Keypair::new().pubkey();
        let platform_signer = Keypair::new();

        // Fund authority
        let tx = Transaction::new_signed_with_payer(
            &[system_instruction::transfer(
                &context.payer.pubkey(),
                &authority.pubkey(),
                10_000_000_000, // 10 SOL
            )],
            Some(&context.payer.pubkey()),
            &[&context.payer],
            context.last_blockhash,
        );
        context.banks_client.process_transaction(tx).await.unwrap();

        Self {
            context,
            program_id,
            authority,
            treasury,
            platform_signer,
        }
    }

    /// Create a test agent
    pub async fn create_test_agent(
        &mut self,
        owner: &Keypair,
        service_types: Vec<String>,
    ) -> Result<Pubkey> {
        let agent_id = Pubkey::new_unique();
        let (agent_pda, _) = Pubkey::find_program_address(
            &[b"agent", agent_id.as_ref()],
            &self.program_id,
        );

        let ix = Instruction {
            program_id: self.program_id,
            accounts: vec![
                AccountMeta::new(agent_pda, false),
                AccountMeta::new(owner.pubkey(), true),
                AccountMeta::new(owner.pubkey(), true),
                AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
            ],
            data: CreateAgentParams {
                agent_id,
                metadata_uri: "https://test.agent.metadata".to_string(),
                service_types,
                tier: AgentTier::Basic,
                base_fee: 1_000_000, // 0.001 SOL
                fee_structure: FeeStructure {
                    platform_fee_basis_points: 250, // 2.5%
                    min_service_fee: 100_000,
                    success_bonus_basis_points: 500, // 5%
                },
            }
            .try_to_vec()
            .unwrap(),
        };

        let tx = Transaction::new_signed_with_payer(
            &[ix],
            Some(&owner.pubkey()),
            &[owner],
            self.context.last_blockhash,
        );

        self.context.banks_client.process_transaction(tx).await?;
        Ok(agent_pda)
    }

    /// Create an escrow
    pub async fn create_escrow(
        &mut self,
        creator: &Keypair,
        agent: Pubkey,
        amount: u64,
    ) -> Result<Pubkey> {
        let escrow_id = Pubkey::new_unique();
        let (escrow_pda, _) = Pubkey::find_program_address(
            &[b"escrow", escrow_id.as_ref()],
            &self.program_id,
        );

        let ix = Instruction {
            program_id: self.program_id,
            accounts: vec![
                AccountMeta::new(escrow_pda, false),
                AccountMeta::new(creator.pubkey(), true),
                AccountMeta::new_readonly(agent, false),
                AccountMeta::new(creator.pubkey(), true),
                AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
            ],
            data: CreateEscrowParams {
                escrow_id,
                amount,
                terms: "Test escrow terms".to_string(),
                expiry_timestamp: Clock::get()?.unix_timestamp + 86400, // 24 hours
            }
            .try_to_vec()
            .unwrap(),
        };

        let tx = Transaction::new_signed_with_payer(
            &[ix],
            Some(&creator.pubkey()),
            &[creator],
            self.context.last_blockhash,
        );

        self.context.banks_client.process_transaction(tx).await?;
        Ok(escrow_pda)
    }

    /// Create a test SPL Token 2022 mint with transfer fee
    pub async fn create_test_token_with_fee(
        &mut self,
        authority: &Keypair,
        transfer_fee_basis_points: u16,
        max_fee: u64,
    ) -> Result<Pubkey> {
        let mint = Keypair::new();
        let mint_authority = authority.pubkey();

        // Calculate space needed for mint with transfer fee extension
        let extension_types = vec![ExtensionType::TransferFeeConfig];
        let space = ExtensionType::try_calculate_account_len::<Mint>(&extension_types)?;

        // Create mint account
        let rent = self.context.banks_client.get_rent().await?;
        let lamports = rent.minimum_balance(space);

        let create_account_ix = system_instruction::create_account(
            &authority.pubkey(),
            &mint.pubkey(),
            lamports,
            space as u64,
            &spl_token_2022::ID,
        );

        // Initialize transfer fee config
        let transfer_fee_config_ix = spl_token_2022::extension::transfer_fee::instruction::initialize_transfer_fee_config(
            &spl_token_2022::ID,
            &mint.pubkey(),
            Some(&mint_authority),
            Some(&mint_authority),
            transfer_fee_basis_points,
            max_fee,
        )?;

        // Initialize mint
        let init_mint_ix = spl_token_2022::instruction::initialize_mint2(
            &spl_token_2022::ID,
            &mint.pubkey(),
            &mint_authority,
            Some(&mint_authority),
            9, // decimals
        )?;

        let tx = Transaction::new_signed_with_payer(
            &[create_account_ix, transfer_fee_config_ix, init_mint_ix],
            Some(&authority.pubkey()),
            &[authority, &mint],
            self.context.last_blockhash,
        );

        self.context.banks_client.process_transaction(tx).await?;
        Ok(mint.pubkey())
    }

    /// Create token account for SPL Token 2022
    pub async fn create_token_account(
        &mut self,
        owner: &Keypair,
        mint: Pubkey,
    ) -> Result<Pubkey> {
        let account = Keypair::new();
        
        let rent = self.context.banks_client.get_rent().await?;
        let space = 165; // SPL Token Account size
        let lamports = rent.minimum_balance(space);

        let create_account_ix = system_instruction::create_account(
            &owner.pubkey(),
            &account.pubkey(),
            lamports,
            space as u64,
            &spl_token_2022::ID,
        );

        let init_account_ix = spl_token_2022::instruction::initialize_account3(
            &spl_token_2022::ID,
            &account.pubkey(),
            &mint,
            &owner.pubkey(),
        )?;

        let tx = Transaction::new_signed_with_payer(
            &[create_account_ix, init_account_ix],
            Some(&owner.pubkey()),
            &[owner, &account],
            self.context.last_blockhash,
        );

        self.context.banks_client.process_transaction(tx).await?;
        Ok(account.pubkey())
    }

    /// Mint tokens to account
    pub async fn mint_tokens(
        &mut self,
        mint: Pubkey,
        mint_authority: &Keypair,
        to: Pubkey,
        amount: u64,
    ) -> Result<()> {
        let mint_ix = spl_token_2022::instruction::mint_to(
            &spl_token_2022::ID,
            &mint,
            &to,
            &mint_authority.pubkey(),
            &[],
            amount,
        )?;

        let tx = Transaction::new_signed_with_payer(
            &[mint_ix],
            Some(&mint_authority.pubkey()),
            &[mint_authority],
            self.context.last_blockhash,
        );

        self.context.banks_client.process_transaction(tx).await?;
        Ok(())
    }

    /// Get account data
    pub async fn get_account<T: AccountDeserialize>(&mut self, address: Pubkey) -> Result<T> {
        let account = self.context.banks_client.get_account(address).await?.unwrap();
        T::try_deserialize(&mut account.data.as_slice())
    }

    /// Advance time by slots
    pub async fn advance_slots(&mut self, slots: u64) -> Result<()> {
        self.context.warp_to_slot(self.context.banks_client.get_slot().await? + slots).await;
        Ok(())
    }
}

/// Test assertion helpers
pub mod assertions {
    use super::*;

    pub fn assert_agent_created(agent: &Agent, owner: Pubkey, service_types: &[String]) {
        assert_eq!(agent.owner, owner);
        assert_eq!(agent.service_types, service_types);
        assert!(agent.is_active);
        assert!(!agent.is_verified);
        assert_eq!(agent.rating, 0);
        assert_eq!(agent.total_transactions, 0);
    }

    pub fn assert_escrow_created(
        escrow: &Escrow,
        creator: Pubkey,
        recipient: Pubkey,
        amount: u64,
    ) {
        assert_eq!(escrow.payer, creator);
        assert_eq!(escrow.recipient, recipient);
        assert_eq!(escrow.amount, amount);
        assert_eq!(escrow.status, EscrowStatus::Active);
    }

    pub fn assert_auction_created(
        auction: &Auction,
        creator: Pubkey,
        min_bid: u64,
        service_type: &str,
    ) {
        assert_eq!(auction.creator, creator);
        assert_eq!(auction.min_bid_amount, min_bid);
        assert_eq!(auction.service_type, service_type);
        assert_eq!(auction.status, AuctionStatus::Active);
        assert_eq!(auction.highest_bid, 0);
        assert_eq!(auction.highest_bidder, Pubkey::default());
    }

    pub fn assert_dispute_created(
        dispute: &Dispute,
        initiator: Pubkey,
        escrow: Pubkey,
        disputed_amount: u64,
    ) {
        assert_eq!(dispute.initiator, initiator);
        assert_eq!(dispute.escrow, escrow);
        assert_eq!(dispute.disputed_amount, disputed_amount);
        assert_eq!(dispute.status, DisputeStatus::Open);
        assert!(dispute.evidence.is_empty());
    }
}

/// Common test constants
pub mod constants {

    pub const PLATFORM_FEE_BASIS_POINTS: u16 = 250; // 2.5%
    pub const MIN_SERVICE_FEE: u64 = 100_000; // 0.0001 SOL
    pub const SUCCESS_BONUS_BASIS_POINTS: u16 = 500; // 5%
    pub const DEFAULT_AGENT_BASE_FEE: u64 = 1_000_000; // 0.001 SOL
    pub const DISPUTE_FEE: u64 = 5_000_000; // 0.005 SOL
    pub const ESCALATION_FEE: u64 = 10_000_000; // 0.01 SOL
}