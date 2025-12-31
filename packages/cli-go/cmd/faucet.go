package cmd

import (
	"fmt"
	"time"

	"github.com/charmbracelet/lipgloss"
	"github.com/ghostspeak/cli-go/internal/config"
	"github.com/ghostspeak/cli-go/internal/services"
	"github.com/spf13/cobra"
)

var (
	faucetAmount uint64
)

// faucetCmd represents the faucet command
var faucetCmd = &cobra.Command{
	Use:   "faucet",
	Short: "Request devnet SOL from the Solana faucet",
	Long: `Request devnet SOL tokens from the Solana faucet.

This command only works on devnet. Use 'ghost faucet ghost' to request GHOST tokens.`,
	RunE: runFaucet,
}

// faucetGhostCmd requests GHOST tokens
var faucetGhostCmd = &cobra.Command{
	Use:   "ghost",
	Short: "Request devnet GHOST tokens",
	Long: `Request devnet GHOST tokens from the GhostSpeak airdrop provider.

Amount: 10,000 GHOST per request
Rate limit: Once per 24 hours

Note: Requires the GhostSpeak web server to be running.
For local development, set: export GHOSTSPEAK_API_URL=http://localhost:3000`,
	RunE: runFaucetGhost,
}

func init() {
	rootCmd.AddCommand(faucetCmd)
	faucetCmd.AddCommand(faucetGhostCmd)

	faucetCmd.Flags().Uint64VarP(&faucetAmount, "amount", "a", 1, "Amount of SOL to request (default: 1)")
}

func runFaucet(cmd *cobra.Command, args []string) error {
	// Check network
	if application.Config.Network.Current != "devnet" {
		return fmt.Errorf("faucet only works on devnet (current network: %s)", application.Config.Network.Current)
	}

	// Get active wallet
	wallet, err := application.WalletService.GetActiveWallet()
	if err != nil {
		return fmt.Errorf("no active wallet. Create one with 'ghost wallet create'")
	}

	// Check rate limit
	if err := checkFaucetRateLimit("sol"); err != nil {
		return err
	}

	// Get balance before
	balanceBefore, err := application.WalletService.GetBalance(wallet.PublicKey)
	if err != nil {
		config.Warnf("Failed to get balance: %v", err)
		balanceBefore = 0
	}

	// Print info
	titleStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("#00D9FF")).
		Bold(true)

	fmt.Println(titleStyle.Render("Requesting SOL from Devnet Faucet"))
	fmt.Printf("Wallet: %s\n", wallet.PublicKey)
	fmt.Printf("Current balance: %.4f SOL\n", balanceBefore)
	fmt.Printf("Requesting: %d SOL\n\n", faucetAmount)

	// Request from faucet
	config.Info("Requesting airdrop...")

	err = application.Client.RequestAirdrop(wallet.PublicKey, faucetAmount*1_000_000_000)
	if err != nil {
		return fmt.Errorf("failed to request airdrop: %w", err)
	}

	config.Info("Airdrop requested successfully")

	// Wait for confirmation
	config.Info("Waiting for confirmation...")
	time.Sleep(3 * time.Second)

	// Get balance after
	balanceAfter, err := application.WalletService.GetBalance(wallet.PublicKey)
	if err != nil {
		config.Warnf("Failed to get balance: %v", err)
	} else {
		successStyle := lipgloss.NewStyle().
			Foreground(lipgloss.Color("#00FF00")).
			Bold(true)

		fmt.Println()
		fmt.Println(successStyle.Render("✓ Airdrop successful!"))
		fmt.Printf("New balance: %.4f SOL (+%.4f)\n", balanceAfter, balanceAfter-balanceBefore)
	}

	// Save rate limit
	saveFaucetRateLimit("sol")

	return nil
}

func runFaucetGhost(cmd *cobra.Command, args []string) error {
	// Check network
	if application.Config.Network.Current != "devnet" {
		return fmt.Errorf("faucet only works on devnet (current network: %s)", application.Config.Network.Current)
	}

	// Get active wallet
	wallet, err := application.WalletService.GetActiveWallet()
	if err != nil {
		return fmt.Errorf("no active wallet. Create one with 'ghost wallet create'")
	}

	// Check rate limit
	if err := checkFaucetRateLimit("ghost"); err != nil {
		return err
	}

	// Print info
	titleStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("#FEF9A7")).
		Bold(true)

	labelStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("#888888"))

	fmt.Println(titleStyle.Render("Requesting GHOST from Devnet Faucet"))
	fmt.Printf("%s %s\n", labelStyle.Render("Wallet:"), wallet.PublicKey)
	fmt.Printf("%s 10,000 GHOST\n\n", labelStyle.Render("Requesting:"))

	// Request from GHOST faucet API
	config.Info("Requesting GHOST tokens from airdrop provider...")

	// Create faucet service
	faucetService := services.NewFaucetService(application.Config)

	// Request airdrop
	resp, err := faucetService.RequestGhostAirdrop(wallet.PublicKey)
	if err != nil {
		return fmt.Errorf("failed to request GHOST tokens: %w\n\nNote: Make sure the GhostSpeak web server is running.\nSet GHOSTSPEAK_API_URL=http://localhost:3000 for local development.", err)
	}

	// Display success
	successStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("#00FF00")).
		Bold(true)

	fmt.Println()
	fmt.Println(successStyle.Render("✓ GHOST tokens airdropped successfully!"))
	fmt.Println()
	fmt.Printf("%s %s\n", labelStyle.Render("Amount:"), fmt.Sprintf("%s GHOST", formatNumber(resp.Amount)))
	fmt.Printf("%s %.4f GHOST\n", labelStyle.Render("New Balance:"), resp.Balance)
	fmt.Printf("%s %s\n", labelStyle.Render("Transaction:"), resp.Signature)
	if resp.Explorer != "" {
		fmt.Printf("%s %s\n", labelStyle.Render("Explorer:"), resp.Explorer)
	}
	fmt.Println()

	// Save rate limit
	saveFaucetRateLimit("ghost")

	return nil
}

// checkFaucetRateLimit checks if the user has exceeded the faucet rate limit
func checkFaucetRateLimit(faucetType string) error {
	cacheKey := fmt.Sprintf("faucet_last_request:%s", faucetType)

	var lastRequest time.Time
	if err := application.Storage.GetJSON(cacheKey, &lastRequest); err == nil {
		// Check if 24 hours have passed
		if time.Since(lastRequest) < 24*time.Hour {
			remaining := 24*time.Hour - time.Since(lastRequest)
			hours := int(remaining.Hours())
			minutes := int(remaining.Minutes()) % 60

			return fmt.Errorf("rate limit exceeded. Please wait %dh %dm before requesting again", hours, minutes)
		}
	}

	return nil
}

// saveFaucetRateLimit saves the timestamp of the last faucet request
func saveFaucetRateLimit(faucetType string) {
	cacheKey := fmt.Sprintf("faucet_last_request:%s", faucetType)
	if err := application.Storage.SetJSONWithTTL(cacheKey, time.Now(), 24*time.Hour); err != nil {
		config.Warnf("Failed to save rate limit: %v", err)
	}
}

// formatNumber formats a number with thousand separators
func formatNumber(n int) string {
	if n < 1000 {
		return fmt.Sprintf("%d", n)
	}
	return fmt.Sprintf("%d,%03d", n/1000, n%1000)
}
