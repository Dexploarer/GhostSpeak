package cmd

import (
	"fmt"
	"time"

	"github.com/charmbracelet/huh"
	"github.com/charmbracelet/lipgloss"
	"github.com/ghostspeak/cli-go/internal/config"
	"github.com/ghostspeak/cli-go/internal/domain"
	"github.com/spf13/cobra"
)

// quickstartCmd represents the quickstart command
var quickstartCmd = &cobra.Command{
	Use:   "quickstart",
	Short: "Interactive setup wizard for GhostSpeak",
	Long: `Launch an interactive wizard to get started with GhostSpeak.

The quickstart wizard will guide you through:
  • Network selection (devnet/testnet/mainnet)
  • Wallet creation or import
  • Automatic devnet faucet request
  • DID document creation
  • Agent registration walkthrough

Perfect for first-time users!`,
	RunE: runQuickstart,
}

func init() {
	rootCmd.AddCommand(quickstartCmd)
}

func runQuickstart(cmd *cobra.Command, args []string) error {
	// Print welcome banner
	printQuickstartWelcome()

	// Step 1: Network Selection
	network, err := selectNetwork()
	if err != nil {
		return err
	}

	config.Infof("Selected network: %s", network)

	// Update network in config
	if err := config.UpdateNetwork(network); err != nil {
		config.Warnf("Failed to update network config: %v", err)
	}

	// Reload application with new network
	if err := application.ReloadConfig(); err != nil {
		config.Warnf("Failed to reload config: %v", err)
	}

	fmt.Println()
	printStep(1, 5, "Network Selection", "✓ Complete")
	fmt.Println()

	// Step 2: Wallet Setup
	fmt.Println(stepStyle.Render("Step 2/5: Wallet Setup"))
	fmt.Println()

	wallet, walletPassword, err := setupWallet()
	if err != nil {
		return err
	}

	fmt.Println()
	printStep(2, 5, "Wallet Setup", "✓ Complete")
	fmt.Println()

	// Step 3: Faucet (devnet only)
	if network == "devnet" {
		fmt.Println(stepStyle.Render("Step 3/5: Request Devnet Tokens"))
		fmt.Println()

		if err := requestDevnetTokens(wallet.PublicKey); err != nil {
			config.Warnf("Failed to request tokens: %v", err)
			fmt.Println("⚠ You can request tokens later with: ghost faucet")
		} else {
			fmt.Println()
			printStep(3, 5, "Faucet Request", "✓ Complete")
		}
	} else {
		fmt.Println(infoStyle.Render("ℹ Skipping faucet (not on devnet)"))
		printStep(3, 5, "Faucet Request", "⊘ Skipped")
	}

	fmt.Println()

	// Step 4: DID Creation
	fmt.Println(stepStyle.Render("Step 4/5: DID Creation"))
	fmt.Println()

	if err := createDID(wallet.PublicKey, walletPassword); err != nil {
		config.Warnf("Failed to create DID: %v", err)
		fmt.Println("⚠ You can create a DID later with: ghost did create")
	} else {
		fmt.Println()
		printStep(4, 5, "DID Creation", "✓ Complete")
	}

	fmt.Println()

	// Step 5: Agent Registration
	fmt.Println(stepStyle.Render("Step 5/5: Agent Registration"))
	fmt.Println()

	if err := registerAgent(walletPassword); err != nil {
		config.Warnf("Failed to register agent: %v", err)
		fmt.Println("⚠ You can register an agent later with: ghost agent register")
	} else {
		fmt.Println()
		printStep(5, 5, "Agent Registration", "✓ Complete")
	}

	fmt.Println()

	// Print completion message
	printQuickstartComplete()

	return nil
}

func printQuickstartWelcome() {
	titleStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("#FEF9A7")).
		Bold(true).
		Padding(1, 2)

	subtitleStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("#888888")).
		Italic(true)

	fmt.Println(titleStyle.Render("Welcome to GhostSpeak!"))
	fmt.Println(subtitleStyle.Render("AI Agent Commerce Protocol"))
	fmt.Println()
	fmt.Println("This wizard will help you get started in just a few steps.")
	fmt.Println()
}

func printQuickstartComplete() {
	successStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("#00FF00")).
		Bold(true).
		Padding(1, 2)

	fmt.Println(successStyle.Render("🎉 Quickstart Complete!"))
	fmt.Println()
	fmt.Println("You're all set! Here are some commands to try:")
	fmt.Println()
	fmt.Println("  ghost wallet list       - View your wallets")
	fmt.Println("  ghost agent list        - View your agents")
	fmt.Println("  ghost tui               - Launch the interactive dashboard")
	fmt.Println("  ghost --help            - View all available commands")
	fmt.Println()
}

