use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    program_pack::Pack,
    system_instruction,
};
use anchor_spl::token::{Token, TokenAccount, Mint};
use solana_program_test::*;
use solana_sdk::{
    signature::{Keypair, Signer},
    transaction::Transaction,
    pubkey::Pubkey,
    rent::Rent,
};

/// Test context for GhostSpeak integration tests
pub struct TestContext {
    pub program_id: Pubkey,
    pub payer: Keypair,
    pub recent_blockhash: solana_sdk::hash::Hash,
}

impl TestContext {
    /// Create a new test context with program ID
    pub fn new(program_id: Pubkey, payer: Keypair, recent_blockhash: solana_sdk::hash::Hash) -> Self {
        Self {
            program_id,
            payer,
            recent_blockhash,
        }
    }

    /// Get payer pubkey
    pub fn payer_pubkey(&self) -> Pubkey {
        self.payer.pubkey()
    }
}

/// Create a funded account for testing
pub async fn create_funded_account(
    banks_client: &mut BanksClient,
    payer: &Keypair,
    lamports: u64,
) -> Result<Keypair, BanksClientError> {
    let account = Keypair::new();
    let recent_blockhash = banks_client.get_latest_blockhash().await?;

    let tx = Transaction::new_signed_with_payer(
        &[system_instruction::transfer(
            &payer.pubkey(),
            &account.pubkey(),
            lamports,
        )],
        Some(&payer.pubkey()),
        &[payer],
        recent_blockhash,
    );

    banks_client.process_transaction(tx).await?;
    Ok(account)
}

/// Create a test token mint
pub async fn create_test_mint(
    banks_client: &mut BanksClient,
    payer: &Keypair,
    authority: &Pubkey,
    decimals: u8,
) -> Result<Keypair, BanksClientError> {
    let mint = Keypair::new();
    let rent = banks_client.get_rent().await?;
    let mint_rent = rent.minimum_balance(spl_token::state::Mint::LEN);

    let recent_blockhash = banks_client.get_latest_blockhash().await?;

    let tx = Transaction::new_signed_with_payer(
        &[
            system_instruction::create_account(
                &payer.pubkey(),
                &mint.pubkey(),
                mint_rent,
                spl_token::state::Mint::LEN as u64,
                &spl_token::id(),
            ),
            spl_token::instruction::initialize_mint(
                &spl_token::id(),
                &mint.pubkey(),
                authority,
                None,
                decimals,
            )?,
        ],
        Some(&payer.pubkey()),
        &[payer, &mint],
        recent_blockhash,
    );

    banks_client.process_transaction(tx).await?;
    Ok(mint)
}

/// Create a test token account
pub async fn create_test_token_account(
    banks_client: &mut BanksClient,
    payer: &Keypair,
    mint: &Pubkey,
    owner: &Pubkey,
) -> Result<Keypair, BanksClientError> {
    let account = Keypair::new();
    let rent = banks_client.get_rent().await?;
    let account_rent = rent.minimum_balance(spl_token::state::Account::LEN);

    let recent_blockhash = banks_client.get_latest_blockhash().await?;

    let tx = Transaction::new_signed_with_payer(
        &[
            system_instruction::create_account(
                &payer.pubkey(),
                &account.pubkey(),
                account_rent,
                spl_token::state::Account::LEN as u64,
                &spl_token::id(),
            ),
            spl_token::instruction::initialize_account(
                &spl_token::id(),
                &account.pubkey(),
                mint,
                owner,
            )?,
        ],
        Some(&payer.pubkey()),
        &[payer, &account],
        recent_blockhash,
    );

    banks_client.process_transaction(tx).await?;
    Ok(account)
}

/// Mint tokens to an account
pub async fn mint_tokens(
    banks_client: &mut BanksClient,
    payer: &Keypair,
    mint: &Pubkey,
    destination: &Pubkey,
    authority: &Keypair,
    amount: u64,
) -> Result<(), BanksClientError> {
    let recent_blockhash = banks_client.get_latest_blockhash().await?;

    let tx = Transaction::new_signed_with_payer(
        &[spl_token::instruction::mint_to(
            &spl_token::id(),
            mint,
            destination,
            &authority.pubkey(),
            &[],
            amount,
        )?],
        Some(&payer.pubkey()),
        &[payer, authority],
        recent_blockhash,
    );

    banks_client.process_transaction(tx).await?;
    Ok(())
}

