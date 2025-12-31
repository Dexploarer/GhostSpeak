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

var didCmd = &cobra.Command{
	Use:   "did",
	Short: "Manage Decentralized Identifiers (DIDs)",
	Long: `Manage W3C-compliant Decentralized Identifiers for AI agents.

Commands include creating DIDs, updating verification methods and service endpoints,
resolving DIDs, exporting to W3C format, and deactivation.`,
}

var didCreateCmd = &cobra.Command{
	Use:   "create",
	Short: "Create a new DID",
	Long: `Create a new W3C-compliant DID for your agent.

This will create an on-chain DID document with verification methods and service endpoints.
You will be prompted for DID details and your wallet password.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		// Get active wallet
		activeWallet, err := application.WalletService.GetActiveWallet()
		if err != nil {
			return fmt.Errorf("no active wallet: %w", err)
		}

		controller := activeWallet.PublicKey

		fmt.Println()
		fmt.Printf("Creating DID for controller: %s\n", controller)
		fmt.Println()

		// Get service endpoint
		fmt.Print("Service endpoint URL (optional): ")
		var serviceURL string
		fmt.Scanln(&serviceURL)

		// Get wallet password
		fmt.Print("\nEnter wallet password: ")
		passwordBytes, err := term.ReadPassword(int(os.Stdin.Fd()))
		if err != nil {
			return fmt.Errorf("failed to read password: %w", err)
		}
		fmt.Println()

		// Build verification method
		verificationMethods := []domain.VerificationMethod{
			{
				ID:                 "auth-key-1",
				MethodType:         domain.VerificationMethodEd25519,
				Controller:         domain.FormatDID(application.Config.Network.Current, controller),
				PublicKeyMultibase: fmt.Sprintf("z%s", controller), // Simplified multibase encoding
				Relationships:      []domain.VerificationRelationship{domain.RelationshipAuthentication},
				Revoked:            false,
			},
		}

		// Build service endpoints
		serviceEndpoints := []domain.ServiceEndpoint{}
		if serviceURL != "" {
			serviceEndpoints = append(serviceEndpoints, domain.ServiceEndpoint{
				ID:              "agent-api",
				ServiceType:     domain.ServiceTypeAIAgent,
				ServiceEndpoint: serviceURL,
				Description:     "AI Agent Service API",
			})
		}

		// Create DID
		params := domain.CreateDIDParams{
			Controller:          controller,
			Network:             application.Config.Network.Current,
			VerificationMethods: verificationMethods,
			ServiceEndpoints:    serviceEndpoints,
		}

		didDoc, err := application.DIDService.CreateDID(params, string(passwordBytes))
		if err != nil {
			return fmt.Errorf("failed to create DID: %w", err)
		}

		// Display success
		successStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF00")).Bold(true)
		labelStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
		valueStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFFFF"))

		fmt.Println()
		fmt.Println(successStyle.Render("✓ DID created successfully!"))
		fmt.Println()
		fmt.Printf("%s %s\n", labelStyle.Render("DID:"), valueStyle.Render(didDoc.DID))
		fmt.Printf("%s %s\n", labelStyle.Render("Controller:"), valueStyle.Render(didDoc.Controller))
		fmt.Printf("%s %s\n", labelStyle.Render("Network:"), valueStyle.Render(didDoc.Network))
		fmt.Printf("%s %s\n", labelStyle.Render("PDA:"), valueStyle.Render(didDoc.PDA))
		fmt.Printf("%s %d\n", labelStyle.Render("Verification Methods:"), len(didDoc.VerificationMethods))
		fmt.Printf("%s %d\n", labelStyle.Render("Service Endpoints:"), len(didDoc.ServiceEndpoints))
		fmt.Println()

		return nil
	},
}

var didResolveCmd = &cobra.Command{
	Use:   "resolve [controller]",
	Short: "Resolve a DID document",
	Long: `Resolve a DID document by controller address.

If no controller is provided, resolves the DID for the active wallet.`,
	Args: cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		var controller string

		if len(args) > 0 {
			controller = args[0]
		} else {
			// Use active wallet
			activeWallet, err := application.WalletService.GetActiveWallet()
			if err != nil {
				return fmt.Errorf("no active wallet: %w", err)
			}
			controller = activeWallet.PublicKey
		}

		didDoc, err := application.DIDService.ResolveDID(controller)
		if err != nil {
			return fmt.Errorf("failed to resolve DID: %w", err)
		}

		// Display DID document
		titleStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FEF9A7")).Bold(true)
		labelStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
		valueStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFFFF"))
		successStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF00"))

		fmt.Println()
		fmt.Println(titleStyle.Render("DID Document"))
		fmt.Println()
		fmt.Printf("%s %s\n", labelStyle.Render("DID:"), valueStyle.Render(didDoc.DID))
		fmt.Printf("%s %s\n", labelStyle.Render("Controller:"), valueStyle.Render(didDoc.Controller))
		fmt.Printf("%s %s\n", labelStyle.Render("Network:"), valueStyle.Render(didDoc.Network))
		fmt.Printf("%s %s\n", labelStyle.Render("PDA:"), valueStyle.Render(didDoc.PDA))

		if didDoc.Deactivated {
			fmt.Printf("%s %s\n", labelStyle.Render("Status:"), lipgloss.NewStyle().Foreground(lipgloss.Color("#FF0000")).Render("Deactivated"))
		} else {
			fmt.Printf("%s %s\n", labelStyle.Render("Status:"), successStyle.Render("Active"))
		}

		fmt.Println()
		fmt.Println(titleStyle.Render("Verification Methods"))
		if len(didDoc.VerificationMethods) == 0 {
			fmt.Println(labelStyle.Render("  No verification methods"))
		}
		for _, vm := range didDoc.VerificationMethods {
			fmt.Printf("  %s %s\n", labelStyle.Render("ID:"), valueStyle.Render(vm.ID))
			fmt.Printf("  %s %s\n", labelStyle.Render("Type:"), valueStyle.Render(vm.MethodType.String()))

			relationships := []string{}
			for _, rel := range vm.Relationships {
				relationships = append(relationships, rel.String())
			}
			fmt.Printf("  %s %s\n", labelStyle.Render("Relationships:"), valueStyle.Render(strings.Join(relationships, ", ")))

			if vm.Revoked {
				fmt.Printf("  %s %s\n", labelStyle.Render("Revoked:"), lipgloss.NewStyle().Foreground(lipgloss.Color("#FF0000")).Render("Yes"))
			}
			fmt.Println()
		}

		fmt.Println(titleStyle.Render("Service Endpoints"))
		if len(didDoc.ServiceEndpoints) == 0 {
			fmt.Println(labelStyle.Render("  No service endpoints"))
		}
		for _, se := range didDoc.ServiceEndpoints {
			fmt.Printf("  %s %s\n", labelStyle.Render("ID:"), valueStyle.Render(se.ID))
			fmt.Printf("  %s %s\n", labelStyle.Render("Type:"), valueStyle.Render(se.ServiceType.String()))
			fmt.Printf("  %s %s\n", labelStyle.Render("Endpoint:"), valueStyle.Render(se.ServiceEndpoint))
			if se.Description != "" {
				fmt.Printf("  %s %s\n", labelStyle.Render("Description:"), valueStyle.Render(se.Description))
			}
			fmt.Println()
		}

		fmt.Printf("%s %s\n", labelStyle.Render("Created:"), didDoc.CreatedAt.Format("2006-01-02 15:04:05"))
		fmt.Printf("%s %s\n", labelStyle.Render("Updated:"), didDoc.UpdatedAt.Format("2006-01-02 15:04:05"))
		fmt.Println()

		return nil
	},
}

var didExportCmd = &cobra.Command{
	Use:   "export [controller]",
	Short: "Export DID to W3C format",
	Long: `Export a DID document to W3C-compliant JSON format.

If no controller is provided, exports the DID for the active wallet.
The output can be used for cross-chain verification and interoperability.`,
	Args: cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		var controller string

		if len(args) > 0 {
			controller = args[0]
		} else {
			// Use active wallet
			activeWallet, err := application.WalletService.GetActiveWallet()
			if err != nil {
				return fmt.Errorf("no active wallet: %w", err)
			}
			controller = activeWallet.PublicKey
		}

		w3cJSON, err := application.DIDService.ExportW3C(controller, true)
		if err != nil {
			return fmt.Errorf("failed to export DID: %w", err)
		}

		titleStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FEF9A7")).Bold(true)

		fmt.Println()
		fmt.Println(titleStyle.Render("W3C DID Document"))
		fmt.Println()
		fmt.Println(w3cJSON)
		fmt.Println()

		return nil
	},
}

var didUpdateCmd = &cobra.Command{
	Use:   "update",
	Short: "Update DID document",
	Long: `Update a DID document by adding verification methods or service endpoints.

This command allows you to add new verification methods and service endpoints
to your existing DID document.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		// Get active wallet
		activeWallet, err := application.WalletService.GetActiveWallet()
		if err != nil {
			return fmt.Errorf("no active wallet: %w", err)
		}

		// Derive DID PDA
		didPDA, err := application.DIDService.DeriveDIDPDA(activeWallet.PublicKey)
		if err != nil {
			return fmt.Errorf("failed to derive DID PDA: %w", err)
		}

		fmt.Println()
		fmt.Println("Update DID Document")
		fmt.Println()
		fmt.Println("1. Add verification method")
		fmt.Println("2. Add service endpoint")
		fmt.Print("\nSelect option (1-2): ")

		var choice int
		fmt.Scanln(&choice)

		params := domain.UpdateDIDParams{
			DIDDocument: didPDA,
		}

		switch choice {
		case 1:
			// Add verification method
			fmt.Print("\nVerification method ID: ")
			var vmID string
			fmt.Scanln(&vmID)

			fmt.Println("\nMethod types:")
			fmt.Println("  1. Ed25519VerificationKey2020")
			fmt.Println("  2. X25519KeyAgreementKey2020")
			fmt.Print("\nSelect type (1-2): ")
			var vmType int
			fmt.Scanln(&vmType)

			methodType := domain.VerificationMethodEd25519
			if vmType == 2 {
				methodType = domain.VerificationMethodX25519
			}

			fmt.Println("\nRelationships:")
			fmt.Println("  1. Authentication")
			fmt.Println("  2. AssertionMethod")
			fmt.Println("  3. KeyAgreement")
			fmt.Print("\nSelect relationship (1-3): ")
			var relType int
			fmt.Scanln(&relType)

			relationship := domain.RelationshipAuthentication
			switch relType {
			case 2:
				relationship = domain.RelationshipAssertionMethod
			case 3:
				relationship = domain.RelationshipKeyAgreement
			}

			params.AddVerificationMethod = &domain.VerificationMethod{
				ID:                 vmID,
				MethodType:         methodType,
				Controller:         domain.FormatDID(application.Config.Network.Current, activeWallet.PublicKey),
				PublicKeyMultibase: fmt.Sprintf("z%s", activeWallet.PublicKey),
				Relationships:      []domain.VerificationRelationship{relationship},
				Revoked:            false,
			}

		case 2:
			// Add service endpoint
			fmt.Print("\nService endpoint ID: ")
			var seID string
			fmt.Scanln(&seID)

			fmt.Print("Service endpoint URL: ")
			var seURL string
			fmt.Scanln(&seURL)

			fmt.Println("\nService types:")
			fmt.Println("  1. AIAgentService")
			fmt.Println("  2. CredentialRepository")
			fmt.Println("  3. DIDCommMessaging")
			fmt.Print("\nSelect type (1-3): ")
			var seType int
			fmt.Scanln(&seType)

			serviceType := domain.ServiceTypeAIAgent
			switch seType {
			case 2:
				serviceType = domain.ServiceTypeCredentialRepo
			case 3:
				serviceType = domain.ServiceTypeDIDCommMessaging
			}

			params.AddServiceEndpoint = &domain.ServiceEndpoint{
				ID:              seID,
				ServiceType:     serviceType,
				ServiceEndpoint: seURL,
			}

		default:
			return fmt.Errorf("invalid option")
		}

		// Get wallet password
		fmt.Print("\nEnter wallet password: ")
		passwordBytes, err := term.ReadPassword(int(os.Stdin.Fd()))
		if err != nil {
			return fmt.Errorf("failed to read password: %w", err)
		}
		fmt.Println()

		// Update DID
		if err := application.DIDService.UpdateDID(params, string(passwordBytes)); err != nil {
			return fmt.Errorf("failed to update DID: %w", err)
		}

		successStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF00")).Bold(true)
		fmt.Println()
		fmt.Println(successStyle.Render("✓ DID updated successfully!"))
		fmt.Println()

		return nil
	},
}

