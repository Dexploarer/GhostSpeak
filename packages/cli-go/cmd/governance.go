package cmd

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/charmbracelet/lipgloss"
	"github.com/ghostspeak/cli-go/internal/domain"
	"github.com/spf13/cobra"
	"golang.org/x/term"
)

var governanceCmd = &cobra.Command{
	Use:   "governance",
	Short: "Manage governance and multisig operations",
	Long: `Manage governance proposals, voting, multisig wallets, and RBAC roles.

Commands include creating multisig wallets, submitting proposals, voting,
executing passed proposals, and managing role-based access control.`,
	Aliases: []string{"gov"},
}

// Multisig commands

var multisigCmd = &cobra.Command{
	Use:   "multisig",
	Short: "Manage multisig wallets",
	Long:  `Create and manage multisig governance wallets.`,
}

var multisigCreateCmd = &cobra.Command{
	Use:   "create",
	Short: "Create a new multisig wallet",
	Long: `Create a new multisig wallet with multiple owners and threshold.

The threshold determines how many signatures are required to execute transactions.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		// Get owners
		var ownersInput string
		fmt.Print("Owner addresses (comma-separated): ")
		fmt.Scanln(&ownersInput)

		owners := strings.Split(ownersInput, ",")
		for i := range owners {
			owners[i] = strings.TrimSpace(owners[i])
		}

		// Get threshold
		var thresholdInput string
		fmt.Printf("Threshold (1-%d): ", len(owners))
		fmt.Scanln(&thresholdInput)
		threshold, err := strconv.ParseUint(thresholdInput, 10, 8)
		if err != nil {
			return fmt.Errorf("invalid threshold: %w", err)
		}

		// Get wallet password
		fmt.Print("\nEnter wallet password: ")
		passwordBytes, err := term.ReadPassword(int(os.Stdin.Fd()))
		if err != nil {
			return fmt.Errorf("failed to read password: %w", err)
		}
		fmt.Println()

		// Create multisig
		params := domain.CreateMultisigParams{
			Owners:    owners,
			Threshold: uint8(threshold),
		}

		multisig, err := application.GovernanceService.CreateMultisig(params, string(passwordBytes))
		if err != nil {
			return fmt.Errorf("failed to create multisig: %w", err)
		}

		// Display success
		successStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF00")).Bold(true)
		labelStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
		valueStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFFFF"))

		fmt.Println()
		fmt.Println(successStyle.Render("✓ Multisig wallet created successfully!"))
		fmt.Println()
		fmt.Printf("%s %s\n", labelStyle.Render("Address:"), valueStyle.Render(multisig.Address))
		fmt.Printf("%s %s\n", labelStyle.Render("PDA:"), valueStyle.Render(multisig.PDA))
		fmt.Printf("%s %d\n", labelStyle.Render("Owners:"), len(multisig.Owners))
		fmt.Printf("%s %d\n", labelStyle.Render("Threshold:"), multisig.Threshold)
		fmt.Println()

		return nil
	},
}

var multisigListCmd = &cobra.Command{
	Use:   "list",
	Short: "List your multisig wallets",
	Long:  `Display all multisig wallets where you are an owner.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		multisigs, err := application.GovernanceService.ListMultisigs()
		if err != nil {
			return fmt.Errorf("failed to list multisigs: %w", err)
		}

		if len(multisigs) == 0 {
			fmt.Println("No multisig wallets found. Create one with 'ghost governance multisig create'")
			return nil
		}

		// Display multisigs
		titleStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FEF9A7")).Bold(true)
		labelStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
		valueStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFFFF"))

		fmt.Println()
		fmt.Println(titleStyle.Render(fmt.Sprintf("Your Multisig Wallets (%d total)", len(multisigs))))
		fmt.Println()

		for i, multisig := range multisigs {
			fmt.Printf("%s. %s\n",
				valueStyle.Render(fmt.Sprintf("%d", i+1)),
				valueStyle.Render(multisig.Address))
			fmt.Printf("   %s %d/%d | %s %d | %s %d\n",
				labelStyle.Render("Threshold:"),
				multisig.Threshold,
				len(multisig.Owners),
				labelStyle.Render("Proposals:"),
				multisig.ProposalCount,
				labelStyle.Render("Executed:"),
				multisig.ExecutedCount)
			fmt.Printf("   %s %.4f SOL\n",
				labelStyle.Render("Treasury:"),
				domain.LamportsToSOL(multisig.TreasuryBalance))
			fmt.Println()
		}

		return nil
	},
}

