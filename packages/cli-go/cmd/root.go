package cmd

import (
	"fmt"
	"os"

	"github.com/charmbracelet/lipgloss"
	"github.com/ghostspeak/cli-go/internal/app"
	"github.com/ghostspeak/cli-go/internal/config"
	"github.com/spf13/cobra"
)

var (
	// Global flags
	flagInteractive bool
	flagDebug       bool
	flagDryRun      bool
	flagNetwork     string

	// Global app instance
	application *app.App

	// Version information
	Version = "1.0.0"
	SDKVersion = "2.0.4"
)

// rootCmd represents the base command when called without any subcommands
var rootCmd = &cobra.Command{
	Use:   "ghost",
	Short: "GhostSpeak AI Agent Commerce Protocol CLI",
	Long:  renderBanner(),
	PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
		// Skip app initialization for certain commands
		skipInit := cmd.Name() == "version" || cmd.Name() == "help"
		if skipInit {
			return nil
		}

		// Initialize application
		var err error
		application, err = app.NewApp()
		if err != nil {
			return fmt.Errorf("failed to initialize application: %w", err)
		}

		// Set debug mode if flag is set
		if flagDebug {
			application.Config.Logging.Level = "debug"
			config.InitLogger(application.Config)
		}

		return nil
	},
	PersistentPostRunE: func(cmd *cobra.Command, args []string) error {
		// Clean up application
		if application != nil {
			return application.Close()
		}
		return nil
	},
}

// Execute adds all child commands to the root command and sets flags appropriately.
func Execute() {
	err := rootCmd.Execute()
	if err != nil {
		os.Exit(1)
	}
}

func init() {
	// Global flags
	rootCmd.PersistentFlags().BoolVarP(&flagInteractive, "interactive", "i", false, "Run in interactive mode")
	rootCmd.PersistentFlags().BoolVar(&flagDebug, "debug", false, "Enable debug output")
	rootCmd.PersistentFlags().BoolVar(&flagDryRun, "dry-run", false, "Show what would be done without executing")
	rootCmd.PersistentFlags().StringVar(&flagNetwork, "network", "", "Override network (devnet, testnet, mainnet)")

	// Add version command
	rootCmd.AddCommand(&cobra.Command{
		Use:   "version",
		Short: "Show version information",
		Run: func(cmd *cobra.Command, args []string) {
			fmt.Printf("GhostSpeak CLI v%s\n", Version)
			fmt.Printf("SDK v%s\n", SDKVersion)
		},
	})
}

// renderBanner creates the ASCII art banner
func renderBanner() string {
	titleStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("#FEF9A7")).
		Bold(true)

	subtitleStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("#666666"))

	banner := titleStyle.Render(`
  ██████╗ ██╗  ██╗ ██████╗ ███████╗████████╗███████╗██████╗ ███████╗ █████╗ ██╗  ██╗
 ██╔════╝ ██║  ██║██╔═══██╗██╔════╝╚══██╔══╝██╔════╝██╔══██╗██╔════╝██╔══██╗██║ ██╔╝
 ██║  ███╗███████║██║   ██║███████╗   ██║   ███████╗██████╔╝█████╗  ███████║█████╔╝
 ██║   ██║██╔══██║██║   ██║╚════██║   ██║   ╚════██║██╔═══╝ ██╔══╝  ██╔══██║██╔═██╗
 ╚██████╔╝██║  ██║╚██████╔╝███████║   ██║   ███████║██║     ███████╗██║  ██║██║  ██╗
  ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝   ╚═╝   ╚══════╝╚═╝     ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝
`)

	subtitle := subtitleStyle.Render("\nAI Agent Commerce Protocol CLI")
	version := subtitleStyle.Render(fmt.Sprintf("CLI v%s | SDK v%s\n", Version, SDKVersion))

	return banner + "\n" + subtitle + "\n" + version
}

// GetApp returns the global application instance
func GetApp() *app.App {
	return application
}
