package cmd

import (
	"fmt"
	"os"
	"time"

	"github.com/charmbracelet/lipgloss"
	"github.com/ghostspeak/cli-go/internal/domain"
	"github.com/spf13/cobra"
	"golang.org/x/term"
)

var escrowCmd = &cobra.Command{
	Use:   "escrow",
	Short: "Manage Ghost Protect escrow payments",
	Long: `Manage Ghost Protect escrow system for secure job payments.

Ghost Protect provides escrow services for payments between clients and agents,
supporting multiple tokens (SOL, USDC, USDT, GHOST) with dispute resolution.`,
}

var escrowCreateCmd = &cobra.Command{
	Use:   "create",
	Short: "Create a new escrow",
	Long: `Create a new escrow account for a job payment.

This will create an escrow that holds funds until the job is completed.
You'll be prompted for job details, agent address, amount, and payment token.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		// Get active wallet
		activeWallet, err := application.WalletService.GetActiveWallet()
		if err != nil {
			return fmt.Errorf("no active wallet: %w", err)
		}

		labelStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
		inputStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFFFF"))

		fmt.Println()
		fmt.Println(lipgloss.NewStyle().Foreground(lipgloss.Color("#FEF9A7")).Bold(true).Render("Create Escrow"))
		fmt.Println()

		// Get job ID
		fmt.Print(labelStyle.Render("Job ID: "))
		var jobID string
		fmt.Scanln(&jobID)

		// Get agent address
		fmt.Print(labelStyle.Render("Agent Address: "))
		var agentAddress string
		fmt.Scanln(&agentAddress)

		// Get description
		fmt.Print(labelStyle.Render("Description: "))
		var description string
		fmt.Scanln(&description)

		// Token selection
		fmt.Println()
		fmt.Println(labelStyle.Render("Select payment token:"))
		fmt.Println(inputStyle.Render("1. SOL (9 decimals)"))
		fmt.Println(inputStyle.Render("2. USDC (6 decimals)"))
		fmt.Println(inputStyle.Render("3. USDT (6 decimals)"))
		fmt.Println(inputStyle.Render("4. GHOST (9 decimals)"))
		fmt.Print(labelStyle.Render("Choice (1-4): "))

		var tokenChoice int
		fmt.Scanln(&tokenChoice)

		var token domain.PaymentToken
		switch tokenChoice {
		case 1:
			token = domain.TokenSOL
		case 2:
			token = domain.TokenUSDC
		case 3:
			token = domain.TokenUSDT
		case 4:
			token = domain.TokenGHOST
		default:
			return fmt.Errorf("invalid token choice")
		}

		// Get amount
		fmt.Print(labelStyle.Render(fmt.Sprintf("Amount (%s): ", token)))
		var amountStr string
		fmt.Scanln(&amountStr)

		amount, err := domain.ParseTokenAmount(amountStr, token)
		if err != nil {
			return fmt.Errorf("invalid amount: %w", err)
		}

		// Get password
		fmt.Print(labelStyle.Render("Wallet password: "))
		passwordBytes, err := term.ReadPassword(int(os.Stdin.Fd()))
		if err != nil {
			return fmt.Errorf("failed to read password: %w", err)
		}
		fmt.Println()
		password := string(passwordBytes)

		// Create escrow
		params := domain.CreateEscrowParams{
			JobID:       jobID,
			Agent:       agentAddress,
			Amount:      amount,
			Token:       token,
			Description: description,
		}

		escrow, err := application.EscrowService.CreateEscrow(params, password)
		if err != nil {
			return fmt.Errorf("failed to create escrow: %w", err)
		}

		// Display success
		successStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF00")).Bold(true)
		valueStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFFFF"))

		fmt.Println()
		fmt.Println(successStyle.Render("✓ Escrow created successfully!"))
		fmt.Println()
		fmt.Printf("%s %s\n", labelStyle.Render("Escrow ID:"), valueStyle.Render(escrow.ID))
		fmt.Printf("%s %s\n", labelStyle.Render("Client:"), valueStyle.Render(activeWallet.PublicKey))
		fmt.Printf("%s %s\n", labelStyle.Render("Agent:"), valueStyle.Render(escrow.Agent))
		fmt.Printf("%s %s\n", labelStyle.Render("Amount:"), valueStyle.Render(escrow.GetFormattedAmount()))
		fmt.Printf("%s %s %s\n", labelStyle.Render("Status:"), escrow.GetStatusEmoji(), valueStyle.Render(string(escrow.Status)))
		fmt.Println()
		fmt.Println(labelStyle.Render("Next step: Fund the escrow with 'ghost escrow fund " + escrow.ID + "'"))
		fmt.Println()

		return nil
	},
}

var escrowFundCmd = &cobra.Command{
	Use:   "fund <escrow-id>",
	Short: "Fund an escrow",
	Long: `Fund an escrow account by transferring tokens to it.

Only the client can fund an escrow. This transfers the specified amount
to the escrow account on-chain.`,
	Args: cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		escrowID := args[0]

		labelStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))

		// Get password
		fmt.Print(labelStyle.Render("Wallet password: "))
		passwordBytes, err := term.ReadPassword(int(os.Stdin.Fd()))
		if err != nil {
			return fmt.Errorf("failed to read password: %w", err)
		}
		fmt.Println()
		password := string(passwordBytes)

		// Fund escrow
		escrow, err := application.EscrowService.FundEscrow(escrowID, password)
		if err != nil {
			return fmt.Errorf("failed to fund escrow: %w", err)
		}

		// Display success
		successStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF00")).Bold(true)
		valueStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFFFF"))

		fmt.Println()
		fmt.Println(successStyle.Render("✓ Escrow funded successfully!"))
		fmt.Println()
		fmt.Printf("%s %s\n", labelStyle.Render("Escrow ID:"), valueStyle.Render(escrow.ID))
		fmt.Printf("%s %s\n", labelStyle.Render("Amount:"), valueStyle.Render(escrow.GetFormattedAmount()))
		fmt.Printf("%s %s %s\n", labelStyle.Render("Status:"), escrow.GetStatusEmoji(), valueStyle.Render(string(escrow.Status)))
		fmt.Println()

		return nil
	},
}

var escrowReleaseCmd = &cobra.Command{
	Use:   "release <escrow-id>",
	Short: "Release payment to agent",
	Long: `Release escrow payment to the agent.

Only the client can release payment. This transfers the funds from the
escrow account to the agent's wallet.`,
	Args: cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		escrowID := args[0]

		labelStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))

		// Get password
		fmt.Print(labelStyle.Render("Wallet password: "))
		passwordBytes, err := term.ReadPassword(int(os.Stdin.Fd()))
		if err != nil {
			return fmt.Errorf("failed to read password: %w", err)
		}
		fmt.Println()
		password := string(passwordBytes)

		// Release payment
		escrow, err := application.EscrowService.ReleasePayment(escrowID, password)
		if err != nil {
			return fmt.Errorf("failed to release payment: %w", err)
		}

		// Display success
		successStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF00")).Bold(true)
		valueStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFFFF"))

		fmt.Println()
		fmt.Println(successStyle.Render("✓ Payment released to agent!"))
		fmt.Println()
		fmt.Printf("%s %s\n", labelStyle.Render("Escrow ID:"), valueStyle.Render(escrow.ID))
		fmt.Printf("%s %s\n", labelStyle.Render("Agent:"), valueStyle.Render(escrow.Agent))
		fmt.Printf("%s %s\n", labelStyle.Render("Amount:"), valueStyle.Render(escrow.GetFormattedAmount()))
		fmt.Printf("%s %s %s\n", labelStyle.Render("Status:"), escrow.GetStatusEmoji(), valueStyle.Render(string(escrow.Status)))
		fmt.Println()

		return nil
	},
}