/// Assert account exists
pub async fn assert_account_exists(
    banks_client: &mut BanksClient,
    account: &Pubkey,
) -> Result<(), String> {
    let account_data = banks_client
        .get_account(*account)
        .await
        .map_err(|e| format!("Failed to get account: {}", e))?;

    if account_data.is_none() {
        return Err("Account does not exist".to_string());
    }

    Ok(())
}

/// Assert account data equals expected
pub async fn assert_account_data(
    banks_client: &mut BanksClient,
    account: &Pubkey,
    expected_owner: &Pubkey,
) -> Result<(), String> {
    let account_data = banks_client
        .get_account(*account)
        .await
        .map_err(|e| format!("Failed to get account: {}", e))?
        .ok_or("Account does not exist")?;

    if &account_data.owner != expected_owner {
        return Err(format!(
            "Account owner mismatch. Expected: {}, Got: {}",
            expected_owner, account_data.owner
        ));
    }

    Ok(())
}

/// Test fixture for agent registration
pub struct AgentFixture {
    pub agent_keypair: Keypair,
    pub owner: Keypair,
    pub service_mint: Keypair,
}

impl AgentFixture {
    pub async fn new(banks_client: &mut BanksClient, payer: &Keypair) -> Result<Self, BanksClientError> {
        let agent_keypair = Keypair::new();
        let owner = Keypair::new();
        let service_mint = create_test_mint(banks_client, payer, &payer.pubkey(), 9).await?;

        Ok(Self {
            agent_keypair,
            owner,
            service_mint,
        })
    }
}

/// Test fixture for escrow operations
pub struct EscrowFixture {
    pub escrow_keypair: Keypair,
    pub buyer: Keypair,
    pub seller: Keypair,
    pub token_mint: Keypair,
    pub buyer_token_account: Keypair,
    pub seller_token_account: Keypair,
}

impl EscrowFixture {
    pub async fn new(banks_client: &mut BanksClient, payer: &Keypair) -> Result<Self, BanksClientError> {
        let escrow_keypair = Keypair::new();
        let buyer = Keypair::new();
        let seller = Keypair::new();

        // Create mint and token accounts
        let token_mint = create_test_mint(banks_client, payer, &payer.pubkey(), 9).await?;
        let buyer_token_account = create_test_token_account(
            banks_client,
            payer,
            &token_mint.pubkey(),
            &buyer.pubkey(),
        ).await?;
        let seller_token_account = create_test_token_account(
            banks_client,
            payer,
            &token_mint.pubkey(),
            &seller.pubkey(),
        ).await?;

        // Mint tokens to buyer
        mint_tokens(
            banks_client,
            payer,
            &token_mint.pubkey(),
            &buyer_token_account.pubkey(),
            payer,
            1_000_000_000,
        ).await?;

        Ok(Self {
            escrow_keypair,
            buyer,
            seller,
            token_mint,
            buyer_token_account,
            seller_token_account,
        })
    }
}

/// Test fixture for x402 operations
pub struct X402Fixture {
    pub x402_config: Keypair,
    pub agent: Keypair,
    pub payment_mint: Keypair,
}

impl X402Fixture {
    pub async fn new(banks_client: &mut BanksClient, payer: &Keypair) -> Result<Self, BanksClientError> {
        let x402_config = Keypair::new();
        let agent = Keypair::new();
        let payment_mint = create_test_mint(banks_client, payer, &payer.pubkey(), 6).await?;

        Ok(Self {
            x402_config,
            agent,
            payment_mint,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_create_funded_account() {
        let program_id = Pubkey::new_unique();
        let mut program_test = ProgramTest::new(
            "ghostspeak_marketplace",
            program_id,
            processor!(ghostspeak_marketplace::entry),
        );

        let (mut banks_client, payer, _recent_blockhash) = program_test.start().await;

        let funded_account = create_funded_account(&mut banks_client, &payer, 1_000_000)
            .await
            .unwrap();

        let account = banks_client
            .get_account(funded_account.pubkey())
            .await
            .unwrap()
            .unwrap();

        assert_eq!(account.lamports, 1_000_000);
    }

    #[tokio::test]
    async fn test_create_test_mint() {
        let program_id = Pubkey::new_unique();
        let mut program_test = ProgramTest::new(
            "ghostspeak_marketplace",
            program_id,
            processor!(ghostspeak_marketplace::entry),
        );

        let (mut banks_client, payer, _recent_blockhash) = program_test.start().await;

        let mint = create_test_mint(&mut banks_client, &payer, &payer.pubkey(), 9)
            .await
            .unwrap();

        let mint_account = banks_client
            .get_account(mint.pubkey())
            .await
            .unwrap()
            .unwrap();

        assert_eq!(mint_account.owner, spl_token::id());
    }
}
