package cmd

import (
	"fmt"
	"os"

	"github.com/charmbracelet/lipgloss"
	"github.com/ghostspeak/cli-go/internal/domain"
	"github.com/spf13/cobra"
	"golang.org/x/term"
)

var stakingCmd = &cobra.Command{
	Use:   "staking",
	Short: "Manage GHOST token staking",
	Long: `Manage GHOST token staking to earn rewards and unlock tier benefits.

Staking Tiers:
  • Bronze (1,000 - 9,999 GHOST): +5% reputation boost
  • Silver (10,000 - 99,999 GHOST): +15% reputation boost + verified badge
  • Gold (100,000+ GHOST): +15% reputation boost + verified badge + premium benefits

APY: Variable based on protocol revenue distribution
     Estimated: ~10-15% APY`,
	Aliases: []string{"stake"},
}

var stakingStakeCmd = &cobra.Command{
	Use:   "stake <amount>",
	Short: "Stake GHOST tokens",
	Long: `Stake GHOST tokens to earn rewards and unlock tier benefits.

You will be prompted to select a lock period and enter your wallet password.

Examples:
  ghost staking stake 5000      # Stake 5,000 GHOST tokens
  ghost staking stake 50000     # Stake 50,000 GHOST tokens`,
	Args: cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		var amountGhost float64
		if _, err := fmt.Sscanf(args[0], "%f", &amountGhost); err != nil {
			return fmt.Errorf("invalid amount: %w", err)
		}

		if amountGhost < 1000 {
			return fmt.Errorf("minimum stake is 1,000 GHOST tokens")
		}

		// Convert to lamports
		amount := domain.GhostTokensToLamports(amountGhost)

		// Show tier preview
		tier := domain.DetermineStakingTier(amountGhost)
		repBoost, hasVerifiedBadge, hasPremiumBenefits := domain.GetTierBenefits(tier)

		titleStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FEF9A7")).Bold(true)
		labelStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
		valueStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFFFF"))

		fmt.Println()
		fmt.Println(titleStyle.Render("Staking Preview"))
		fmt.Println()
		fmt.Printf("%s %.2f GHOST\n", labelStyle.Render("Amount:"), amountGhost)
		fmt.Printf("%s %s\n", labelStyle.Render("Tier:"), lipgloss.NewStyle().Foreground(lipgloss.Color("#FFD700")).Render(string(tier)))
		fmt.Println()
		fmt.Println(titleStyle.Render("Tier Benefits:"))
		fmt.Printf("  • Reputation Boost: %s\n", valueStyle.Render(fmt.Sprintf("+%.1f%%", repBoost)))
		if hasVerifiedBadge {
			fmt.Printf("  • Verified Badge: %s\n", valueStyle.Render("Yes"))
		}
		if hasPremiumBenefits {
			fmt.Printf("  • Premium Benefits: %s\n", valueStyle.Render("Yes"))
		}
		fmt.Println()

		// Note about variable APY
		fmt.Println(labelStyle.Render("Note: APY varies based on protocol revenue distribution"))
		fmt.Println(labelStyle.Render("      Estimated: ~10-15% APY"))
		fmt.Println()

		// Get password
		fmt.Print("Enter wallet password: ")
		passwordBytes, err := term.ReadPassword(int(os.Stdin.Fd()))
		if err != nil {
			return fmt.Errorf("failed to read password: %w", err)
		}
		fmt.Println()

		// Stake
		params := domain.StakeParams{
			Amount:         amount,
			LockPeriod:     domain.LockNone, // No lock period - variable APY model
			WalletPassword: string(passwordBytes),
		}

		stakingAccount, err := application.StakingService.Stake(params)
		if err != nil {
			return fmt.Errorf("failed to stake: %w", err)
		}

		// Display success
		successStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF00")).Bold(true)

		fmt.Println()
		fmt.Println(successStyle.Render("✓ Staking successful!"))
		fmt.Println()
		fmt.Printf("%s %.2f GHOST\n", labelStyle.Render("Staked:"), stakingAccount.AmountGHOST)
		fmt.Printf("%s %s\n", labelStyle.Render("Tier:"), stakingAccount.Tier)
		fmt.Printf("%s ~%.2f%% (variable)\n", labelStyle.Render("Estimated APY:"), stakingAccount.EstimatedAPY)
		fmt.Println()

		return nil
	},
}

