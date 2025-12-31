package ui

import (
	"strings"

	"github.com/charmbracelet/lipgloss"
)

// GhostASCII is the ASCII art representation of the GhostSpeak logo
const GhostASCII = `
    ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
  ▄▀░░░░░░░░░░░░░░░░░▀▄
 █░░░░░░░░░░░░░░░░░░░░░█
█░░░░░░░░░░░░░░░░░░░░░░░█
█░░░░█▀▀▀█░░░░░█▀▀▀█░░░░█
█░░░█░░░░░█░░░█░░░░░█░░░█
█░░░█░░░░░█░░░█░░░░░█░░░█
█░░░░▀▀▀▀▀░░░░░▀▀▀▀▀░░░░█
█░░░░░░░░░░░░░░░░░░░░░░░█
█░░░░░░░▀▀▀▀▀▀▀▀▀░░░░░░░█
█░░░░░░░█████████░░░░░░░█
█░░░░░░░░░░░░░░░░░░░░░░░█
 █░░░░░░░░░░░░░░░░░░░░░█
  ▀▄░░░░░░░░░░░░░░░░░▄▀
    ▀▀▄▄░░░░░░░░░░▄▄▀▀
       ▀▀▀▀▀▀▀▀▀▀▀
`

// SimpleGhost is a simpler ghost for smaller spaces
const SimpleGhost = `
    ▄▄▄▄▄
  ▄▀ ◉ ◉ ▀▄
 █   ▬▬▬   █
  ▀▄     ▄▀
    ▀▀▀▀▀
`

// ZipperMouth for the ghost's signature zipper
const ZipperMouth = "▬▬▬▬▬▬▬▬"

// RenderSplashScreen creates the full splash screen with branding
func RenderSplashScreen(width, height int) string {
	// Create the ghost logo
	ghost := LogoStyle.
		Width(width).
		Render(GhostASCII)

	// Create title
	title := lipgloss.NewStyle().
		Bold(true).
		Foreground(inverseText).
		Background(altBgColor).
		Padding(0, 2).
		Align(lipgloss.Center).
		Width(width).
		Render("GHOSTSPEAK")

	// Create subtitle
	subtitle := lipgloss.NewStyle().
		Foreground(ghostYellowAlt).
		Background(altBgColor).
		Italic(true).
		Align(lipgloss.Center).
		Width(width).
		Render("AI Agents on Solana")

	// Create tagline
	tagline := lipgloss.NewStyle().
		Foreground(mutedColor).
		Background(altBgColor).
		Align(lipgloss.Center).
		Width(width).
		Render("Powered by Charm ✨")

	// Combine all elements
	splash := lipgloss.JoinVertical(
		lipgloss.Center,
		"",
		ghost,
		"",
		title,
		subtitle,
		"",
		tagline,
		"",
	)

	// Wrap in a box
	return lipgloss.NewStyle().
		Background(altBgColor).
		Foreground(inverseText).
		Padding(2, 4).
		Border(lipgloss.DoubleBorder()).
		BorderForeground(ghostYellow).
		Width(width).
		Align(lipgloss.Center).
		Render(splash)
}

// RenderMiniGhost creates a small ghost for headers/footers
func RenderMiniGhost() string {
	return lipgloss.NewStyle().
		Foreground(inverseText).
		Background(altBgColor).
		Render("👻")
}

// RenderGhostBanner creates an animated-style banner
func RenderGhostBanner(text string) string {
	ghost := "👻"
	zipper := ZipperMouth

	banner := lipgloss.JoinHorizontal(
		lipgloss.Center,
		LogoStyle.Render(ghost),
		" ",
		lipgloss.NewStyle().
			Bold(true).
			Foreground(inverseText).
			Background(altBgColor).
			Render(text),
		" ",
		LogoStyle.Render(zipper),
	)

	return lipgloss.NewStyle().
		Background(altBgColor).
		Padding(0, 2).
		Render(banner)
}

// ZipperLine creates a decorative zipper separator
func ZipperLine(width int) string {
	zippers := strings.Repeat("▬", width/2)
	return lipgloss.NewStyle().
		Foreground(ghostYellow).
		Background(altBgColor).
		Align(lipgloss.Center).
		Width(width).
		Render(zippers)
}

// GhostLoader creates an animated loading message
func GhostLoader(message string, frame int) string {
	ghosts := []string{"👻", "🎃", "💀", "🦴"}
	ghost := ghosts[frame%len(ghosts)]

	return lipgloss.NewStyle().
		Foreground(inverseText).
		Background(altBgColor).
		Render(ghost + " " + message)
}
