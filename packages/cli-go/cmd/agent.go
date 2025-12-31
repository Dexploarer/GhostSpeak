package cmd

import (
	"fmt"
	"os"
	"strings"

	"github.com/charmbracelet/lipgloss"
	"github.com/ghostspeak/cli-go/internal/domain"
	"github.com/spf13/cobra"
	"golang.org/x/term"
)

var agentCmd = &cobra.Command{
	Use:   "agent",
	Short: "Manage AI agents",
	Long: `Manage AI agents on the GhostSpeak protocol.

Commands include registering new agents, listing your agents, viewing agent details,
and checking agent analytics.`,
}

var agentRegisterCmd = &cobra.Command{
	Use:   "register",
	Short: "Register a new agent",
	Long: `Register a new AI agent on the Solana blockchain.

This will create an on-chain account for your agent with metadata stored on IPFS.
You will be prompted for agent details and your wallet password.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		// Get agent details
		var name, description, capabilitiesStr string

		fmt.Print("Agent name: ")
		fmt.Scanln(&name)

		fmt.Print("Description: ")
		fmt.Scanln(&description)

		fmt.Println("\nAgent types:")
		fmt.Println("  1. General Purpose")
		fmt.Println("  2. Data Analysis")
		fmt.Println("  3. Content Generation")
		fmt.Println("  4. Task Automation")
		fmt.Println("  5. Research Assistant")
		fmt.Print("\nSelect type (1-5): ")
		var typeChoice int
		fmt.Scanln(&typeChoice)

		var agentType domain.AgentType
		switch typeChoice {
		case 1:
			agentType = domain.AgentTypeGeneral
		case 2:
			agentType = domain.AgentTypeDataAnalysis
		case 3:
			agentType = domain.AgentTypeContentGen
		case 4:
			agentType = domain.AgentTypeAutomation
		case 5:
			agentType = domain.AgentTypeResearch
		default:
			return fmt.Errorf("invalid type selection")
		}

		fmt.Print("\nCapabilities (comma-separated, e.g., nlp,code_gen,api): ")
		fmt.Scanln(&capabilitiesStr)

		capabilities := strings.Split(capabilitiesStr, ",")
		for i := range capabilities {
			capabilities[i] = strings.TrimSpace(capabilities[i])
		}

		// Get wallet password
		fmt.Print("\nEnter wallet password: ")
		passwordBytes, err := term.ReadPassword(int(os.Stdin.Fd()))
		if err != nil {
			return fmt.Errorf("failed to read password: %w", err)
		}
		fmt.Println()

		// Register agent
		params := domain.RegisterAgentParams{
			Name:         name,
			Description:  description,
			AgentType:    agentType,
			Capabilities: capabilities,
			Version:      "1.0.0",
		}

		agent, err := application.AgentService.RegisterAgent(params, string(passwordBytes))
		if err != nil {
			return fmt.Errorf("failed to register agent: %w", err)
		}

		// Display success
		successStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF00")).Bold(true)
		labelStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
		valueStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFFFF"))

		fmt.Println()
		fmt.Println(successStyle.Render("✓ Agent registered successfully!"))
		fmt.Println()
		fmt.Printf("%s %s\n", labelStyle.Render("ID:"), valueStyle.Render(agent.ID))
		fmt.Printf("%s %s\n", labelStyle.Render("Name:"), valueStyle.Render(agent.Name))
		fmt.Printf("%s %s\n", labelStyle.Render("Type:"), valueStyle.Render(agent.AgentType.String()))
		fmt.Printf("%s %s\n", labelStyle.Render("PDA:"), valueStyle.Render(agent.PDA))
		fmt.Printf("%s %s\n", labelStyle.Render("Metadata URI:"), valueStyle.Render(agent.MetadataURI))
		fmt.Println()

		return nil
	},
}

var agentListCmd = &cobra.Command{
	Use:   "list",
	Short: "List your agents",
	Long:  `Display all agents owned by your active wallet.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		agents, err := application.AgentService.ListAgents()
		if err != nil {
			return fmt.Errorf("failed to list agents: %w", err)
		}

		if len(agents) == 0 {
			fmt.Println("No agents found. Register one with 'ghost agent register'")
			return nil
		}

		// Display agents
		titleStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FEF9A7")).Bold(true)
		labelStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
		valueStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFFFF"))
		successStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF00"))

		fmt.Println()
		fmt.Println(titleStyle.Render(fmt.Sprintf("Your Agents (%d total)", len(agents))))
		fmt.Println()

		for _, agent := range agents {
			fmt.Printf("%s %s\n", labelStyle.Render("ID:"), valueStyle.Render(agent.ID))
			fmt.Printf("%s %s\n", labelStyle.Render("Name:"), valueStyle.Render(agent.Name))
			fmt.Printf("%s %s\n", labelStyle.Render("Type:"), valueStyle.Render(agent.AgentType.String()))
			fmt.Printf("%s %s\n", labelStyle.Render("Status:"), successStyle.Render(string(agent.Status)))
			fmt.Printf("%s %d / %d (%.1f%%)\n",
				labelStyle.Render("Jobs:"),
				agent.CompletedJobs,
				agent.TotalJobs,
				agent.SuccessRate,
			)
			fmt.Printf("%s %.4f SOL\n",
				labelStyle.Render("Earnings:"),
				domain.LamportsToSOL(agent.TotalEarnings),
			)
			fmt.Println()
		}

		return nil
	},
}