var didDeactivateCmd = &cobra.Command{
	Use:   "deactivate",
	Short: "Deactivate a DID (permanent)",
	Long: `Permanently deactivate a DID document.

WARNING: This operation is irreversible! Once deactivated, the DID cannot be reactivated.
You will be prompted for confirmation before deactivation.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		// Get active wallet
		activeWallet, err := application.WalletService.GetActiveWallet()
		if err != nil {
			return fmt.Errorf("no active wallet: %w", err)
		}

		// Derive DID PDA
		didPDA, err := application.DIDService.DeriveDIDPDA(activeWallet.PublicKey)
		if err != nil {
			return fmt.Errorf("failed to derive DID PDA: %w", err)
		}

		// Resolve DID to show what will be deactivated
		didDoc, err := application.DIDService.ResolveDID(activeWallet.PublicKey)
		if err != nil {
			return fmt.Errorf("failed to resolve DID: %w", err)
		}

		warnStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FF0000")).Bold(true)

		fmt.Println()
		fmt.Println(warnStyle.Render("⚠️  WARNING: This operation is PERMANENT and IRREVERSIBLE!"))
		fmt.Println()
		fmt.Printf("DID to deactivate: %s\n", didDoc.DID)
		fmt.Println()
		fmt.Print("Type 'DEACTIVATE' to confirm: ")

		var confirm string
		fmt.Scanln(&confirm)

		if confirm != "DEACTIVATE" {
			fmt.Println("Cancelled.")
			return nil
		}

		// Get wallet password
		fmt.Print("\nEnter wallet password: ")
		passwordBytes, err := term.ReadPassword(int(os.Stdin.Fd()))
		if err != nil {
			return fmt.Errorf("failed to read password: %w", err)
		}
		fmt.Println()

		// Deactivate DID
		params := domain.DeactivateDIDParams{
			DIDDocument: didPDA,
		}

		if err := application.DIDService.DeactivateDID(params, string(passwordBytes)); err != nil {
			return fmt.Errorf("failed to deactivate DID: %w", err)
		}

		fmt.Println()
		fmt.Println(warnStyle.Render("✓ DID deactivated permanently"))
		fmt.Println()

		return nil
	},
}

func init() {
	// Add subcommands
	didCmd.AddCommand(didCreateCmd)
	didCmd.AddCommand(didResolveCmd)
	didCmd.AddCommand(didExportCmd)
	didCmd.AddCommand(didUpdateCmd)
	didCmd.AddCommand(didDeactivateCmd)

	// Add to root
	rootCmd.AddCommand(didCmd)
}