var escrowCancelCmd = &cobra.Command{
	Use:   "cancel <escrow-id>",
	Short: "Cancel escrow and refund",
	Long: `Cancel an escrow and refund the client.

Only the client can cancel an escrow. This refunds the tokens from the
escrow account back to the client's wallet.`,
	Args: cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		escrowID := args[0]

		labelStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))

		// Get password
		fmt.Print(labelStyle.Render("Wallet password: "))
		passwordBytes, err := term.ReadPassword(int(os.Stdin.Fd()))
		if err != nil {
			return fmt.Errorf("failed to read password: %w", err)
		}
		fmt.Println()
		password := string(passwordBytes)

		// Cancel escrow
		escrow, err := application.EscrowService.CancelEscrow(escrowID, password)
		if err != nil {
			return fmt.Errorf("failed to cancel escrow: %w", err)
		}

		// Display success
		successStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF00")).Bold(true)
		valueStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFFFF"))

		fmt.Println()
		fmt.Println(successStyle.Render("✓ Escrow cancelled and refunded!"))
		fmt.Println()
		fmt.Printf("%s %s\n", labelStyle.Render("Escrow ID:"), valueStyle.Render(escrow.ID))
		fmt.Printf("%s %s\n", labelStyle.Render("Amount Refunded:"), valueStyle.Render(escrow.GetFormattedAmount()))
		fmt.Printf("%s %s %s\n", labelStyle.Render("Status:"), escrow.GetStatusEmoji(), valueStyle.Render(string(escrow.Status)))
		fmt.Println()

		return nil
	},
}