var stakingUnstakeCmd = &cobra.Command{
	Use:   "unstake",
	Short: "Unstake GHOST tokens",
	Long: `Unstake GHOST tokens and claim all pending rewards.

Note: You can only unstake if your lock period has expired.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		// Get active wallet
		activeWallet, err := application.WalletService.GetActiveWallet()
		if err != nil {
			return fmt.Errorf("no active wallet: %w", err)
		}

		// Get staking account
		stakingAccount, err := application.StakingService.GetStakingAccount(activeWallet.PublicKey)
		if err != nil {
			return fmt.Errorf("not staking: %w", err)
		}

		// Check if can unstake
		if !stakingAccount.CanUnstake() {
			timeRemaining := stakingAccount.TimeUntilUnlock()
			return fmt.Errorf("staking account is still locked: %s remaining", timeRemaining)
		}

		labelStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
		titleStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FEF9A7")).Bold(true)

		fmt.Println()
		fmt.Println(titleStyle.Render("Unstake Preview"))
		fmt.Println()
		fmt.Printf("%s %.2f GHOST\n", labelStyle.Render("Staked Amount:"), stakingAccount.AmountGHOST)
		fmt.Printf("%s %.4f GHOST\n", labelStyle.Render("Pending Rewards:"), domain.LamportsToGhostTokens(stakingAccount.UnclaimedRewards))
		fmt.Printf("%s %.4f GHOST\n", labelStyle.Render("Total to Receive:"), stakingAccount.AmountGHOST+domain.LamportsToGhostTokens(stakingAccount.UnclaimedRewards))
		fmt.Println()

		// Confirm
		fmt.Print("Are you sure you want to unstake? (yes/no): ")
		var confirm string
		fmt.Scanln(&confirm)

		if confirm != "yes" && confirm != "y" {
			fmt.Println("Unstaking cancelled")
			return nil
		}

		// Get password
		fmt.Print("Enter wallet password: ")
		passwordBytes, err := term.ReadPassword(int(os.Stdin.Fd()))
		if err != nil {
			return fmt.Errorf("failed to read password: %w", err)
		}
		fmt.Println()

		// Unstake
		params := domain.UnstakeParams{
			WalletPassword: string(passwordBytes),
		}

		if err := application.StakingService.Unstake(params); err != nil {
			return fmt.Errorf("failed to unstake: %w", err)
		}

		// Display success
		successStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF00")).Bold(true)

		fmt.Println()
		fmt.Println(successStyle.Render("✓ Unstaking successful!"))
		fmt.Println()
		fmt.Printf("%s %.4f GHOST\n", labelStyle.Render("Tokens Returned:"), stakingAccount.AmountGHOST+domain.LamportsToGhostTokens(stakingAccount.UnclaimedRewards))
		fmt.Println()

		return nil
	},
}

var stakingBalanceCmd = &cobra.Command{
	Use:   "balance [address]",
	Short: "Show staking balance",
	Long: `Show staking balance and rewards for an address.

If no address is provided, shows balance for the active wallet.`,
	Args: cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		var address string

		if len(args) > 0 {
			address = args[0]
		} else {
			// Use active wallet
			activeWallet, err := application.WalletService.GetActiveWallet()
			if err != nil {
				return fmt.Errorf("no active wallet: %w", err)
			}
			address = activeWallet.PublicKey
		}

		// Get staking account
		stakingAccount, err := application.StakingService.GetStakingAccount(address)
		if err != nil {
			return fmt.Errorf("not staking: %w", err)
		}

		// Display account
		titleStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FEF9A7")).Bold(true)
		labelStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
		valueStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFFFF"))

		// Tier color
		tierColor := "#CD7F32" // Bronze (default)
		switch stakingAccount.Tier {
		case domain.StakingTierBronze:
			tierColor = "#CD7F32" // Bronze
		case domain.StakingTierSilver:
			tierColor = "#C0C0C0" // Silver
		case domain.StakingTierGold:
			tierColor = "#FFD700" // Gold
		}
		tierStyle := lipgloss.NewStyle().Foreground(lipgloss.Color(tierColor)).Bold(true)

		fmt.Println()
		fmt.Println(titleStyle.Render("Staking Balance"))
		fmt.Println()

		fmt.Println(titleStyle.Render("Account"))
		fmt.Printf("%s %s\n", labelStyle.Render("Address:"), address)
		fmt.Printf("%s %s\n", labelStyle.Render("Status:"), valueStyle.Render(string(stakingAccount.Status)))
		fmt.Printf("%s %s\n", labelStyle.Render("Tier:"), tierStyle.Render(string(stakingAccount.Tier)))
		fmt.Println()

		fmt.Println(titleStyle.Render("Staking"))
		fmt.Printf("%s %.2f GHOST\n", labelStyle.Render("Amount:"), stakingAccount.AmountGHOST)
		fmt.Printf("%s %s\n", labelStyle.Render("Staked At:"), stakingAccount.StakedAt.Format("2006-01-02 15:04:05"))
		fmt.Printf("%s %s\n", labelStyle.Render("Lock Period:"), stakingAccount.LockPeriod)
		if stakingAccount.LockPeriod != domain.LockNone {
			fmt.Printf("%s %s\n", labelStyle.Render("Unlocks At:"), stakingAccount.UnlocksAt.Format("2006-01-02 15:04:05"))
			if stakingAccount.IsLocked() {
				fmt.Printf("%s %s\n", labelStyle.Render("Time Remaining:"), stakingAccount.TimeUntilUnlock())
			}
		}
		fmt.Println()

		fmt.Println(titleStyle.Render("APY (Variable)"))
		fmt.Printf("%s ~%.2f%%\n", labelStyle.Render("Current APY:"), stakingAccount.CurrentAPY)
		fmt.Printf("%s ~%.2f%%\n", labelStyle.Render("Estimated APY:"), stakingAccount.EstimatedAPY)
		fmt.Printf("%s %s\n", labelStyle.Render("Note:"), valueStyle.Render("APY varies based on protocol revenue"))
		fmt.Println()

		fmt.Println(titleStyle.Render("Rewards"))
		fmt.Printf("%s %.4f GHOST\n", labelStyle.Render("Total Earned:"), domain.LamportsToGhostTokens(stakingAccount.TotalRewards))
		fmt.Printf("%s %.4f GHOST\n", labelStyle.Render("Claimed:"), domain.LamportsToGhostTokens(stakingAccount.ClaimedRewards))
		fmt.Printf("%s %s\n",
			labelStyle.Render("Unclaimed:"),
			lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF00")).Render(fmt.Sprintf("%.4f GHOST", domain.LamportsToGhostTokens(stakingAccount.UnclaimedRewards))))
		fmt.Println()

		fmt.Println(titleStyle.Render("Tier Benefits"))
		fmt.Printf("  • Reputation Boost: %s\n", valueStyle.Render(fmt.Sprintf("+%.1f%%", stakingAccount.ReputationBoost)))
		if stakingAccount.HasVerifiedBadge {
			fmt.Printf("  • Verified Badge: %s\n", valueStyle.Render("Yes"))
		}
		if stakingAccount.HasPremiumBenefits {
			fmt.Printf("  • Premium Benefits: %s\n", valueStyle.Render("Yes"))
		}
		fmt.Println()

		return nil
	},
}

var stakingClaimCmd = &cobra.Command{
	Use:   "claim",
	Short: "Claim staking rewards",
	Long:  `Claim accumulated staking rewards without unstaking.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		// Get active wallet
		activeWallet, err := application.WalletService.GetActiveWallet()
		if err != nil {
			return fmt.Errorf("no active wallet: %w", err)
		}

		// Get staking account
		stakingAccount, err := application.StakingService.GetStakingAccount(activeWallet.PublicKey)
		if err != nil {
			return fmt.Errorf("not staking: %w", err)
		}

		if stakingAccount.UnclaimedRewards == 0 {
			fmt.Println("No rewards to claim")
			return nil
		}

		labelStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
		titleStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FEF9A7")).Bold(true)

		fmt.Println()
		fmt.Println(titleStyle.Render("Claim Rewards"))
		fmt.Println()
		fmt.Printf("%s %.4f GHOST\n", labelStyle.Render("Unclaimed Rewards:"), domain.LamportsToGhostTokens(stakingAccount.UnclaimedRewards))
		fmt.Println()

		// Get password
		fmt.Print("Enter wallet password: ")
		passwordBytes, err := term.ReadPassword(int(os.Stdin.Fd()))
		if err != nil {
			return fmt.Errorf("failed to read password: %w", err)
		}
		fmt.Println()

		// Claim
		params := domain.ClaimRewardsParams{
			WalletPassword: string(passwordBytes),
		}

		rewardAmount, err := application.StakingService.ClaimRewards(params)
		if err != nil {
			return fmt.Errorf("failed to claim rewards: %w", err)
		}

		// Display success
		successStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF00")).Bold(true)

		fmt.Println()
		fmt.Println(successStyle.Render("✓ Rewards claimed successfully!"))
		fmt.Println()
		fmt.Printf("%s %.4f GHOST\n", labelStyle.Render("Claimed:"), domain.LamportsToGhostTokens(rewardAmount))
		fmt.Println()

		return nil
	},
}