var agentGetCmd = &cobra.Command{
	Use:   "get <agent-id>",
	Short: "Get agent details",
	Long:  `Display detailed information about a specific agent.`,
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		agentID := args[0]

		agent, err := application.AgentService.GetAgent(agentID)
		if err != nil {
			return fmt.Errorf("failed to get agent: %w", err)
		}

		// Display agent details
		titleStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FEF9A7")).Bold(true)
		labelStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
		valueStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFFFF"))
		successStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF00"))

		fmt.Println()
		fmt.Println(titleStyle.Render("Agent Details"))
		fmt.Println()
		fmt.Printf("%s %s\n", labelStyle.Render("ID:"), valueStyle.Render(agent.ID))
		fmt.Printf("%s %s\n", labelStyle.Render("Name:"), valueStyle.Render(agent.Name))
		fmt.Printf("%s %s\n", labelStyle.Render("Type:"), valueStyle.Render(agent.AgentType.String()))
		fmt.Printf("%s %s\n", labelStyle.Render("Status:"), successStyle.Render(string(agent.Status)))
		fmt.Printf("%s %s\n", labelStyle.Render("Owner:"), valueStyle.Render(agent.Owner))
		fmt.Printf("%s %s\n", labelStyle.Render("PDA:"), valueStyle.Render(agent.PDA))
		fmt.Println()
		fmt.Printf("%s %s\n", labelStyle.Render("Description:"), valueStyle.Render(agent.Description))
		fmt.Printf("%s %s\n", labelStyle.Render("Capabilities:"), valueStyle.Render(strings.Join(agent.Capabilities, ", ")))
		fmt.Printf("%s %s\n", labelStyle.Render("Version:"), valueStyle.Render(agent.Version))
		fmt.Println()
		fmt.Printf("%s %d\n", labelStyle.Render("Total Jobs:"), agent.TotalJobs)
		fmt.Printf("%s %d\n", labelStyle.Render("Completed Jobs:"), agent.CompletedJobs)
		fmt.Printf("%s %.1f%%\n", labelStyle.Render("Success Rate:"), agent.SuccessRate)
		fmt.Printf("%s %.1f / 5.0\n", labelStyle.Render("Average Rating:"), agent.AverageRating)
		fmt.Printf("%s %.4f SOL\n", labelStyle.Render("Total Earnings:"), domain.LamportsToSOL(agent.TotalEarnings))
		fmt.Println()
		fmt.Printf("%s %s\n", labelStyle.Render("Created:"), agent.CreatedAt.Format("2006-01-02 15:04:05"))
		fmt.Printf("%s %s\n", labelStyle.Render("Updated:"), agent.UpdatedAt.Format("2006-01-02 15:04:05"))
		fmt.Println()

		return nil
	},
}

var agentAnalyticsCmd = &cobra.Command{
	Use:   "analytics",
	Short: "View agent analytics",
	Long:  `Display aggregated analytics for all your agents.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		analytics, err := application.AgentService.GetAnalytics()
		if err != nil {
			return fmt.Errorf("failed to get analytics: %w", err)
		}

		// Display analytics
		titleStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FEF9A7")).Bold(true)
		labelStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
		valueStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFFFF"))
		successStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF00"))

		fmt.Println()
		fmt.Println(titleStyle.Render("Agent Analytics"))
		fmt.Println()
		fmt.Println(titleStyle.Render("📈 Overview"))
		fmt.Printf("%s %s\n", labelStyle.Render("Total Agents:"), valueStyle.Render(fmt.Sprintf("%d", analytics.TotalAgents)))
		fmt.Printf("%s %s\n", labelStyle.Render("Active Agents:"), successStyle.Render(fmt.Sprintf("%d", analytics.ActiveAgents)))
		fmt.Printf("%s %d\n", labelStyle.Render("Total Jobs:"), analytics.TotalJobs)
		fmt.Printf("%s %s\n", labelStyle.Render("Completed Jobs:"), successStyle.Render(fmt.Sprintf("%d", analytics.CompletedJobs)))
		fmt.Printf("%s %d\n", labelStyle.Render("In Progress:"), analytics.TotalJobs-analytics.CompletedJobs)
		fmt.Println()
		fmt.Println(titleStyle.Render("💰 Earnings"))
		fmt.Printf("%s %s SOL\n", labelStyle.Render("Total Earnings:"), successStyle.Render(fmt.Sprintf("%.4f", analytics.TotalEarningsSOL)))
		if analytics.CompletedJobs > 0 {
			avgPerJob := analytics.TotalEarningsSOL / float64(analytics.CompletedJobs)
			fmt.Printf("%s %.4f SOL\n", labelStyle.Render("Average/Job:"), avgPerJob)
		}
		fmt.Println()
		fmt.Println(titleStyle.Render("⚡ Performance"))
		fmt.Printf("%s %.1f%%\n", labelStyle.Render("Success Rate:"), analytics.SuccessRate)
		fmt.Printf("%s %.1f / 5.0\n", labelStyle.Render("Average Rating:"), analytics.AverageRating)
		fmt.Println()

		return nil
	},
}

func init() {
	// Add subcommands
	agentCmd.AddCommand(agentRegisterCmd)
	agentCmd.AddCommand(agentListCmd)
	agentCmd.AddCommand(agentGetCmd)
	agentCmd.AddCommand(agentAnalyticsCmd)

	// Add to root
	rootCmd.AddCommand(agentCmd)
}
