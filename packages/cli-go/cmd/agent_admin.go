package cmd

import (
	"fmt"
	"os"

	"github.com/charmbracelet/lipgloss"
	"github.com/spf13/cobra"
	"golang.org/x/term"
)

var agentAdminCmd = &cobra.Command{
	Use:   "admin",
	Short: "Admin commands for agent management",
	Long: `Admin commands for verifying agents, viewing metrics, and exporting data.

These commands require high Ghost Score (800+) or admin privileges.`,
}

var agentVerifyCmd = &cobra.Command{
	Use:   "verify <agent-id>",
	Short: "Verify an agent (admin only)",
	Long: `Mark an agent as verified by admin.

Requires:
- Ghost Score of 800+ OR admin role
- Valid wallet password

Verified agents receive a checkmark badge and +25 Ghost Score bonus.`,
	Args: cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		agentID := args[0]

		// Get wallet password
		fmt.Print("Enter wallet password: ")
		passwordBytes, err := term.ReadPassword(int(os.Stdin.Fd()))
		if err != nil {
			return fmt.Errorf("failed to read password: %w", err)
		}
		fmt.Println()

		// Verify agent
		err = application.AgentService.VerifyAgent(agentID, string(passwordBytes))
		if err != nil {
			return fmt.Errorf("failed to verify agent: %w", err)
		}

		// Display success
		successStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF00")).Bold(true)
		labelStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
		valueStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFFFF"))

		fmt.Println()
		fmt.Println(successStyle.Render("✓ Agent verified successfully!"))
		fmt.Println()
		fmt.Printf("%s %s\n", labelStyle.Render("Agent ID:"), valueStyle.Render(agentID))
		fmt.Printf("%s %s\n", labelStyle.Render("Status:"), successStyle.Render("Verified ✓"))
		fmt.Printf("%s %s\n", labelStyle.Render("Bonus:"), valueStyle.Render("+25 Ghost Score"))
		fmt.Println()

		return nil
	},
}

