package cmd

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/charmbracelet/lipgloss"
	"github.com/ghostspeak/cli-go/internal/domain"
	"github.com/spf13/cobra"
	"golang.org/x/term"
)

var credentialCmd = &cobra.Command{
	Use:   "credential",
	Short: "Manage Verifiable Credentials",
	Long: `Manage W3C-compliant Verifiable Credentials.

Commands include issuing credentials, listing credentials, viewing details,
exporting to W3C format, and syncing to EVM chains via Crossmint.`,
	Aliases: []string{"cred", "credentials"},
}

var credentialIssueCmd = &cobra.Command{
	Use:   "issue",
	Short: "Issue a new verifiable credential",
	Long: `Issue a new W3C-compliant verifiable credential.

Supports credential types:
  - AgentIdentity: Proves agent identity and capabilities
  - Reputation: Proves Ghost Score and reputation metrics
  - JobCompletion: Proves successful job completion

Optional: Sync to EVM chains (Base, Polygon) via Crossmint.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		fmt.Println()
		fmt.Println("Issue Verifiable Credential")
		fmt.Println()

		// Select credential type
		fmt.Println("Credential Types:")
		fmt.Println("  1. AgentIdentity - Agent identity and capabilities")
		fmt.Println("  2. Reputation - Ghost Score and reputation")
		fmt.Println("  3. JobCompletion - Job completion proof")
		fmt.Print("\nSelect type (1-3): ")

		var typeChoice int
		fmt.Scanln(&typeChoice)

		var credType domain.CredentialType
		var subjectData map[string]interface{}

		switch typeChoice {
		case 1:
			credType = domain.CredentialTypeAgentIdentity
			subjectData = promptAgentIdentityData()
		case 2:
			credType = domain.CredentialTypeReputation
			subjectData = promptReputationData()
		case 3:
			credType = domain.CredentialTypeJobCompletion
			subjectData = promptJobCompletionData()
		default:
			return fmt.Errorf("invalid credential type")
		}

		// Get subject address
		fmt.Print("\nSubject address (agent address): ")
		var subject string
		fmt.Scanln(&subject)

		// Ask about Crossmint sync
		fmt.Print("\nSync to EVM via Crossmint? (y/N): ")
		var syncChoice string
		fmt.Scanln(&syncChoice)

		syncToCrossmint := strings.ToLower(syncChoice) == "y"
		var recipientEmail string

		if syncToCrossmint {
			fmt.Print("Recipient email for EVM wallet lookup: ")
			fmt.Scanln(&recipientEmail)
		}

		// Get wallet password
		fmt.Print("\nEnter wallet password: ")
		passwordBytes, err := term.ReadPassword(int(os.Stdin.Fd()))
		if err != nil {
			return fmt.Errorf("failed to read password: %w", err)
		}
		fmt.Println()

		// Issue credential
		params := domain.IssueCredentialParams{
			Type:            credType,
			Subject:         subject,
			SubjectData:     subjectData,
			SyncToCrossmint: syncToCrossmint,
			RecipientEmail:  recipientEmail,
		}

		credential, err := application.CredentialService.IssueCredential(params, string(passwordBytes))
		if err != nil {
			return fmt.Errorf("failed to issue credential: %w", err)
		}

		// Display success
		successStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF00")).Bold(true)
		labelStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
		valueStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFFFF"))

		fmt.Println()
		fmt.Println(successStyle.Render("✓ Credential issued successfully!"))
		fmt.Println()
		fmt.Printf("%s %s\n", labelStyle.Render("ID:"), valueStyle.Render(credential.ID))
		fmt.Printf("%s %s\n", labelStyle.Render("Type:"), valueStyle.Render(string(credential.Type)))
		fmt.Printf("%s %s\n", labelStyle.Render("Subject:"), valueStyle.Render(credential.Subject))
		fmt.Printf("%s %s\n", labelStyle.Render("Issuer:"), valueStyle.Render(credential.Issuer))
		fmt.Printf("%s %s\n", labelStyle.Render("Status:"), successStyle.Render(string(credential.Status)))
		fmt.Printf("%s %s\n", labelStyle.Render("Issued At:"), credential.IssuedAt.Format("2006-01-02 15:04:05"))

		if credential.CrossmintSync != nil {
			fmt.Println()
			fmt.Printf("%s %s\n", labelStyle.Render("Crossmint Sync:"), valueStyle.Render(credential.CrossmintSync.Status))
			if credential.CrossmintSync.Status == "synced" {
				fmt.Printf("%s %s\n", labelStyle.Render("EVM Chain:"), valueStyle.Render(credential.CrossmintSync.Chain))
				fmt.Printf("%s %s\n", labelStyle.Render("EVM Credential ID:"), valueStyle.Render(credential.CrossmintSync.CredentialID))
			}
		}

		fmt.Println()

		return nil
	},
}

var credentialListCmd = &cobra.Command{
	Use:   "list [subject]",
	Short: "List verifiable credentials",
	Long: `List all verifiable credentials for a subject.

If no subject is provided, lists credentials for the active wallet.`,
	Args: cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		var subject string

		if len(args) > 0 {
			subject = args[0]
		} else {
			// Use active wallet
			activeWallet, err := application.WalletService.GetActiveWallet()
			if err != nil {
				return fmt.Errorf("no active wallet: %w", err)
			}
			subject = activeWallet.PublicKey
		}

		credentials, err := application.CredentialService.ListCredentials(subject)
		if err != nil {
			return fmt.Errorf("failed to list credentials: %w", err)
		}

		if len(credentials) == 0 {
			fmt.Println("No credentials found for subject:", subject)
			return nil
		}

		// Display credentials
		titleStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FEF9A7")).Bold(true)
		labelStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
		valueStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFFFF"))
		successStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF00"))

		fmt.Println()
		fmt.Println(titleStyle.Render(fmt.Sprintf("Credentials (%d total)", len(credentials))))
		fmt.Println()

		for _, cred := range credentials {
			fmt.Printf("%s %s\n", labelStyle.Render("ID:"), valueStyle.Render(cred.ID))
			fmt.Printf("%s %s\n", labelStyle.Render("Type:"), valueStyle.Render(string(cred.Type)))
			fmt.Printf("%s %s\n", labelStyle.Render("Status:"), successStyle.Render(string(cred.Status)))
			fmt.Printf("%s %s\n", labelStyle.Render("Issued:"), cred.IssuedAt.Format("2006-01-02 15:04:05"))

			if cred.ExpiresAt != nil {
				fmt.Printf("%s %s\n", labelStyle.Render("Expires:"), cred.ExpiresAt.Format("2006-01-02 15:04:05"))
			}

			if cred.CrossmintSync != nil && cred.CrossmintSync.Status == "synced" {
				fmt.Printf("%s %s (%s)\n",
					labelStyle.Render("Synced to:"),
					valueStyle.Render(cred.CrossmintSync.Chain),
					cred.CrossmintSync.CredentialID,
				)
			}

			fmt.Println()
		}

		return nil
	},
}

var credentialGetCmd = &cobra.Command{
	Use:   "get <credential-id>",
	Short: "Get credential details",
	Long:  `Display detailed information about a specific credential.`,
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		credentialID := args[0]

		credential, err := application.CredentialService.GetCredential(credentialID)
		if err != nil {
			return fmt.Errorf("failed to get credential: %w", err)
		}

		// Display credential
		titleStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FEF9A7")).Bold(true)
		labelStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
		valueStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFFFF"))
		successStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF00"))

		fmt.Println()
		fmt.Println(titleStyle.Render("Credential Details"))
		fmt.Println()
		fmt.Printf("%s %s\n", labelStyle.Render("ID:"), valueStyle.Render(credential.ID))
		fmt.Printf("%s %s\n", labelStyle.Render("Type:"), valueStyle.Render(string(credential.Type)))
		fmt.Printf("%s %s\n", labelStyle.Render("Subject:"), valueStyle.Render(credential.Subject))
		fmt.Printf("%s %s\n", labelStyle.Render("Issuer:"), valueStyle.Render(credential.Issuer))
		fmt.Printf("%s %s\n", labelStyle.Render("Status:"), successStyle.Render(string(credential.Status)))
		fmt.Printf("%s %s\n", labelStyle.Render("PDA:"), valueStyle.Render(credential.PDA))
		fmt.Println()

		fmt.Println(titleStyle.Render("Subject Data"))
		for key, value := range credential.SubjectData {
			fmt.Printf("  %s %v\n", labelStyle.Render(key+":"), valueStyle.Render(fmt.Sprintf("%v", value)))
		}
		fmt.Println()

		fmt.Printf("%s %s\n", labelStyle.Render("Issued At:"), credential.IssuedAt.Format("2006-01-02 15:04:05"))
		if credential.ExpiresAt != nil {
			fmt.Printf("%s %s\n", labelStyle.Render("Expires At:"), credential.ExpiresAt.Format("2006-01-02 15:04:05"))
		}

		if credential.CrossmintSync != nil {
			fmt.Println()
			fmt.Println(titleStyle.Render("Crossmint Sync"))
			fmt.Printf("%s %s\n", labelStyle.Render("Status:"), valueStyle.Render(credential.CrossmintSync.Status))
			if credential.CrossmintSync.Chain != "" {
				fmt.Printf("%s %s\n", labelStyle.Render("Chain:"), valueStyle.Render(credential.CrossmintSync.Chain))
			}
			if credential.CrossmintSync.CredentialID != "" {
				fmt.Printf("%s %s\n", labelStyle.Render("EVM Credential ID:"), valueStyle.Render(credential.CrossmintSync.CredentialID))
			}
		}

		fmt.Println()

		return nil
	},
}

var credentialExportCmd = &cobra.Command{
	Use:   "export <credential-id>",
	Short: "Export credential to W3C format",
	Long: `Export a credential to W3C-compliant JSON format.

The output can be used for verification and interoperability with other systems.`,
	Args: cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		credentialID := args[0]

		w3cJSON, err := application.CredentialService.ExportW3C(credentialID, true)
		if err != nil {
			return fmt.Errorf("failed to export credential: %w", err)
		}

		titleStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FEF9A7")).Bold(true)

		fmt.Println()
		fmt.Println(titleStyle.Render("W3C Verifiable Credential"))
		fmt.Println()
		fmt.Println(w3cJSON)
		fmt.Println()

		return nil
	},
}

var credentialVerifyCmd = &cobra.Command{
	Use:   "verify <credential-id>",
	Short: "Verify a credential",
	Long:  `Verify a credential's validity and authenticity.`,
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		credentialID := args[0]

		valid, err := application.CredentialService.VerifyCredential(credentialID)
		if err != nil {
			return fmt.Errorf("failed to verify credential: %w", err)
		}

		successStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF00")).Bold(true)
		errorStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FF0000")).Bold(true)

		fmt.Println()
		if valid {
			fmt.Println(successStyle.Render("✓ Credential is VALID"))
		} else {
			fmt.Println(errorStyle.Render("✗ Credential is INVALID"))
		}
		fmt.Println()

		return nil
	},
}