var stepStyle = lipgloss.NewStyle().
	Foreground(lipgloss.Color("#00D9FF")).
	Bold(true)

var infoStyle = lipgloss.NewStyle().
	Foreground(lipgloss.Color("#888888"))

func printStep(current, total int, name, status string) {
	fmt.Printf("[%d/%d] %s: %s\n", current, total, name, status)
}

func selectNetwork() (string, error) {
	var network string

	form := huh.NewForm(
		huh.NewGroup(
			huh.NewSelect[string]().
				Title("Select Network").
				Description("Choose which Solana network to use").
				Options(
					huh.NewOption("Devnet (Recommended for testing)", "devnet"),
					huh.NewOption("Testnet", "testnet"),
					huh.NewOption("Mainnet (Production)", "mainnet"),
				).
				Value(&network),
		),
	)

	if err := form.Run(); err != nil {
		return "", err
	}

	return network, nil
}

func setupWallet() (*domain.Wallet, string, error) {
	var walletAction string
	var walletName string
	var walletPassword string
	var confirmPassword string
	var privateKey string

	// Check if user wants to create or import
	actionForm := huh.NewForm(
		huh.NewGroup(
			huh.NewSelect[string]().
				Title("Wallet Setup").
				Description("Would you like to create a new wallet or import an existing one?").
				Options(
					huh.NewOption("Create new wallet", "create"),
					huh.NewOption("Import existing wallet", "import"),
				).
				Value(&walletAction),
		),
	)

	if err := actionForm.Run(); err != nil {
		return nil, "", err
	}

	if walletAction == "create" {
		// Create new wallet
		createForm := huh.NewForm(
			huh.NewGroup(
				huh.NewInput().
					Title("Wallet Name").
					Description("Enter a name for your wallet").
					Placeholder("my-wallet").
					Value(&walletName).
					Validate(func(s string) error {
						if len(s) == 0 {
							return fmt.Errorf("wallet name cannot be empty")
						}
						return nil
					}),
				huh.NewInput().
					Title("Password").
					Description("Enter a password to encrypt your wallet").
					EchoMode(huh.EchoModePassword).
					Value(&walletPassword).
					Validate(func(s string) error {
						if len(s) < 8 {
							return fmt.Errorf("password must be at least 8 characters")
						}
						return nil
					}),
				huh.NewInput().
					Title("Confirm Password").
					EchoMode(huh.EchoModePassword).
					Value(&confirmPassword).
					Validate(func(s string) error {
						if s != walletPassword {
							return fmt.Errorf("passwords do not match")
						}
						return nil
					}),
			),
		)

		if err := createForm.Run(); err != nil {
			return nil, "", err
		}

		// Create wallet
		config.Info("Creating wallet...")
		wallet, err := application.WalletService.CreateWallet(domain.CreateWalletParams{
			Name:     walletName,
			Password: walletPassword,
		})
		if err != nil {
			return nil, "", fmt.Errorf("failed to create wallet: %w", err)
		}

		fmt.Println()
		fmt.Println(successStyle.Render("✓ Wallet created successfully!"))
		fmt.Printf("Address: %s\n", wallet.PublicKey)

		return wallet, walletPassword, nil

	} else {
		// Import wallet
		importForm := huh.NewForm(
			huh.NewGroup(
				huh.NewInput().
					Title("Wallet Name").
					Description("Enter a name for your wallet").
					Placeholder("imported-wallet").
					Value(&walletName).
					Validate(func(s string) error {
						if len(s) == 0 {
							return fmt.Errorf("wallet name cannot be empty")
						}
						return nil
					}),
				huh.NewInput().
					Title("Private Key").
					Description("Enter your base58-encoded private key").
					EchoMode(huh.EchoModePassword).
					Value(&privateKey).
					Validate(func(s string) error {
						if len(s) == 0 {
							return fmt.Errorf("private key cannot be empty")
						}
						return nil
					}),
				huh.NewInput().
					Title("Password").
					Description("Enter a password to encrypt your wallet").
					EchoMode(huh.EchoModePassword).
					Value(&walletPassword).
					Validate(func(s string) error {
						if len(s) < 8 {
							return fmt.Errorf("password must be at least 8 characters")
						}
						return nil
					}),
			),
		)

		if err := importForm.Run(); err != nil {
			return nil, "", err
		}

		// Import wallet
		config.Info("Importing wallet...")
		wallet, err := application.WalletService.ImportWallet(domain.ImportWalletParams{
			Name:       walletName,
			PrivateKey: privateKey,
			Password:   walletPassword,
		})
		if err != nil {
			return nil, "", fmt.Errorf("failed to import wallet: %w", err)
		}

		fmt.Println()
		fmt.Println(successStyle.Render("✓ Wallet imported successfully!"))
		fmt.Printf("Address: %s\n", wallet.PublicKey)

		return wallet, walletPassword, nil
	}
}