var escrowDisputeCmd = &cobra.Command{
	Use:   "dispute <escrow-id>",
	Short: "Create a dispute",
	Long: `Create a dispute for an escrow.

Either the client or agent can create a dispute if there are issues
with the job or payment.`,
	Args: cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		escrowID := args[0]

		labelStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))

		// Get dispute reason
		fmt.Print(labelStyle.Render("Dispute reason: "))
		var reason string
		fmt.Scanln(&reason)

		// Get password
		fmt.Print(labelStyle.Render("Wallet password: "))
		passwordBytes, err := term.ReadPassword(int(os.Stdin.Fd()))
		if err != nil {
			return fmt.Errorf("failed to read password: %w", err)
		}
		fmt.Println()
		password := string(passwordBytes)

		// Create dispute
		escrow, err := application.EscrowService.CreateDispute(escrowID, reason, password)
		if err != nil {
			return fmt.Errorf("failed to create dispute: %w", err)
		}

		// Display success
		warnStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFA500")).Bold(true)
		valueStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFFFF"))

		fmt.Println()
		fmt.Println(warnStyle.Render("⚠ Dispute created!"))
		fmt.Println()
		fmt.Printf("%s %s\n", labelStyle.Render("Escrow ID:"), valueStyle.Render(escrow.ID))
		fmt.Printf("%s %s\n", labelStyle.Render("Dispute ID:"), valueStyle.Render(escrow.Dispute.ID))
		fmt.Printf("%s %s\n", labelStyle.Render("Reason:"), valueStyle.Render(escrow.Dispute.Reason))
		fmt.Printf("%s %s %s\n", labelStyle.Render("Status:"), escrow.GetStatusEmoji(), valueStyle.Render(string(escrow.Status)))
		fmt.Println()
		fmt.Println(labelStyle.Render("A mediator will review this dispute and provide resolution."))
		fmt.Println()

		return nil
	},
}

