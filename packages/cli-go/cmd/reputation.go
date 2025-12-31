package cmd

import (
	"fmt"

	"github.com/charmbracelet/lipgloss"
	"github.com/ghostspeak/cli-go/internal/domain"
	"github.com/spf13/cobra"
)

var reputationCmd = &cobra.Command{
	Use:   "reputation",
	Short: "Manage agent reputation and Ghost Score",
	Long: `Manage agent reputation and Ghost Score (0-1000).

Commands include viewing reputation, calculating Ghost Score, exporting data,
and viewing the leaderboard.`,
	Aliases: []string{"rep", "score"},
}

var reputationGetCmd = &cobra.Command{
	Use:   "get [agent-address]",
	Short: "Get agent reputation",
	Long: `Get reputation data and Ghost Score for an agent.

If no agent address is provided, shows reputation for the active wallet.`,
	Args: cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		var agentAddress string

		if len(args) > 0 {
			agentAddress = args[0]
		} else {
			// Use active wallet
			activeWallet, err := application.WalletService.GetActiveWallet()
			if err != nil {
				return fmt.Errorf("no active wallet: %w", err)
			}
			agentAddress = activeWallet.PublicKey
		}

		reputation, err := application.ReputationService.GetReputation(agentAddress)
		if err != nil {
			return fmt.Errorf("failed to get reputation: %w", err)
		}

		// Display reputation
		titleStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FEF9A7")).Bold(true)
		labelStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
		valueStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFFFF"))
		scoreStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FEF9A7")).Bold(true)

		// Tier colors
		tierColor := "#CD7F32" // Bronze
		switch reputation.Tier {
		case domain.TierSilver:
			tierColor = "#C0C0C0"
		case domain.TierGold:
			tierColor = "#FFD700"
		case domain.TierPlatinum:
			tierColor = "#E5E4E2"
		}
		tierStyle := lipgloss.NewStyle().Foreground(lipgloss.Color(tierColor)).Bold(true)

		fmt.Println()
		fmt.Println(titleStyle.Render("Agent Reputation"))
		fmt.Println()

		fmt.Println(titleStyle.Render("Ghost Score"))
		fmt.Printf("%s %s\n", scoreStyle.Render(fmt.Sprintf("%d", reputation.GhostScore)), tierStyle.Render(string(reputation.Tier)))
		fmt.Println()

		fmt.Println(titleStyle.Render("Performance Metrics"))
		fmt.Printf("%s %d\n", labelStyle.Render("Total Jobs:"), reputation.TotalJobs)
		fmt.Printf("%s %d\n", labelStyle.Render("Completed Jobs:"), reputation.CompletedJobs)
		fmt.Printf("%s %d\n", labelStyle.Render("Failed Jobs:"), reputation.FailedJobs)
		fmt.Printf("%s %.2f%%\n", labelStyle.Render("Success Rate:"), reputation.SuccessRate)
		fmt.Printf("%s %.2f / 5.0\n", labelStyle.Render("Average Rating:"), reputation.AverageRating)
		fmt.Printf("%s %ds\n", labelStyle.Render("Avg Response Time:"), reputation.ResponseTime)
		fmt.Printf("%s %ds\n", labelStyle.Render("Avg Completion Time:"), reputation.CompletionTime)
		fmt.Println()

		fmt.Println(titleStyle.Render("Revenue"))
		fmt.Printf("%s %.4f SOL\n", labelStyle.Render("Total Earnings:"), domain.LamportsToSOL(reputation.TotalEarnings))
		fmt.Printf("%s %.4f SOL/job\n", labelStyle.Render("Average Earnings:"), reputation.AverageEarnings)
		fmt.Println()

		if len(reputation.Tags) > 0 {
			fmt.Println(titleStyle.Render("Tags"))
			for _, tag := range reputation.Tags {
				fmt.Printf("  • %s\n", valueStyle.Render(string(tag)))
			}
			fmt.Println()
		}

		if reputation.AdminVerified {
			fmt.Printf("%s %s\n", labelStyle.Render("Admin Verified:"), lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF00")).Render("✓ Yes"))
		}

		if reputation.PayAIEvents > 0 {
			fmt.Printf("%s %d events, %.4f SOL revenue\n",
				labelStyle.Render("PayAI Integration:"),
				reputation.PayAIEvents,
				domain.LamportsToSOL(reputation.PayAIRevenue),
			)
		}

		fmt.Println()
		fmt.Printf("%s %s\n", labelStyle.Render("Last Updated:"), reputation.UpdatedAt.Format("2006-01-02 15:04:05"))
		fmt.Println()

		return nil
	},
}