// Helper functions to prompt for credential data

func promptAgentIdentityData() map[string]interface{} {
	fmt.Println("\nAgent Identity Credential Data:")

	fmt.Print("Agent ID: ")
	var agentID string
	fmt.Scanln(&agentID)

	fmt.Print("Owner address: ")
	var owner string
	fmt.Scanln(&owner)

	fmt.Print("Agent name: ")
	var name string
	fmt.Scanln(&name)

	fmt.Print("Capabilities (comma-separated): ")
	var capsStr string
	fmt.Scanln(&capsStr)
	capabilities := strings.Split(capsStr, ",")
	for i := range capabilities {
		capabilities[i] = strings.TrimSpace(capabilities[i])
	}

	fmt.Print("Service endpoint (optional): ")
	var endpoint string
	fmt.Scanln(&endpoint)

	return domain.BuildAgentIdentitySubject(
		agentID,
		owner,
		name,
		capabilities,
		endpoint,
		"ghostspeak-cli",
	)
}

func promptReputationData() map[string]interface{} {
	fmt.Println("\nReputation Credential Data:")

	fmt.Print("Agent ID: ")
	var agentID string
	fmt.Scanln(&agentID)

	fmt.Print("Owner address: ")
	var owner string
	fmt.Scanln(&owner)

	fmt.Print("Ghost Score (0-1000): ")
	var scoreStr string
	fmt.Scanln(&scoreStr)
	ghostScore, _ := strconv.Atoi(scoreStr)

	// Determine tier
	tier := "Bronze"
	if ghostScore >= 800 {
		tier = "Platinum"
	} else if ghostScore >= 600 {
		tier = "Gold"
	} else if ghostScore >= 400 {
		tier = "Silver"
	}

	fmt.Print("Total jobs: ")
	var jobsStr string
	fmt.Scanln(&jobsStr)
	totalJobs, _ := strconv.ParseUint(jobsStr, 10, 64)

	fmt.Print("Success rate (0-100): ")
	var rateStr string
	fmt.Scanln(&rateStr)
	successRate, _ := strconv.ParseFloat(rateStr, 64)

	return domain.BuildReputationSubject(
		agentID,
		owner,
		ghostScore,
		tier,
		totalJobs,
		successRate,
	)
}