// Proposal commands

var proposalCmd = &cobra.Command{
	Use:   "proposal",
	Short: "Manage governance proposals",
	Long:  `Create, view, and manage governance proposals.`,
}

var proposalCreateCmd = &cobra.Command{
	Use:   "create",
	Short: "Create a new proposal",
	Long: `Create a new governance proposal.

Proposal types:
  - parameter_change: Change protocol parameters
  - treasury_spend: Spend from treasury
  - upgrade_program: Upgrade on-chain program
  - emergency: Emergency action
  - general: General governance decision`,
	RunE: func(cmd *cobra.Command, args []string) error {
		// Get proposal details
		var title, description string

		fmt.Print("Proposal title: ")
		fmt.Scanln(&title)

		fmt.Print("Description: ")
		fmt.Scanln(&description)

		// Get proposal type
		fmt.Println("\nProposal types:")
		fmt.Println("  1. Parameter Change")
		fmt.Println("  2. Treasury Spend")
		fmt.Println("  3. Upgrade Program")
		fmt.Println("  4. Emergency")
		fmt.Println("  5. General")
		fmt.Print("\nSelect type (1-5): ")
		var typeChoice int
		fmt.Scanln(&typeChoice)

		var proposalType domain.ProposalType
		switch typeChoice {
		case 1:
			proposalType = domain.ProposalTypeParameterChange
		case 2:
			proposalType = domain.ProposalTypeTreasurySpend
		case 3:
			proposalType = domain.ProposalTypeUpgradeProgram
		case 4:
			proposalType = domain.ProposalTypeEmergency
		case 5:
			proposalType = domain.ProposalTypeGeneral
		default:
			return fmt.Errorf("invalid type selection")
		}

		// Get voting period
		fmt.Print("\nVoting period (days, 1-30): ")
		var days int
		fmt.Scanln(&days)
		if days < 1 || days > 30 {
			return fmt.Errorf("voting period must be 1-30 days")
		}

		// Get wallet password
		fmt.Print("\nEnter wallet password: ")
		passwordBytes, err := term.ReadPassword(int(os.Stdin.Fd()))
		if err != nil {
			return fmt.Errorf("failed to read password: %w", err)
		}
		fmt.Println()

		// Create proposal
		params := domain.CreateProposalParams{
			Type:         proposalType,
			Title:        title,
			Description:  description,
			VotingPeriod: uint64(days * 24 * 60 * 60), // Convert days to seconds
		}

		proposal, err := application.GovernanceService.CreateProposal(params, string(passwordBytes))
		if err != nil {
			return fmt.Errorf("failed to create proposal: %w", err)
		}

		// Display success
		successStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF00")).Bold(true)
		labelStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
		valueStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFFFF"))

		fmt.Println()
		fmt.Println(successStyle.Render("✓ Proposal created successfully!"))
		fmt.Println()
		fmt.Printf("%s %s\n", labelStyle.Render("ID:"), valueStyle.Render(proposal.ID))
		fmt.Printf("%s %s\n", labelStyle.Render("Title:"), valueStyle.Render(proposal.Title))
		fmt.Printf("%s %s\n", labelStyle.Render("Type:"), valueStyle.Render(string(proposal.Type)))
		fmt.Printf("%s %s\n", labelStyle.Render("Voting Starts:"), proposal.VotingStartsAt.Format("2006-01-02 15:04:05"))
		fmt.Printf("%s %s\n", labelStyle.Render("Voting Ends:"), proposal.VotingEndsAt.Format("2006-01-02 15:04:05"))
		fmt.Println()

		return nil
	},
}