var reputationCalculateCmd = &cobra.Command{
	Use:   "calculate [agent-address]",
	Short: "Calculate Ghost Score",
	Long: `Calculate the current Ghost Score for an agent.

This command shows the score calculation breakdown and factors.`,
	Args: cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		var agentAddress string

		if len(args) > 0 {
			agentAddress = args[0]
		} else {
			// Use active wallet
			activeWallet, err := application.WalletService.GetActiveWallet()
			if err != nil {
				return fmt.Errorf("no active wallet: %w", err)
			}
			agentAddress = activeWallet.PublicKey
		}

		score, err := application.ReputationService.CalculateScore(agentAddress)
		if err != nil {
			return fmt.Errorf("failed to calculate score: %w", err)
		}

		tier := domain.DetermineTier(score)

		titleStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FEF9A7")).Bold(true)
		scoreStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FEF9A7")).Bold(true)

		tierColor := "#CD7F32"
		switch tier {
		case domain.TierSilver:
			tierColor = "#C0C0C0"
		case domain.TierGold:
			tierColor = "#FFD700"
		case domain.TierPlatinum:
			tierColor = "#E5E4E2"
		}
		tierStyle := lipgloss.NewStyle().Foreground(lipgloss.Color(tierColor)).Bold(true)

		fmt.Println()
		fmt.Println(titleStyle.Render("Ghost Score Calculation"))
		fmt.Println()
		fmt.Printf("%s %s\n", scoreStyle.Render(fmt.Sprintf("%d", score)), tierStyle.Render(string(tier)))
		fmt.Println()

		fmt.Println("Score Breakdown:")
		fmt.Println("  • Success Rate: 0-300 points")
		fmt.Println("  • Average Rating: 0-200 points")
		fmt.Println("  • Experience: 0-200 points")
		fmt.Println("  • Response Time: 0-150 points")
		fmt.Println("  • Completion Time: 0-100 points")
		fmt.Println("  • Admin Verification: 0-25 points")
		fmt.Println("  • PayAI Integration: 0-25 points")
		fmt.Println()

		return nil
	},
}

var reputationExportCmd = &cobra.Command{
	Use:   "export [agent-address]",
	Short: "Export reputation data",
	Long: `Export reputation data to JSON format.

If no agent address is provided, exports data for the active wallet.`,
	Args: cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		var agentAddress string

		if len(args) > 0 {
			agentAddress = args[0]
		} else {
			// Use active wallet
			activeWallet, err := application.WalletService.GetActiveWallet()
			if err != nil {
				return fmt.Errorf("no active wallet: %w", err)
			}
			agentAddress = activeWallet.PublicKey
		}

		exportJSON, err := application.ReputationService.ExportReputationData(agentAddress)
		if err != nil {
			return fmt.Errorf("failed to export reputation: %w", err)
		}

		titleStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FEF9A7")).Bold(true)

		fmt.Println()
		fmt.Println(titleStyle.Render("Reputation Data Export"))
		fmt.Println()
		fmt.Println(exportJSON)
		fmt.Println()

		return nil
	},
}

var reputationLeaderboardCmd = &cobra.Command{
	Use:   "leaderboard",
	Short: "View Ghost Score leaderboard",
	Long:  `View the top agents by Ghost Score.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		leaderboard, err := application.ReputationService.GetLeaderboard(10)
		if err != nil {
			return fmt.Errorf("failed to get leaderboard: %w", err)
		}

		if len(leaderboard) == 0 {
			fmt.Println("Leaderboard is empty")
			return nil
		}

		titleStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FEF9A7")).Bold(true)
		labelStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
		valueStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFFFF"))

		fmt.Println()
		fmt.Println(titleStyle.Render("👑 Ghost Score Leaderboard"))
		fmt.Println()

		for i, rep := range leaderboard {
			tierColor := "#CD7F32"
			switch rep.Tier {
			case domain.TierSilver:
				tierColor = "#C0C0C0"
			case domain.TierGold:
				tierColor = "#FFD700"
			case domain.TierPlatinum:
				tierColor = "#E5E4E2"
			}
			tierStyle := lipgloss.NewStyle().Foreground(lipgloss.Color(tierColor))

			fmt.Printf("%s %s %s (%s)\n",
				labelStyle.Render(fmt.Sprintf("#%d", i+1)),
				valueStyle.Render(fmt.Sprintf("Score: %d", rep.GhostScore)),
				tierStyle.Render(string(rep.Tier)),
				rep.AgentAddress[:8]+"...",
			)
		}

		fmt.Println()

		return nil
	},
}

func init() {
	// Add subcommands
	reputationCmd.AddCommand(reputationGetCmd)
	reputationCmd.AddCommand(reputationCalculateCmd)
	reputationCmd.AddCommand(reputationExportCmd)
	reputationCmd.AddCommand(reputationLeaderboardCmd)

	// Add to root
	rootCmd.AddCommand(reputationCmd)
}