func promptJobCompletionData() map[string]interface{} {
	fmt.Println("\nJob Completion Credential Data:")

	fmt.Print("Job ID: ")
	var jobID string
	fmt.Scanln(&jobID)

	fmt.Print("Agent ID: ")
	var agentID string
	fmt.Scanln(&agentID)

	fmt.Print("Client address: ")
	var clientAddress string
	fmt.Scanln(&clientAddress)

	fmt.Print("Amount (lamports): ")
	var amountStr string
	fmt.Scanln(&amountStr)
	amount, _ := strconv.ParseUint(amountStr, 10, 64)

	fmt.Print("Rating (0-5): ")
	var ratingStr string
	fmt.Scanln(&ratingStr)
	rating, _ := strconv.ParseFloat(ratingStr, 64)

	return domain.BuildJobCompletionSubject(
		jobID,
		agentID,
		clientAddress,
		amount,
		rating,
	)
}

func init() {
	// Add subcommands
	credentialCmd.AddCommand(credentialIssueCmd)
	credentialCmd.AddCommand(credentialListCmd)
	credentialCmd.AddCommand(credentialGetCmd)
	credentialCmd.AddCommand(credentialExportCmd)
	credentialCmd.AddCommand(credentialVerifyCmd)

	// Add to root
	rootCmd.AddCommand(credentialCmd)
}