var proposalListCmd = &cobra.Command{
	Use:   "list",
	Short: "List governance proposals",
	Long:  `Display all governance proposals with optional status filter.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		// Get status filter from flags
		statusFilter, _ := cmd.Flags().GetString("status")
		var status *domain.ProposalStatus
		if statusFilter != "" {
			s := domain.ProposalStatus(statusFilter)
			status = &s
		}

		proposals, err := application.GovernanceService.ListProposals(status)
		if err != nil {
			return fmt.Errorf("failed to list proposals: %w", err)
		}

		if len(proposals) == 0 {
			fmt.Println("No proposals found. Create one with 'ghost governance proposal create'")
			return nil
		}

		// Display proposals
		titleStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FEF9A7")).Bold(true)
		labelStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
		valueStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFFFF"))

		filterLabel := "All Proposals"
		if statusFilter != "" {
			filterLabel = fmt.Sprintf("%s Proposals", strings.Title(statusFilter))
		}

		fmt.Println()
		fmt.Println(titleStyle.Render(fmt.Sprintf("%s (%d total)", filterLabel, len(proposals))))
		fmt.Println()

		for _, proposal := range proposals {
			// Status color
			statusStyle := getProposalStatusStyle(proposal.Status)

			fmt.Printf("%s %s %s\n",
				valueStyle.Render(proposal.Title),
				statusStyle.Render(string(proposal.Status)),
				labelStyle.Render(fmt.Sprintf("(ID: %s)", proposal.ID[:16]+"...")))

			fmt.Printf("   %s %s | %s %s\n",
				labelStyle.Render("Type:"),
				valueStyle.Render(string(proposal.Type)),
				labelStyle.Render("Proposer:"),
				valueStyle.Render(proposal.Proposer[:16]+"..."))

			// Voting stats
			approvalRate := proposal.GetApprovalRate()
			quorumProgress := proposal.GetQuorumProgress()

			fmt.Printf("   %s For: %d, Against: %d, Abstain: %d\n",
				labelStyle.Render("Votes:"),
				proposal.VotesFor,
				proposal.VotesAgainst,
				proposal.VotesAbstain)

			fmt.Printf("   %s %.1f%% | %s %.1f%%\n",
				labelStyle.Render("Approval:"),
				approvalRate,
				labelStyle.Render("Quorum:"),
				quorumProgress)

			// Time remaining
			if proposal.Status == domain.ProposalStatusActive {
				remaining := proposal.GetTimeRemaining()
				fmt.Printf("   %s %s\n",
					labelStyle.Render("Time Remaining:"),
					formatDuration(remaining))
			}

			fmt.Println()
		}

		return nil
	},
}

var proposalGetCmd = &cobra.Command{
	Use:   "get <proposal-id>",
	Short: "Get proposal details",
	Long:  `Display detailed information about a specific proposal.`,
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		proposalID := args[0]

		proposal, err := application.GovernanceService.GetProposal(proposalID)
		if err != nil {
			return fmt.Errorf("failed to get proposal: %w", err)
		}

		// Display proposal details
		titleStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FEF9A7")).Bold(true)
		labelStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
		valueStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFFFF"))
		statusStyle := getProposalStatusStyle(proposal.Status)

		fmt.Println()
		fmt.Println(titleStyle.Render("Proposal Details"))
		fmt.Println()
		fmt.Printf("%s %s\n", labelStyle.Render("ID:"), valueStyle.Render(proposal.ID))
		fmt.Printf("%s %s\n", labelStyle.Render("Title:"), valueStyle.Render(proposal.Title))
		fmt.Printf("%s %s\n", labelStyle.Render("Status:"), statusStyle.Render(string(proposal.Status)))
		fmt.Printf("%s %s\n", labelStyle.Render("Type:"), valueStyle.Render(string(proposal.Type)))
		fmt.Printf("%s %s\n", labelStyle.Render("Proposer:"), valueStyle.Render(proposal.Proposer))
		fmt.Println()
		fmt.Printf("%s %s\n", labelStyle.Render("Description:"), valueStyle.Render(proposal.Description))
		fmt.Println()

		// Voting information
		fmt.Println(titleStyle.Render("Voting"))
		fmt.Printf("%s %s to %s\n",
			labelStyle.Render("Period:"),
			proposal.VotingStartsAt.Format("2006-01-02 15:04:05"),
			proposal.VotingEndsAt.Format("2006-01-02 15:04:05"))

		if proposal.Status == domain.ProposalStatusActive {
			remaining := proposal.GetTimeRemaining()
			fmt.Printf("%s %s\n", labelStyle.Render("Time Remaining:"), formatDuration(remaining))
		}

		fmt.Println()
		fmt.Printf("%s %d (%.1f%%)\n",
			labelStyle.Render("For:"),
			proposal.VotesFor,
			float64(proposal.VotesFor)/float64(proposal.GetTotalVotes())*100)
		fmt.Printf("%s %d (%.1f%%)\n",
			labelStyle.Render("Against:"),
			proposal.VotesAgainst,
			float64(proposal.VotesAgainst)/float64(proposal.GetTotalVotes())*100)
		fmt.Printf("%s %d (%.1f%%)\n",
			labelStyle.Render("Abstain:"),
			proposal.VotesAbstain,
			float64(proposal.VotesAbstain)/float64(proposal.GetTotalVotes())*100)
		fmt.Println()

		fmt.Printf("%s %.1f%%\n", labelStyle.Render("Approval Rate:"), proposal.GetApprovalRate())
		fmt.Printf("%s %.1f%% (required: %d votes)\n",
			labelStyle.Render("Quorum Progress:"),
			proposal.GetQuorumProgress(),
			proposal.QuorumRequired)
		fmt.Println()

		// Execution info
		if proposal.ExecutedAt != nil {
			fmt.Printf("%s %s\n",
				labelStyle.Render("Executed At:"),
				proposal.ExecutedAt.Format("2006-01-02 15:04:05"))
		}

		return nil
	},
}

// Vote command

var voteCmd = &cobra.Command{
	Use:   "vote <proposal-id>",
	Short: "Vote on a proposal",
	Long: `Cast your vote on an active proposal.

Vote choices:
  - for: Vote in favor of the proposal
  - against: Vote against the proposal
  - abstain: Abstain from voting`,
	Args: cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		proposalID := args[0]

		// Get vote choice
		fmt.Println("Vote choices:")
		fmt.Println("  1. For")
		fmt.Println("  2. Against")
		fmt.Println("  3. Abstain")
		fmt.Print("\nSelect choice (1-3): ")
		var choice int
		fmt.Scanln(&choice)

		var voteChoice domain.VoteChoice
		switch choice {
		case 1:
			voteChoice = domain.VoteChoiceFor
		case 2:
			voteChoice = domain.VoteChoiceAgainst
		case 3:
			voteChoice = domain.VoteChoiceAbstain
		default:
			return fmt.Errorf("invalid choice")
		}

		// Get wallet password
		fmt.Print("\nEnter wallet password: ")
		passwordBytes, err := term.ReadPassword(int(os.Stdin.Fd()))
		if err != nil {
			return fmt.Errorf("failed to read password: %w", err)
		}
		fmt.Println()

		// Cast vote
		params := domain.VoteParams{
			ProposalPDA: proposalID,
			Choice:      voteChoice,
		}

		vote, err := application.GovernanceService.Vote(params, string(passwordBytes))
		if err != nil {
			return fmt.Errorf("failed to vote: %w", err)
		}

		// Display success
		successStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF00")).Bold(true)
		labelStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
		valueStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFFFF"))

		fmt.Println()
		fmt.Println(successStyle.Render("✓ Vote cast successfully!"))
		fmt.Println()
		fmt.Printf("%s %s\n", labelStyle.Render("Proposal:"), valueStyle.Render(vote.ProposalID[:16]+"..."))
		fmt.Printf("%s %s\n", labelStyle.Render("Choice:"), valueStyle.Render(string(vote.Choice)))
		fmt.Printf("%s %d\n", labelStyle.Render("Weight:"), vote.Weight)
		fmt.Println()

		return nil
	},
}

// Execute command

var executeCmd = &cobra.Command{
	Use:   "execute <proposal-id>",
	Short: "Execute a passed proposal",
	Long:  `Execute a proposal that has passed voting and meets quorum requirements.`,
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		proposalID := args[0]

		// Get wallet password
		fmt.Print("Enter wallet password: ")
		passwordBytes, err := term.ReadPassword(int(os.Stdin.Fd()))
		if err != nil {
			return fmt.Errorf("failed to read password: %w", err)
		}
		fmt.Println()

		// Execute proposal
		if err := application.GovernanceService.ExecuteProposal(proposalID, string(passwordBytes)); err != nil {
			return fmt.Errorf("failed to execute proposal: %w", err)
		}

		// Display success
		successStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF00")).Bold(true)

		fmt.Println()
		fmt.Println(successStyle.Render("✓ Proposal executed successfully!"))
		fmt.Println()

		return nil
	},
}

// Role commands

var roleCmd = &cobra.Command{
	Use:   "role",
	Short: "Manage RBAC roles",
	Long:  `Grant and revoke governance roles for role-based access control.`,
}

var roleGrantCmd = &cobra.Command{
	Use:   "grant <address> <role>",
	Short: "Grant a role to an address",
	Long: `Grant a governance role to an address.

Available roles:
  - admin: Full administrative access
  - moderator: Content moderation and proposal management
  - verifier: Can verify agents and credentials
  - user: Basic user permissions`,
	Args: cobra.ExactArgs(2),
	RunE: func(cmd *cobra.Command, args []string) error {
		address := args[0]
		roleStr := args[1]

		// Parse role
		var role domain.Role
		switch strings.ToLower(roleStr) {
		case "admin":
			role = domain.RoleAdmin
		case "moderator":
			role = domain.RoleModerator
		case "verifier":
			role = domain.RoleVerifier
		case "user":
			role = domain.RoleUser
		default:
			return fmt.Errorf("invalid role: %s", roleStr)
		}

		// Get wallet password
		fmt.Print("Enter wallet password: ")
		passwordBytes, err := term.ReadPassword(int(os.Stdin.Fd()))
		if err != nil {
			return fmt.Errorf("failed to read password: %w", err)
		}
		fmt.Println()

		// Grant role
		params := domain.GrantRoleParams{
			Address: address,
			Role:    role,
		}

		assignment, err := application.GovernanceService.GrantRole(params, string(passwordBytes))
		if err != nil {
			return fmt.Errorf("failed to grant role: %w", err)
		}

		// Display success
		successStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF00")).Bold(true)
		labelStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
		valueStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFFFF"))

		fmt.Println()
		fmt.Println(successStyle.Render("✓ Role granted successfully!"))
		fmt.Println()
		fmt.Printf("%s %s\n", labelStyle.Render("Address:"), valueStyle.Render(assignment.Address))
		fmt.Printf("%s %s\n", labelStyle.Render("Role:"), valueStyle.Render(string(assignment.Role)))
		fmt.Printf("%s %s\n", labelStyle.Render("Granted By:"), valueStyle.Render(assignment.GrantedBy))
		fmt.Println()

		// Show permissions
		permissions := domain.GetRolePermissions(assignment.Role)
		fmt.Println(labelStyle.Render("Permissions:"))
		for _, perm := range permissions {
			fmt.Printf("  - %s\n", string(perm))
		}
		fmt.Println()

		return nil
	},
}

var roleRevokeCmd = &cobra.Command{
	Use:   "revoke <address> <role>",
	Short: "Revoke a role from an address",
	Long:  `Revoke a governance role from an address.`,
	Args:  cobra.ExactArgs(2),
	RunE: func(cmd *cobra.Command, args []string) error {
		address := args[0]
		roleStr := args[1]

		// Parse role
		var role domain.Role
		switch strings.ToLower(roleStr) {
		case "admin":
			role = domain.RoleAdmin
		case "moderator":
			role = domain.RoleModerator
		case "verifier":
			role = domain.RoleVerifier
		case "user":
			role = domain.RoleUser
		default:
			return fmt.Errorf("invalid role: %s", roleStr)
		}

		// Get wallet password
		fmt.Print("Enter wallet password: ")
		passwordBytes, err := term.ReadPassword(int(os.Stdin.Fd()))
		if err != nil {
			return fmt.Errorf("failed to read password: %w", err)
		}
		fmt.Println()

		// Revoke role
		params := domain.RevokeRoleParams{
			Address: address,
			Role:    role,
		}

		if err := application.GovernanceService.RevokeRole(params, string(passwordBytes)); err != nil {
			return fmt.Errorf("failed to revoke role: %w", err)
		}

		// Display success
		successStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF00")).Bold(true)

		fmt.Println()
		fmt.Println(successStyle.Render("✓ Role revoked successfully!"))
		fmt.Println()

		return nil
	},
}

func init() {
	// Multisig subcommands
	multisigCmd.AddCommand(multisigCreateCmd)
	multisigCmd.AddCommand(multisigListCmd)

	// Proposal subcommands
	proposalCmd.AddCommand(proposalCreateCmd)
	proposalCmd.AddCommand(proposalListCmd)
	proposalCmd.AddCommand(proposalGetCmd)

	// Proposal list flags
	proposalListCmd.Flags().String("status", "", "Filter by status (active, passed, failed, executed, canceled)")

	// Role subcommands
	roleCmd.AddCommand(roleGrantCmd)
	roleCmd.AddCommand(roleRevokeCmd)

	// Add to governance
	governanceCmd.AddCommand(multisigCmd)
	governanceCmd.AddCommand(proposalCmd)
	governanceCmd.AddCommand(voteCmd)
	governanceCmd.AddCommand(executeCmd)
	governanceCmd.AddCommand(roleCmd)

	// Add to root
	rootCmd.AddCommand(governanceCmd)
}

// Helper functions

func getProposalStatusStyle(status domain.ProposalStatus) lipgloss.Style {
	switch status {
	case domain.ProposalStatusActive:
		return lipgloss.NewStyle().Foreground(lipgloss.Color("#FEF9A7")).Bold(true) // Yellow
	case domain.ProposalStatusPassed:
		return lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF00")).Bold(true) // Green
	case domain.ProposalStatusFailed:
		return lipgloss.NewStyle().Foreground(lipgloss.Color("#FF0000")).Bold(true) // Red
	case domain.ProposalStatusExecuted:
		return lipgloss.NewStyle().Foreground(lipgloss.Color("#00FFFF")).Bold(true) // Cyan
	case domain.ProposalStatusCanceled:
		return lipgloss.NewStyle().Foreground(lipgloss.Color("#888888")).Bold(true) // Gray
	default:
		return lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFFFF"))
	}
}

func formatDuration(d time.Duration) string {
	if d < 0 {
		return "Expired"
	}

	days := int(d.Hours() / 24)
	hours := int(d.Hours()) % 24
	minutes := int(d.Minutes()) % 60

	if days > 0 {
		return fmt.Sprintf("%dd %dh %dm", days, hours, minutes)
	} else if hours > 0 {
		return fmt.Sprintf("%dh %dm", hours, minutes)
	} else {
		return fmt.Sprintf("%dm", minutes)
	}
}