func requestDevnetTokens(publicKey string) error {
	fmt.Println("Requesting 1 SOL from devnet faucet...")

	// Request airdrop
	err := application.Client.RequestAirdrop(publicKey, 1_000_000_000)
	if err != nil {
		return fmt.Errorf("failed to request airdrop: %w", err)
	}

	config.Debug("Airdrop requested successfully")

	// Wait for confirmation
	fmt.Println("Waiting for confirmation...")
	time.Sleep(3 * time.Second)

	// Get balance
	balance, err := application.WalletService.GetBalance(publicKey)
	if err != nil {
		return err
	}

	fmt.Println()
	fmt.Println(successStyle.Render("✓ Received 1 SOL!"))
	fmt.Printf("Balance: %.4f SOL\n", balance)

	return nil
}

func createDID(controller, walletPassword string) error {
	fmt.Println("Creating DID document...")

	params := domain.CreateDIDParams{
		Controller:          controller,
		Network:             application.Config.Network.Current,
		VerificationMethods: []domain.VerificationMethod{},
		ServiceEndpoints:    []domain.ServiceEndpoint{},
	}

	did, err := application.DIDService.CreateDID(params, walletPassword)
	if err != nil {
		return fmt.Errorf("failed to create DID: %w", err)
	}

	fmt.Println()
	fmt.Println(successStyle.Render("✓ DID created successfully!"))
	fmt.Printf("DID: %s\n", did.DID)

	return nil
}

func registerAgent(walletPassword string) error {
	var agentName string
	var agentDescription string
	var agentTypeStr string

	// Agent registration form
	form := huh.NewForm(
		huh.NewGroup(
			huh.NewInput().
				Title("Agent Name").
				Description("Enter a name for your agent").
				Placeholder("My First Agent").
				Value(&agentName).
				Validate(func(s string) error {
					if len(s) == 0 {
						return fmt.Errorf("agent name cannot be empty")
					}
					return nil
				}),
			huh.NewText().
				Title("Description").
				Description("Describe what your agent does").
				Placeholder("A helpful AI agent that...").
				Value(&agentDescription).
				Validate(func(s string) error {
					if len(s) == 0 {
						return fmt.Errorf("description cannot be empty")
					}
					return nil
				}),
			huh.NewSelect[string]().
				Title("Agent Type").
				Description("Select the type of agent").
				Options(
					huh.NewOption("General Purpose", "general"),
					huh.NewOption("Data Analysis", "data_analysis"),
					huh.NewOption("Content Creation", "content_creation"),
					huh.NewOption("Customer Service", "customer_service"),
					huh.NewOption("Code Assistant", "code_assistant"),
				).
				Value(&agentTypeStr),
		),
	)

	if err := form.Run(); err != nil {
		return err
	}

	// Parse agent type
	agentType := domain.ParseAgentType(agentTypeStr)

	fmt.Println()
	fmt.Println("Registering agent...")

	params := domain.RegisterAgentParams{
		Name:         agentName,
		Description:  agentDescription,
		AgentType:    agentType,
		Capabilities: []string{"api", "automation"},
		Version:      "1.0.0",
		ImageURL:     "",
	}

	agent, err := application.AgentService.RegisterAgent(params, walletPassword)
	if err != nil {
		return fmt.Errorf("failed to register agent: %w", err)
	}

	fmt.Println()
	fmt.Println(successStyle.Render("✓ Agent registered successfully!"))
	fmt.Printf("Agent ID: %s\n", agent.ID)
	fmt.Printf("Name: %s\n", agent.Name)
	fmt.Printf("Type: %s\n", agent.AgentType)

	return nil
}

var successStyle = lipgloss.NewStyle().
	Foreground(lipgloss.Color("#00FF00")).
	Bold(true)
