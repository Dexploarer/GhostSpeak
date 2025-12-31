package cmd

import (
	"fmt"
	"os"
	"os/exec"
	"runtime"

	"github.com/charmbracelet/lipgloss"
	"github.com/ghostspeak/cli-go/internal/config"
	"github.com/ghostspeak/cli-go/internal/services"
	"github.com/spf13/cobra"
)

// updateCmd represents the update command
var updateCmd = &cobra.Command{
	Use:   "update",
	Short: "Manage CLI updates",
	Long:  `Check for updates, install new versions, and view changelogs.`,
}

// updateCheckCmd checks for available updates
var updateCheckCmd = &cobra.Command{
	Use:   "check",
	Short: "Check for available updates",
	RunE:  runUpdateCheck,
}

// updateInstallCmd installs the latest version
var updateInstallCmd = &cobra.Command{
	Use:   "install",
	Short: "Install the latest version",
	Long: `Download and install the latest version of the GhostSpeak CLI.

This will replace the current binary with the latest version from GitHub.`,
	RunE: runUpdateInstall,
}

// updateChangelogCmd shows the changelog
var updateChangelogCmd = &cobra.Command{
	Use:   "changelog",
	Short: "View the latest release notes",
	RunE:  runUpdateChangelog,
}

func init() {
	rootCmd.AddCommand(updateCmd)
	updateCmd.AddCommand(updateCheckCmd)
	updateCmd.AddCommand(updateInstallCmd)
	updateCmd.AddCommand(updateChangelogCmd)
}

func runUpdateCheck(cmd *cobra.Command, args []string) error {
	updateService := services.NewUpdateService(Version, application.Storage)

	config.Info("Checking for updates...")

	updateInfo, err := updateService.CheckForUpdates(true)
	if err != nil {
		return fmt.Errorf("failed to check for updates: %w", err)
	}

	// Style definitions
	titleStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("#00D9FF")).
		Bold(true)

	successStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("#00FF00")).
		Bold(true)

	warningStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("#FFD700")).
		Bold(true)

	// Display results
	fmt.Println(titleStyle.Render("Update Check"))
	fmt.Printf("Current version: v%s\n", updateInfo.CurrentVersion)
	fmt.Printf("Latest version:  v%s\n", updateInfo.LatestVersion)
	fmt.Println()

	if updateInfo.UpdateAvailable {
		fmt.Println(warningStyle.Render("⚠ Update available!"))
		fmt.Printf("Released: %s\n", updateInfo.PublishedAt.Format("January 2, 2006"))
		fmt.Println()
		fmt.Println("To install the latest version, run:")
		fmt.Println("  ghost update install")
		fmt.Println()
		fmt.Println("To view the changelog, run:")
		fmt.Println("  ghost update changelog")
	} else {
		fmt.Println(successStyle.Render("✓ You're running the latest version!"))
	}

	return nil
}

func runUpdateInstall(cmd *cobra.Command, args []string) error {
	updateService := services.NewUpdateService(Version, application.Storage)

	// Check for updates first
	config.Info("Checking for updates...")

	updateInfo, err := updateService.CheckForUpdates(true)
	if err != nil {
		return fmt.Errorf("failed to check for updates: %w", err)
	}

	if !updateInfo.UpdateAvailable {
		successStyle := lipgloss.NewStyle().
			Foreground(lipgloss.Color("#00FF00")).
			Bold(true)

		fmt.Println(successStyle.Render("✓ You're already running the latest version!"))
		return nil
	}

	warningStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("#FFD700")).
		Bold(true)

	fmt.Println(warningStyle.Render("⚠ Update Available"))
	fmt.Printf("Current: v%s → Latest: v%s\n\n", updateInfo.CurrentVersion, updateInfo.LatestVersion)

	// Get download URL
	downloadURL, err := updateService.GetDownloadURL()
	if err != nil {
		return fmt.Errorf("failed to get download URL: %w", err)
	}

	config.Infof("Download URL: %s", downloadURL)
	fmt.Println()
	fmt.Println("To install this update, run:")
	fmt.Println()

	// Provide platform-specific installation instructions
	switch runtime.GOOS {
	case "darwin", "linux":
		fmt.Println("  # Download and replace the binary")
		fmt.Printf("  curl -L %s -o /tmp/ghost\n", downloadURL)
		fmt.Println("  chmod +x /tmp/ghost")
		fmt.Println("  sudo mv /tmp/ghost /usr/local/bin/ghost")
		fmt.Println()
		fmt.Println("Or use this one-liner:")
		fmt.Printf("  curl -L %s -o /tmp/ghost && chmod +x /tmp/ghost && sudo mv /tmp/ghost $(which ghost)\n", downloadURL)
	case "windows":
		fmt.Println("  # Download the new version")
		fmt.Printf("  Invoke-WebRequest -Uri %s -OutFile ghost.exe\n", downloadURL)
		fmt.Println()
		fmt.Println("  Then replace your current ghost.exe with the downloaded file.")
	}

	fmt.Println()
	fmt.Println("Note: Automatic installation is not yet implemented.")
	fmt.Println("Please follow the manual installation steps above.")

	return nil
}

func runUpdateChangelog(cmd *cobra.Command, args []string) error {
	updateService := services.NewUpdateService(Version, application.Storage)

	config.Info("Fetching changelog...")

	changelog, err := updateService.GetChangelog()
	if err != nil {
		return fmt.Errorf("failed to fetch changelog: %w", err)
	}

	titleStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("#00D9FF")).
		Bold(true)

	fmt.Println(titleStyle.Render("Latest Release Notes"))
	fmt.Println()
	fmt.Println(changelog)

	return nil
}

// getExecutablePath returns the path to the current executable
func getExecutablePath() (string, error) {
	return os.Executable()
}

// downloadFile downloads a file from a URL
func downloadFile(url, dest string) error {
	// Use curl or wget depending on platform
	var cmd *exec.Cmd

	if runtime.GOOS == "windows" {
		// Use PowerShell on Windows
		cmd = exec.Command("powershell", "-Command", fmt.Sprintf("Invoke-WebRequest -Uri %s -OutFile %s", url, dest))
	} else {
		// Use curl on Unix-like systems
		cmd = exec.Command("curl", "-L", "-o", dest, url)
	}

	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	return cmd.Run()
}
