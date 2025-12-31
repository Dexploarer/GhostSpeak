package cmd

import (
	"fmt"
	"os"
	"strings"

	"github.com/charmbracelet/lipgloss"
	"github.com/ghostspeak/cli-go/internal/domain"
	"github.com/ghostspeak/cli-go/internal/services"
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

var (
	listLimit    int
	listOffset   int
	listSortBy   string
)

var agentListCmd = &cobra.Command{
	Use:   "list",
	Short: "List your agents",
	Long:  `Display all agents owned by your active wallet.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		// Use search with pagination and sorting
		params := services.SearchAgentsParams{
			Limit:  listLimit,
			Offset: listOffset,
			SortBy: listSortBy,
		}

		agents, err := application.AgentService.SearchAgents(params)
		if err != nil {
			return fmt.Errorf("failed to list agents: %w", err)
		}

		if len(agents) == 0 {
			fmt.Println("No agents found. Register one with 'ghost agent register'")
			return nil
		}

		// Display agents with enhanced output
		displayAgentList(agents, fmt.Sprintf("Your Agents (showing %d)", len(agents)))

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

var (
	searchType     string
	searchMinScore int
	searchVerified bool
	searchTier     string
	searchMinJobs  uint64
)

var agentSearchCmd = &cobra.Command{
	Use:   "search <query>",
	Short: "Search agents with filters",
	Long: `Search agents by name or capabilities with advanced filters.

Examples:
  ghost agent search "data"
  ghost agent search "nlp" --type data_analysis
  ghost agent search "analytics" --min-score 600 --verified
  ghost agent search "code" --tier gold --min-jobs 10`,
	Args: cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		query := args[0]

		// Build search params
		params := services.SearchAgentsParams{
			Query:   query,
			MinScore: searchMinScore,
			Verified: searchVerified,
			MinJobs:  searchMinJobs,
		}

		// Parse agent type
		if searchType != "" {
			var agentType domain.AgentType
			switch searchType {
			case "general":
				agentType = domain.AgentTypeGeneral
			case "data_analysis":
				agentType = domain.AgentTypeDataAnalysis
			case "content_gen":
				agentType = domain.AgentTypeContentGen
			case "automation":
				agentType = domain.AgentTypeAutomation
			case "research":
				agentType = domain.AgentTypeResearch
			default:
				return fmt.Errorf("invalid agent type: %s", searchType)
			}
			params.AgentType = &agentType
		}

		// Parse tier
		if searchTier != "" {
			var tier domain.GhostScoreTier
			switch strings.ToLower(searchTier) {
			case "bronze":
				tier = domain.TierBronze
			case "silver":
				tier = domain.TierSilver
			case "gold":
				tier = domain.TierGold
			case "platinum":
				tier = domain.TierPlatinum
			default:
				return fmt.Errorf("invalid tier: %s", searchTier)
			}
			params.Tier = &tier
		}

		// Search agents
		agents, err := application.AgentService.SearchAgents(params)
		if err != nil {
			return fmt.Errorf("failed to search agents: %w", err)
		}

		if len(agents) == 0 {
			fmt.Printf("No agents found matching query: %s\n", query)
			return nil
		}

		// Display search results
		displayAgentList(agents, fmt.Sprintf("Search Results for '%s' (%d found)", query, len(agents)))

		return nil
	},
}

var (
	topLimit  int
	topSortBy string
)

var agentTopCmd = &cobra.Command{
	Use:   "top",
	Short: "Show top performing agents",
	Long: `Display top agents by earnings, rating, or completed jobs.

Examples:
  ghost agent top
  ghost agent top --limit 20 --sort-by rating
  ghost agent top --sort-by jobs`,
	RunE: func(cmd *cobra.Command, args []string) error {
		agents, err := application.AgentService.GetTopAgents(topLimit, topSortBy)
		if err != nil {
			return fmt.Errorf("failed to get top agents: %w", err)
		}

		if len(agents) == 0 {
			fmt.Println("No agents found")
			return nil
		}

		// Display top agents
		sortLabel := topSortBy
		if sortLabel == "" {
			sortLabel = "earnings"
		}
		displayAgentList(agents, fmt.Sprintf("Top %d Agents by %s", len(agents), strings.Title(sortLabel)))

		return nil
	},
}

func init() {
	// Add subcommands
	agentCmd.AddCommand(agentRegisterCmd)
	agentCmd.AddCommand(agentListCmd)
	agentCmd.AddCommand(agentGetCmd)
	agentCmd.AddCommand(agentAnalyticsCmd)
	agentCmd.AddCommand(agentSearchCmd)
	agentCmd.AddCommand(agentTopCmd)

	// List command flags
	agentListCmd.Flags().IntVar(&listLimit, "limit", 0, "Limit number of results (0 = all)")
	agentListCmd.Flags().IntVar(&listOffset, "offset", 0, "Offset for pagination")
	agentListCmd.Flags().StringVar(&listSortBy, "sort-by", "earnings", "Sort by: earnings, rating, jobs")

	// Search command flags
	agentSearchCmd.Flags().StringVar(&searchType, "type", "", "Filter by agent type (general, data_analysis, content_gen, automation, research)")
	agentSearchCmd.Flags().IntVar(&searchMinScore, "min-score", 0, "Minimum Ghost Score (0-1000)")
	agentSearchCmd.Flags().BoolVar(&searchVerified, "verified", false, "Only show verified agents")
	agentSearchCmd.Flags().StringVar(&searchTier, "tier", "", "Filter by tier (bronze, silver, gold, platinum)")
	agentSearchCmd.Flags().Uint64Var(&searchMinJobs, "min-jobs", 0, "Minimum completed jobs")

	// Top command flags
	agentTopCmd.Flags().IntVar(&topLimit, "limit", 10, "Number of top agents to show")
	agentTopCmd.Flags().StringVar(&topSortBy, "sort-by", "earnings", "Sort by: earnings, rating, jobs")

	// Add to root
	rootCmd.AddCommand(agentCmd)
}

// Helper function to display agent list with enhanced formatting
func displayAgentList(agents []*domain.Agent, title string) {
	titleStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FEF9A7")).Bold(true)
	labelStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
	valueStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFFFF"))
	successStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF00"))

	// Tier colors
	bronzeStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#CD7F32")).Bold(true)
	silverStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#C0C0C0")).Bold(true)
	goldStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFD700")).Bold(true)
	platinumStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#E5E4E2")).Bold(true)

	fmt.Println()
	fmt.Println(titleStyle.Render(title))
	fmt.Println()

	for i, agent := range agents {
		// Get reputation for enhanced display
		rep, err := application.AgentService.GetAgentMetrics(agent.ID)

		// Display agent with badges
		name := agent.Name
		if err == nil && rep.Reputation != nil {
			// Add verification badge
			if rep.Reputation.AdminVerified {
				name += " ✓"
			}

			// Add tier badge with color
			tierBadge := ""
			switch rep.Reputation.Tier {
			case domain.TierBronze:
				tierBadge = bronzeStyle.Render("[BRONZE]")
			case domain.TierSilver:
				tierBadge = silverStyle.Render("[SILVER]")
			case domain.TierGold:
				tierBadge = goldStyle.Render("[GOLD]")
			case domain.TierPlatinum:
				tierBadge = platinumStyle.Render("[PLATINUM]")
			}

			fmt.Printf("%s. %s %s %s\n",
				valueStyle.Render(fmt.Sprintf("%d", i+1)),
				valueStyle.Render(name),
				tierBadge,
				labelStyle.Render(fmt.Sprintf("(Score: %d)", rep.Reputation.GhostScore)))
		} else {
			fmt.Printf("%s. %s\n",
				valueStyle.Render(fmt.Sprintf("%d", i+1)),
				valueStyle.Render(name))
		}

		fmt.Printf("   %s %s | %s %s\n",
			labelStyle.Render("ID:"),
			valueStyle.Render(agent.ID[:16]+"..."),
			labelStyle.Render("Type:"),
			valueStyle.Render(agent.AgentType.String()))

		fmt.Printf("   %s %s | %s %d/%d (%.1f%%)\n",
			labelStyle.Render("Status:"),
			successStyle.Render(string(agent.Status)),
			labelStyle.Render("Jobs:"),
			agent.CompletedJobs,
			agent.TotalJobs,
			agent.SuccessRate)

		fmt.Printf("   %s %.4f SOL | %s %.1f/5.0\n",
			labelStyle.Render("Earnings:"),
			domain.LamportsToSOL(agent.TotalEarnings),
			labelStyle.Render("Rating:"),
			agent.AverageRating)

		fmt.Println()
	}
}

// Helper to get tier badge style
func getTierStyle(tier domain.GhostScoreTier) lipgloss.Style {
	switch tier {
	case domain.TierBronze:
		return lipgloss.NewStyle().Foreground(lipgloss.Color("#CD7F32")).Bold(true)
	case domain.TierSilver:
		return lipgloss.NewStyle().Foreground(lipgloss.Color("#C0C0C0")).Bold(true)
	case domain.TierGold:
		return lipgloss.NewStyle().Foreground(lipgloss.Color("#FFD700")).Bold(true)
	case domain.TierPlatinum:
		return lipgloss.NewStyle().Foreground(lipgloss.Color("#E5E4E2")).Bold(true)
	default:
		return lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
	}
}