var agentMetricsCmd = &cobra.Command{
	Use:   "metrics <agent-id>",
	Short: "View detailed agent metrics",
	Long: `Display comprehensive metrics for an agent including:
- Performance statistics
- Ghost Score breakdown
- Reputation tier and tags
- Revenue analytics`,
	Args: cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		agentID := args[0]

		metrics, err := application.AgentService.GetAgentMetrics(agentID)
		if err != nil {
			return fmt.Errorf("failed to get agent metrics: %w", err)
		}

		// Display metrics
		titleStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FEF9A7")).Bold(true)
		labelStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
		valueStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFFFF"))
		successStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF00"))
		warningStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFA500"))

		fmt.Println()
		fmt.Println(titleStyle.Render("Agent Metrics - Detailed Report"))
		fmt.Println()

		// Basic Info
		fmt.Println(titleStyle.Render("📊 Basic Information"))
		fmt.Printf("%s %s\n", labelStyle.Render("ID:"), valueStyle.Render(metrics.Agent.ID))
		fmt.Printf("%s %s\n", labelStyle.Render("Name:"), valueStyle.Render(metrics.Agent.Name))
		fmt.Printf("%s %s\n", labelStyle.Render("Type:"), valueStyle.Render(metrics.Agent.AgentType.String()))
		fmt.Printf("%s %s\n", labelStyle.Render("Owner:"), valueStyle.Render(metrics.Agent.Owner))
		fmt.Println()

		// Ghost Score & Reputation
		fmt.Println(titleStyle.Render("⭐ Reputation"))
		tierStyle := getTierStyle(metrics.Reputation.Tier)
		fmt.Printf("%s %s (%s)\n",
			labelStyle.Render("Ghost Score:"),
			valueStyle.Render(fmt.Sprintf("%d/1000", metrics.Reputation.GhostScore)),
			tierStyle.Render(string(metrics.Reputation.Tier)))

		verifiedStatus := "No"
		if metrics.Reputation.AdminVerified {
			verifiedStatus = successStyle.Render("Yes ✓")
		}
		fmt.Printf("%s %s\n", labelStyle.Render("Admin Verified:"), verifiedStatus)

		if len(metrics.Reputation.Tags) > 0 {
			tags := ""
			for i, tag := range metrics.Reputation.Tags {
				if i > 0 {
					tags += ", "
				}
				tags += string(tag)
			}
			fmt.Printf("%s %s\n", labelStyle.Render("Tags:"), valueStyle.Render(tags))
		}
		fmt.Println()

		// Performance Metrics
		fmt.Println(titleStyle.Render("⚡ Performance"))
		fmt.Printf("%s %d\n", labelStyle.Render("Total Jobs:"), metrics.Reputation.TotalJobs)
		fmt.Printf("%s %s\n", labelStyle.Render("Completed:"), successStyle.Render(fmt.Sprintf("%d", metrics.Reputation.CompletedJobs)))
		fmt.Printf("%s %s\n", labelStyle.Render("Failed:"), warningStyle.Render(fmt.Sprintf("%d", metrics.Reputation.FailedJobs)))

		successRate := metrics.Reputation.SuccessRate
		successRateStyle := successStyle
		if successRate < 80 {
			successRateStyle = warningStyle
		}
		fmt.Printf("%s %s\n", labelStyle.Render("Success Rate:"), successRateStyle.Render(fmt.Sprintf("%.1f%%", successRate)))
		fmt.Printf("%s %.1f / 5.0\n", labelStyle.Render("Average Rating:"), metrics.Reputation.AverageRating)

		if metrics.Reputation.ResponseTime > 0 {
			fmt.Printf("%s %d seconds\n", labelStyle.Render("Avg Response Time:"), metrics.Reputation.ResponseTime)
		}
		if metrics.Reputation.CompletionTime > 0 {
			fmt.Printf("%s %d seconds\n", labelStyle.Render("Avg Completion Time:"), metrics.Reputation.CompletionTime)
		}
		fmt.Println()

		// Revenue Metrics
		fmt.Println(titleStyle.Render("💰 Revenue"))
		fmt.Printf("%s %s SOL (%d lamports)\n",
			labelStyle.Render("Total Earnings:"),
			successStyle.Render(fmt.Sprintf("%.4f", metrics.Reputation.AverageEarnings*float64(metrics.Reputation.CompletedJobs))),
			metrics.Reputation.TotalEarnings)
		if metrics.Reputation.CompletedJobs > 0 {
			fmt.Printf("%s %.4f SOL\n", labelStyle.Render("Average per Job:"), metrics.Reputation.AverageEarnings)
		}
		fmt.Println()

		// PayAI Integration
		if metrics.Reputation.PayAIEvents > 0 {
			fmt.Println(titleStyle.Render("🔗 PayAI Integration"))
			fmt.Printf("%s %d\n", labelStyle.Render("PayAI Events:"), metrics.Reputation.PayAIEvents)
			fmt.Printf("%s %.4f SOL\n", labelStyle.Render("PayAI Revenue:"), float64(metrics.Reputation.PayAIRevenue)/1_000_000_000)
			fmt.Printf("%s %s\n", labelStyle.Render("Last Sync:"), metrics.Reputation.LastPayAISync.Format("2006-01-02 15:04:05"))
			fmt.Println()
		}

		// Timestamps
		fmt.Println(titleStyle.Render("📅 Timeline"))
		fmt.Printf("%s %s\n", labelStyle.Render("Created:"), metrics.Agent.CreatedAt.Format("2006-01-02 15:04:05"))
		fmt.Printf("%s %s\n", labelStyle.Render("Last Updated:"), metrics.UpdatedAt.Format("2006-01-02 15:04:05"))
		fmt.Println()

		return nil
	},
}

var (
	exportOutputFile string
)

var agentExportCmd = &cobra.Command{
	Use:   "export <agent-id>",
	Short: "Export agent data to JSON",
	Long: `Export full agent data including metrics and reputation to JSON format.

Output can be written to a file or stdout.`,
	Args: cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		agentID := args[0]

		jsonData, err := application.AgentService.ExportAgentData(agentID)
		if err != nil {
			return fmt.Errorf("failed to export agent data: %w", err)
		}

		if exportOutputFile != "" {
			// Write to file
			err = os.WriteFile(exportOutputFile, []byte(jsonData), 0644)
			if err != nil {
				return fmt.Errorf("failed to write file: %w", err)
			}

			successStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF00")).Bold(true)
			labelStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
			valueStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFFFF"))

			fmt.Println()
			fmt.Println(successStyle.Render("✓ Agent data exported successfully!"))
			fmt.Println()
			fmt.Printf("%s %s\n", labelStyle.Render("Agent ID:"), valueStyle.Render(agentID))
			fmt.Printf("%s %s\n", labelStyle.Render("Output File:"), valueStyle.Render(exportOutputFile))
			fmt.Println()
		} else {
			// Print to stdout
			fmt.Println(jsonData)
		}

		return nil
	},
}

func init() {
	// Add admin subcommands
	agentAdminCmd.AddCommand(agentVerifyCmd)
	agentAdminCmd.AddCommand(agentMetricsCmd)
	agentAdminCmd.AddCommand(agentExportCmd)

	// Export command flags
	agentExportCmd.Flags().StringVarP(&exportOutputFile, "output", "o", "", "Output file path (default: stdout)")

	// Add admin command to agent command
	agentCmd.AddCommand(agentAdminCmd)
}
