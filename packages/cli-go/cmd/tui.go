package cmd

import (
	"fmt"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/ghostspeak/cli-go/internal/config"
	"github.com/ghostspeak/cli-go/ui"
	"github.com/spf13/cobra"
)

var tuiCmd = &cobra.Command{
	Use:   "tui",
	Short: "Launch the interactive Terminal UI",
	Long: `Launch the beautiful interactive Terminal User Interface (TUI).

The TUI provides a visual interface for managing agents, wallets, and viewing analytics.
Navigate using arrow keys, select with Enter, and press Esc to go back.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		// Create the Bubbletea program
		p := tea.NewProgram(
			ui.NewModel(application),
			tea.WithAltScreen(),
			tea.WithMouseCellMotion(),
		)

		// Run the program
		if _, err := p.Run(); err != nil {
			config.Errorf("TUI error: %v", err)
			return fmt.Errorf("error running TUI: %w", err)
		}

		return nil
	},
}

func init() {
	rootCmd.AddCommand(tuiCmd)
}
