package cmd

import (
	"fmt"
	"os"

	"github.com/charmbracelet/lipgloss"
	"github.com/ghostspeak/cli-go/internal/config"
	"github.com/ghostspeak/cli-go/internal/domain"
	"github.com/spf13/cobra"
	"golang.org/x/term"
)

var walletCmd = &cobra.Command{
	Use:   "wallet",
	Short: "Manage Solana wallets",
	Long: `Manage Solana wallets for interacting with the GhostSpeak protocol.

Commands include creating new wallets, importing existing ones, listing wallets,
checking balances, and setting the active wallet.`,
}

var walletCreateCmd = &cobra.Command{
	Use:   "create [name]",
	Short: "Create a new wallet",
	Long: `Create a new Solana wallet with AES-256 encryption.

The wallet's private key will be encrypted with your password and stored locally.
You can optionally specify a custom name for the wallet.`,
	Args: cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		// Get wallet name
		var name string
		if len(args) > 0 {
			name = args[0]
		} else {
			name = "default"
		}

		// Get password
		fmt.Print("Enter password to encrypt wallet: ")
		passwordBytes, err := term.ReadPassword(int(os.Stdin.Fd()))
		if err != nil {
			return fmt.Errorf("failed to read password: %w", err)
		}
		fmt.Println()

		fmt.Print("Confirm password: ")
		confirmBytes, err := term.ReadPassword(int(os.Stdin.Fd()))
		if err != nil {
			return fmt.Errorf("failed to read password: %w", err)
		}
		fmt.Println()

		password := string(passwordBytes)
		confirm := string(confirmBytes)

		if password != confirm {
			return fmt.Errorf("passwords do not match")
		}

		if len(password) < 8 {
			return fmt.Errorf("password must be at least 8 characters")
		}

		// Create wallet
		params := domain.CreateWalletParams{
			Name:     name,
			Password: password,
		}

		wallet, err := application.WalletService.CreateWallet(params)
		if err != nil {
			return fmt.Errorf("failed to create wallet: %w", err)
		}

		// Display success
		successStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF00")).Bold(true)
		labelStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
		valueStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFFFF"))

		fmt.Println()
		fmt.Println(successStyle.Render("✓ Wallet created successfully!"))
		fmt.Println()
		fmt.Printf("%s %s\n", labelStyle.Render("Name:"), valueStyle.Render(wallet.Name))
		fmt.Printf("%s %s\n", labelStyle.Render("Public Key:"), valueStyle.Render(wallet.PublicKey))
		fmt.Printf("%s %s\n", labelStyle.Render("Network:"), valueStyle.Render(application.Config.Network.Current))
		fmt.Println()
		fmt.Println(labelStyle.Render("⚠️  Keep your password safe! It cannot be recovered if lost."))

		return nil
	},
}

var walletListCmd = &cobra.Command{
	Use:   "list",
	Short: "List all wallets",
	Long:  `Display all locally stored wallets and their public keys.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		wallets, err := application.WalletService.ListWallets()
		if err != nil {
			return fmt.Errorf("failed to list wallets: %w", err)
		}

		if len(wallets) == 0 {
			fmt.Println("No wallets found. Create one with 'ghost wallet create'")
			return nil
		}

		// Get active wallet
		activeWallet, _ := application.WalletService.GetActiveWallet()

		// Display wallets
		titleStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FEF9A7")).Bold(true)
		labelStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
		valueStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFFFF"))
		activeStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF00"))

		fmt.Println()
		fmt.Println(titleStyle.Render("Your Wallets"))
		fmt.Println()

		for _, wallet := range wallets {
			isActive := activeWallet != nil && wallet.Name == activeWallet.Name
			if isActive {
				fmt.Printf("%s ", activeStyle.Render("●"))
			} else {
				fmt.Print("  ")
			}

			fmt.Printf("%s %s\n", labelStyle.Render("Name:"), valueStyle.Render(wallet.Name))
			fmt.Printf("  %s %s\n", labelStyle.Render("Public Key:"), valueStyle.Render(wallet.PublicKey))

			if isActive {
				fmt.Printf("  %s\n", activeStyle.Render("(Active)"))
			}
			fmt.Println()
		}

		return nil
	},
}

var walletBalanceCmd = &cobra.Command{
	Use:   "balance [wallet-name]",
	Short: "Check wallet balance",
	Long: `Check the SOL balance of a wallet.

If no wallet name is provided, checks the active wallet's balance.`,
	Args: cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		var wallet *domain.Wallet
		var err error

		if len(args) > 0 {
			wallet, err = application.WalletService.GetWalletByName(args[0])
			if err != nil {
				return fmt.Errorf("wallet not found: %w", err)
			}
		} else {
			wallet, err = application.WalletService.GetActiveWallet()
			if err != nil {
				return fmt.Errorf("no active wallet: %w", err)
			}
		}

		balance, err := application.WalletService.GetBalance(wallet.PublicKey)
		if err != nil {
			return fmt.Errorf("failed to get balance: %w", err)
		}

		// Display balance
		labelStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
		valueStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF00")).Bold(true)

		fmt.Println()
		fmt.Printf("%s %s\n", labelStyle.Render("Wallet:"), wallet.Name)
		fmt.Printf("%s %s\n", labelStyle.Render("Public Key:"), wallet.PublicKey)
		fmt.Printf("%s %s SOL\n", labelStyle.Render("Balance:"), valueStyle.Render(fmt.Sprintf("%.4f", balance)))
		fmt.Println()

		return nil
	},
}

