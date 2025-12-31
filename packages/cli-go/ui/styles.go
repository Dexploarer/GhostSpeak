package ui

import (
	"github.com/charmbracelet/lipgloss"
)

// GhostSpeak Brand Color Palette
var (
	// Primary brand colors from logo
	ghostYellow    = lipgloss.Color("#CFFF04") // Neon yellow/lime - main brand color
	ghostBlack     = lipgloss.Color("#000000") // Black - primary text/elements
	ghostYellowAlt = lipgloss.Color("#D4FF00") // Slightly different yellow for variation

	// Functional colors (adjusted to work with yellow theme)
	successColor   = lipgloss.Color("#00FF00") // Bright green
	warningColor   = lipgloss.Color("#FFD700") // Gold
	errorColor     = lipgloss.Color("#FF0000") // Bright red

	// Text colors
	textColor      = ghostBlack              // Primary text - black on yellow
	mutedColor     = lipgloss.Color("#333333") // Dark gray for muted text
	inverseText    = ghostYellow             // Yellow text on black backgrounds

	// Background colors
	bgColor        = ghostYellow              // Primary background - neon yellow
	altBgColor     = ghostBlack               // Alternate background - black
	borderColor    = ghostBlack               // Borders - black

	// UI element colors
	primaryColor   = ghostBlack               // Primary UI elements
	secondaryColor = lipgloss.Color("#222222") // Secondary elements
	accentColor    = ghostYellow              // Accent highlights

	// Adaptive colors for terminal compatibility
	adaptiveBrand = lipgloss.AdaptiveColor{
		Light: "#CFFF04", // Neon yellow on light backgrounds
		Dark:  "#CFFF04", // Same neon yellow on dark backgrounds
	}
	adaptiveText = lipgloss.AdaptiveColor{
		Light: "#000000", // Black text on light backgrounds
		Dark:  "#CFFF04", // Yellow text on dark backgrounds
	}
)

// GhostSpeak Themed Styles
var (
	// DocStyle is the main document style with neon yellow background
	DocStyle = lipgloss.NewStyle().
			Background(bgColor).
			Foreground(textColor).
			Padding(1, 2).
			Margin(1, 2)

	// TitleStyle for section titles - bold black text
	TitleStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(ghostBlack).
			Underline(true).
			MarginBottom(1)

	// HeaderStyle for the app header - inverted colors (black bg, yellow text)
	HeaderStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(inverseText).
			Background(altBgColor).
			Padding(1, 3).
			MarginBottom(1).
			Border(lipgloss.DoubleBorder()).
			BorderForeground(ghostYellow)

	// SubtitleStyle for subtitles - dark gray on yellow
	SubtitleStyle = lipgloss.NewStyle().
			Foreground(mutedColor).
			Italic(true).
			Background(bgColor)

	// BoxStyle for content boxes - black border on yellow bg
	BoxStyle = lipgloss.NewStyle().
			Border(lipgloss.ThickBorder()).
			BorderForeground(borderColor).
			Background(bgColor).
			Foreground(textColor).
			Padding(1, 2).
			MarginTop(1)

	// GhostBoxStyle - special box with inverted colors (like the ghost)
	GhostBoxStyle = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(ghostYellow).
			Background(altBgColor).
			Foreground(inverseText).
			Padding(1, 2).
			MarginTop(1)

	// HighlightStyle for highlighted text - inverse colors
	HighlightStyle = lipgloss.NewStyle().
			Foreground(altBgColor).
			Background(accentColor).
			Bold(true).
			Padding(0, 1)

	// SuccessStyle for success messages
	SuccessStyle = lipgloss.NewStyle().
			Foreground(successColor).
			Bold(true).
			Background(altBgColor).
			Padding(0, 1)

	// ErrorStyle for error messages
	ErrorStyle = lipgloss.NewStyle().
			Foreground(errorColor).
			Bold(true).
			Background(altBgColor).
			Padding(0, 1)

	// MenuItemStyle for menu items - black on yellow
	MenuItemStyle = lipgloss.NewStyle().
			Foreground(textColor).
			Background(bgColor).
			Padding(0, 2)

	// SelectedMenuItemStyle for selected menu items - inverted
	SelectedMenuItemStyle = lipgloss.NewStyle().
				Foreground(inverseText).
				Background(altBgColor).
				Padding(0, 2).
				Bold(true).
				Border(lipgloss.NormalBorder()).
				BorderForeground(ghostYellow)

	// StatusBarStyle for the status bar
	StatusBarStyle = lipgloss.NewStyle().
			Foreground(inverseText).
			Background(altBgColor).
			Padding(0, 1)

	// HelpStyle for help text
	HelpStyle = lipgloss.NewStyle().
			Foreground(mutedColor).
			Background(bgColor).
			Italic(true).
			MarginTop(1)

	// KeyStyle for keyboard shortcuts - bold black on yellow highlight
	KeyStyle = lipgloss.NewStyle().
			Foreground(altBgColor).
			Background(ghostYellowAlt).
			Bold(true).
			Padding(0, 1)

	// ValueStyle for displaying values
	ValueStyle = lipgloss.NewStyle().
			Foreground(textColor).
			Background(bgColor).
			Bold(true)

	// LabelStyle for labels
	LabelStyle = lipgloss.NewStyle().
			Foreground(mutedColor).
			Background(bgColor).
			Bold(true)

	// LogoStyle for the ghost logo/branding
	LogoStyle = lipgloss.NewStyle().
			Foreground(inverseText).
			Background(altBgColor).
			Bold(true).
			Align(lipgloss.Center).
			Padding(1, 2)
)

// Layout helpers
func Columns(left, right string, width int) string {
	leftWidth := width / 2
	rightWidth := width - leftWidth

	return lipgloss.JoinHorizontal(
		lipgloss.Top,
		lipgloss.NewStyle().Width(leftWidth).Render(left),
		lipgloss.NewStyle().Width(rightWidth).Render(right),
	)
}

func Grid(items []string, columns int, width int) string {
	var rows []string
	var currentRow []string

	columnWidth := width / columns

	for i, item := range items {
		currentRow = append(currentRow, lipgloss.NewStyle().
			Width(columnWidth).
			Render(item))

		if (i+1)%columns == 0 {
			rows = append(rows, lipgloss.JoinHorizontal(lipgloss.Top, currentRow...))
			currentRow = []string{}
		}
	}

	// Add remaining items
	if len(currentRow) > 0 {
		rows = append(rows, lipgloss.JoinHorizontal(lipgloss.Top, currentRow...))
	}

	return lipgloss.JoinVertical(lipgloss.Left, rows...)
}
