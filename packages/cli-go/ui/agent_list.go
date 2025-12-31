package ui

import (
	"fmt"

	"github.com/charmbracelet/bubbles/table"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/ghostspeak/cli-go/internal/app"
)

// AgentListModel displays a list of agents
type AgentListModel struct {
	app   *app.App
	table table.Model
}

// NewAgentListModel creates a new agent list
func NewAgentListModel(application *app.App) *AgentListModel {
	// Define table columns
	columns := []table.Column{
		{Title: "ID", Width: 12},
		{Title: "Name", Width: 20},
		{Title: "Type", Width: 15},
		{Title: "Status", Width: 10},
		{Title: "Capabilities", Width: 12},
		{Title: "Earnings (SOL)", Width: 15},
	}

	// Sample data (in production, this would come from blockchain)
	rows := []table.Row{
		{"agent-001", "Data Analyzer Pro", "Data Analysis", "Active", "5", "12.5"},
		{"agent-002", "Content Creator", "Content Gen", "Active", "3", "8.2"},
		{"agent-003", "Research Bot", "Research", "Inactive", "4", "5.7"},
		{"agent-004", "Code Assistant", "General", "Active", "6", "15.3"},
		{"agent-005", "Task Automator", "Automation", "Active", "4", "9.8"},
	}

	t := table.New(
		table.WithColumns(columns),
		table.WithRows(rows),
		table.WithFocused(true),
		table.WithHeight(10),
	)

	// Apply GhostSpeak themed styles
	s := table.DefaultStyles()
	s.Header = s.Header.
		BorderStyle(lipgloss.ThickBorder()).
		BorderForeground(ghostBlack).
		BorderBottom(true).
		Bold(true).
		Foreground(ghostBlack).
		Background(ghostYellow)

	s.Selected = s.Selected.
		Foreground(inverseText).
		Background(altBgColor).
		Bold(true)

	s.Cell = s.Cell.
		Foreground(textColor).
		Background(bgColor)

	t.SetStyles(s)

	return &AgentListModel{
		app:   application,
		table: t,
	}
}

// Init initializes the model
func (m *AgentListModel) Init() tea.Cmd {
	return nil
}

// Update handles messages
func (m *AgentListModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd
	m.table, cmd = m.table.Update(msg)
	return m, cmd
}

// View renders the agent list
func (m *AgentListModel) View() string {
	title := TitleStyle.Render("Your Agents")
	stats := SubtitleStyle.Render(
		fmt.Sprintf("Total: %d agents • Active: %d • Total Earnings: 51.5 SOL",
			5, 4,
		),
	)

	tableView := BoxStyle.Render(m.table.View())

	help := HelpStyle.Render(
		fmt.Sprintf("%s navigate • %s view details • %s back",
			KeyStyle.Render("↑↓"),
			KeyStyle.Render("enter"),
			KeyStyle.Render("esc"),
		),
	)

	return lipgloss.JoinVertical(
		lipgloss.Left,
		title,
		stats,
		tableView,
		help,
	)
}