var walletSetActiveCmd = &cobra.Command{
	Use:   "use <wallet-name>",
	Short: "Set the active wallet",
	Long: `Set which wallet to use for transactions.

The active wallet will be used for all operations that require signing.`,
	Args: cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		walletName := args[0]

		// Verify wallet exists
		_, err := application.WalletService.GetWalletByName(walletName)
		if err != nil {
			return fmt.Errorf("wallet not found: %w", err)
		}

		// Set as active
		if err := config.UpdateActiveWallet(walletName); err != nil {
			return fmt.Errorf("failed to set active wallet: %w", err)
		}

		successStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF00")).Bold(true)
		fmt.Println()
		fmt.Println(successStyle.Render("✓ Active wallet set to: " + walletName))
		fmt.Println()

		return nil
	},
}

var walletImportCmd = &cobra.Command{
	Use:   "import <name>",
	Short: "Import an existing wallet",
	Long: `Import an existing Solana wallet using its private key.

You will be prompted to enter the private key (base58 encoded) and a password
to encrypt it for local storage.`,
	Args: cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		name := args[0]

		// Get private key
		fmt.Print("Enter private key (base58): ")
		var privateKeyStr string
		fmt.Scanln(&privateKeyStr)

		// Get password
		fmt.Print("Enter password to encrypt wallet: ")
		passwordBytes, err := term.ReadPassword(int(os.Stdin.Fd()))
		if err != nil {
			return fmt.Errorf("failed to read password: %w", err)
		}
		fmt.Println()

		fmt.Print("Confirm password: ")
		confirmBytes, err := term.ReadPassword(int(os.Stdin.Fd()))
		if err != nil {
			return fmt.Errorf("failed to read password: %w", err)
		}
		fmt.Println()

		password := string(passwordBytes)
		confirm := string(confirmBytes)

		if password != confirm {
			return fmt.Errorf("passwords do not match")
		}

		// Import wallet
		params := domain.ImportWalletParams{
			Name:       name,
			PrivateKey: privateKeyStr,
			Password:   password,
		}

		wallet, err := application.WalletService.ImportWallet(params)
		if err != nil {
			return fmt.Errorf("failed to import wallet: %w", err)
		}

		// Display success
		successStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#00FF00")).Bold(true)
		labelStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))
		valueStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFFFF"))

		fmt.Println()
		fmt.Println(successStyle.Render("✓ Wallet imported successfully!"))
		fmt.Println()
		fmt.Printf("%s %s\n", labelStyle.Render("Name:"), valueStyle.Render(wallet.Name))
		fmt.Printf("%s %s\n", labelStyle.Render("Public Key:"), valueStyle.Render(wallet.PublicKey))
		fmt.Println()

		return nil
	},
}

func init() {
	// Add subcommands
	walletCmd.AddCommand(walletCreateCmd)
	walletCmd.AddCommand(walletListCmd)
	walletCmd.AddCommand(walletBalanceCmd)
	walletCmd.AddCommand(walletSetActiveCmd)
	walletCmd.AddCommand(walletImportCmd)

	// Add to root
	rootCmd.AddCommand(walletCmd)
}