var escrowListCmd = &cobra.Command{
	Use:   "list",
	Short: "List escrows",
	Long: `List all escrows for the active wallet.

Shows escrows where you are either the client or agent, with their
current status and amounts.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		// Get active wallet
		activeWallet, err := application.WalletService.GetActiveWallet()
		if err != nil {
			return fmt.Errorf("no active wallet: %w", err)
		}

		// Get status filter
		statusFilter, _ := cmd.Flags().GetString("status")
		var statusPtr *domain.EscrowStatus
		if statusFilter != "" {
			status := domain.EscrowStatus(statusFilter)
			statusPtr = &status
		}

		// List escrows
		escrows, err := application.EscrowService.ListEscrows(activeWallet.PublicKey, statusPtr)
		if err != nil {
			return fmt.Errorf("failed to list escrows: %w", err)
		}

		if len(escrows) == 0 {
			fmt.Println()
			fmt.Println("No escrows found. Create one with 'ghost escrow create'")
			fmt.Println()
			return nil
		}

		// Display escrows
		titleStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FEF9A7")).Bold(true)
		labelStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
		valueStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFFFF"))

		fmt.Println()
		fmt.Println(titleStyle.Render("Your Escrows"))
		fmt.Println()

		for _, escrow := range escrows {
			role := "Client"
			if escrow.Agent == activeWallet.PublicKey {
				role = "Agent"
			}

			fmt.Printf("%s %s\n", escrow.GetStatusEmoji(), valueStyle.Render(escrow.ID[:16]+"..."))
			fmt.Printf("  %s %s\n", labelStyle.Render("Role:"), valueStyle.Render(role))
			fmt.Printf("  %s %s\n", labelStyle.Render("Amount:"), valueStyle.Render(escrow.GetFormattedAmount()))
			fmt.Printf("  %s %s\n", labelStyle.Render("Status:"), valueStyle.Render(string(escrow.Status)))
			if escrow.JobID != "" {
				fmt.Printf("  %s %s\n", labelStyle.Render("Job ID:"), valueStyle.Render(escrow.JobID))
			}
			if escrow.Description != "" {
				fmt.Printf("  %s %s\n", labelStyle.Render("Description:"), valueStyle.Render(escrow.Description))
			}
			fmt.Println()
		}

		return nil
	},
}

var escrowGetCmd = &cobra.Command{
	Use:   "get <escrow-id>",
	Short: "Get escrow details",
	Long:  `View detailed information about a specific escrow.`,
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		escrowID := args[0]

		// Get escrow
		escrow, err := application.EscrowService.GetEscrow(escrowID)
		if err != nil {
			return fmt.Errorf("failed to get escrow: %w", err)
		}

		// Get active wallet
		activeWallet, err := application.WalletService.GetActiveWallet()
		if err != nil {
			return fmt.Errorf("no active wallet: %w", err)
		}

		// Display details
		titleStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FEF9A7")).Bold(true)
		labelStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
		valueStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFFFF"))

		role := "Client"
		if escrow.Agent == activeWallet.PublicKey {
			role = "Agent"
		}

		fmt.Println()
		fmt.Println(titleStyle.Render("Escrow Details"))
		fmt.Println()
		fmt.Printf("%s %s\n", labelStyle.Render("ID:"), valueStyle.Render(escrow.ID))
		fmt.Printf("%s %s %s\n", labelStyle.Render("Status:"), escrow.GetStatusEmoji(), valueStyle.Render(string(escrow.Status)))
		fmt.Printf("%s %s\n", labelStyle.Render("Your Role:"), valueStyle.Render(role))
		fmt.Println()
		fmt.Printf("%s %s\n", labelStyle.Render("Client:"), valueStyle.Render(escrow.Client))
		fmt.Printf("%s %s\n", labelStyle.Render("Agent:"), valueStyle.Render(escrow.Agent))
		fmt.Println()
		fmt.Printf("%s %s\n", labelStyle.Render("Amount:"), valueStyle.Render(escrow.GetFormattedAmount()))
		fmt.Printf("%s %s\n", labelStyle.Render("Token:"), valueStyle.Render(escrow.TokenSymbol))
		fmt.Println()
		if escrow.JobID != "" {
			fmt.Printf("%s %s\n", labelStyle.Render("Job ID:"), valueStyle.Render(escrow.JobID))
		}
		if escrow.Description != "" {
			fmt.Printf("%s %s\n", labelStyle.Render("Description:"), valueStyle.Render(escrow.Description))
		}
		fmt.Printf("%s %s\n", labelStyle.Render("Created:"), valueStyle.Render(escrow.CreatedAt.Format(time.RFC3339)))
		if escrow.FundedAt != nil {
			fmt.Printf("%s %s\n", labelStyle.Render("Funded:"), valueStyle.Render(escrow.FundedAt.Format(time.RFC3339)))
		}
		if escrow.ReleasedAt != nil {
			fmt.Printf("%s %s\n", labelStyle.Render("Released:"), valueStyle.Render(escrow.ReleasedAt.Format(time.RFC3339)))
		}
		if escrow.CanceledAt != nil {
			fmt.Printf("%s %s\n", labelStyle.Render("Cancelled:"), valueStyle.Render(escrow.CanceledAt.Format(time.RFC3339)))
		}
		fmt.Println()

		// Display dispute info if present
		if escrow.Dispute != nil {
			fmt.Println(titleStyle.Render("Dispute Information"))
			fmt.Println()
			fmt.Printf("%s %s\n", labelStyle.Render("Dispute ID:"), valueStyle.Render(escrow.Dispute.ID))
			fmt.Printf("%s %s\n", labelStyle.Render("Initiator:"), valueStyle.Render(escrow.Dispute.Initiator))
			fmt.Printf("%s %s\n", labelStyle.Render("Reason:"), valueStyle.Render(escrow.Dispute.Reason))
			fmt.Printf("%s %s\n", labelStyle.Render("Status:"), valueStyle.Render(string(escrow.Dispute.Status)))
			if escrow.Dispute.ResolvedAt != nil {
				fmt.Printf("%s %s\n", labelStyle.Render("Resolution:"), valueStyle.Render(string(escrow.Dispute.Resolution)))
				fmt.Printf("%s %s\n", labelStyle.Render("Resolved:"), valueStyle.Render(escrow.Dispute.ResolvedAt.Format(time.RFC3339)))
			}
			fmt.Println()
		}

		return nil
	},
}

func init() {
	// Add status filter flag to list command
	escrowListCmd.Flags().StringP("status", "s", "", "Filter by status (created, funded, in_progress, completed, released, disputed, cancelled)")

	// Add subcommands
	escrowCmd.AddCommand(escrowCreateCmd)
	escrowCmd.AddCommand(escrowFundCmd)
	escrowCmd.AddCommand(escrowReleaseCmd)
	escrowCmd.AddCommand(escrowCancelCmd)
	escrowCmd.AddCommand(escrowDisputeCmd)
	escrowCmd.AddCommand(escrowListCmd)
	escrowCmd.AddCommand(escrowGetCmd)

	// Add to root
	rootCmd.AddCommand(escrowCmd)
}