var stakingStatsCmd = &cobra.Command{
	Use:   "stats",
	Short: "Show global staking statistics",
	Long:  `Show global staking statistics including total staked, number of stakers, and average APY.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		stats, err := application.StakingService.GetStakingStats()
		if err != nil {
			return fmt.Errorf("failed to get staking stats: %w", err)
		}

		titleStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FEF9A7")).Bold(true)
		labelStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
		valueStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFFFF"))

		fmt.Println()
		fmt.Println(titleStyle.Render("Global Staking Statistics"))
		fmt.Println()

		fmt.Printf("%s %s GHOST\n",
			labelStyle.Render("Total Staked:"),
			valueStyle.Render(fmt.Sprintf("%.2f", stats.TotalStakedGHOST)))
		fmt.Printf("%s %d\n",
			labelStyle.Render("Total Stakers:"),
			stats.TotalStakers)
		fmt.Printf("%s %.2f%%\n",
			labelStyle.Render("Average APY:"),
			stats.AverageAPY)
		fmt.Printf("%s %.2f GHOST\n",
			labelStyle.Render("Total Rewards Distributed:"),
			domain.LamportsToGhostTokens(stats.TotalRewards))
		fmt.Printf("%s %s\n",
			labelStyle.Render("Last Updated:"),
			stats.UpdatedAt.Format("2006-01-02 15:04:05"))
		fmt.Println()

		return nil
	},
}

func init() {
	// Add subcommands
	stakingCmd.AddCommand(stakingStakeCmd)
	stakingCmd.AddCommand(stakingUnstakeCmd)
	stakingCmd.AddCommand(stakingBalanceCmd)
	stakingCmd.AddCommand(stakingClaimCmd)
	stakingCmd.AddCommand(stakingStatsCmd)

	// Add to root
	rootCmd.AddCommand(stakingCmd)
}
