package ui

import (
	"fmt"
	"time"

	"github.com/charmbracelet/bubbles/table"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/ghostspeak/cli-go/internal/app"
	"github.com/ghostspeak/cli-go/internal/domain"
)

// EscrowManagerModel handles escrow management
type EscrowManagerModel struct {
	app       *app.App
	table     table.Model
	escrows   []*domain.Escrow
	filterStatus string // "all", "active", "completed", "disputed"
}

// NewEscrowManagerModel creates a new escrow manager
func NewEscrowManagerModel(application *app.App) *EscrowManagerModel {
	// Define table columns
	columns := []table.Column{
		{Title: "ID", Width: 10},
		{Title: "Status", Width: 12},
		{Title: "Amount", Width: 15},
		{Title: "Agent", Width: 25},
		{Title: "Deadline", Width: 12},
		{Title: "Created", Width: 15},
	}

	// Sample escrows
	now := time.Now()
	deadline1 := now.Add(7 * 24 * time.Hour)
	deadline2 := now.Add(3 * 24 * time.Hour)
	funded1 := now.Add(-5 * 24 * time.Hour)
	funded2 := now.Add(-2 * 24 * time.Hour)

	sampleEscrows := []*domain.Escrow{
		{
			ID:          "esc-001",
			Status:      domain.EscrowStatusFunded,
			Client:      "ClientAddress123",
			Agent:       "AgentAddress456",
			Amount:      500_000_000, // 0.5 SOL
			Token:       domain.TokenSOL,
			TokenSymbol: "SOL",
			Description: "Data analysis job for Q4 report",
			Deadline:    &deadline1,
			FundedAt:    &funded1,
			PDA:         "Escrow123456789abcdefghijklmnopqrstuvwxyzA1",
		},
		{
			ID:          "esc-002",
			Status:      domain.EscrowStatusInProgress,
			Client:      "ClientAddress789",
			Agent:       "AgentAddress012",
			Amount:      1_200_000_000, // 1.2 SOL
			Token:       domain.TokenSOL,
			TokenSymbol: "SOL",
			Description: "Content generation for marketing campaign",
			Deadline:    &deadline2,
			FundedAt:    &funded2,
			PDA:         "Escrow123456789abcdefghijklmnopqrstuvwxyzA2",
		},
		{
			ID:          "esc-003",
			Status:      domain.EscrowStatusCompleted,
			Client:      "ClientAddress345",
			Agent:       "AgentAddress678",
			Amount:      800_000_000, // 0.8 SOL
			Token:       domain.TokenSOL,
			TokenSymbol: "SOL",
			Description: "Research task completed",
			Deadline:    nil,
			FundedAt:    &funded1,
			PDA:         "Escrow123456789abcdefghijklmnopqrstuvwxyzA3",
		},
	}

	rows := buildEscrowRows(sampleEscrows)

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

	return &EscrowManagerModel{
		app:          application,
		table:        t,
		escrows:      sampleEscrows,
		filterStatus: "all",
	}
}

func buildEscrowRows(escrows []*domain.Escrow) []table.Row {
	var rows []table.Row
	for _, esc := range escrows {
		// ID
		id := esc.ID
		if len(id) > 10 {
			id = id[:10]
		}

		// Status with emoji
		status := fmt.Sprintf("%s %s", esc.GetStatusEmoji(), string(esc.Status))

		// Amount
		amount := esc.GetFormattedAmount()

		// Agent (truncated)
		agent := esc.Agent
		if len(agent) > 25 {
			agent = agent[:22] + "..."
		}

		// Deadline
		var deadline string
		if esc.Deadline != nil {
			remaining := esc.GetTimeUntilDeadline()
			if remaining > 0 {
				days := int(remaining.Hours() / 24)
				deadline = fmt.Sprintf("%dd", days)
			} else {
				deadline = "Overdue"
			}
		} else {
			deadline = "None"
		}

		// Created
		created := esc.CreatedAt.Format("2006-01-02")

		rows = append(rows, table.Row{
			id,
			status,
			amount,
			agent,
			deadline,
			created,
		})
	}
	return rows
}

// Init initializes the model
func (m *EscrowManagerModel) Init() tea.Cmd {
	return nil
}

// Update handles messages
func (m *EscrowManagerModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd
	m.table, cmd = m.table.Update(msg)
	return m, cmd
}

// View renders the escrow manager
func (m *EscrowManagerModel) View() string {
	title := TitleStyle.Render("💰 Escrow Manager")

	// Stats
	stats := m.renderStats()

	// Filter bar
	filters := m.renderFilters()

	// Table
	tableView := BoxStyle.Render(m.table.View())

	// Selected escrow details
	details := m.renderEscrowDetails()

	// Layout
	topSection := lipgloss.JoinVertical(
		lipgloss.Left,
		stats,
		filters,
	)

	leftColumn := lipgloss.JoinVertical(
		lipgloss.Left,
		topSection,
		tableView,
	)

	content := Columns(leftColumn, details, 120)

	help := HelpStyle.Render(
		fmt.Sprintf("%s navigate • %s action • %s create • %s back",
			KeyStyle.Render("↑↓"),
			KeyStyle.Render("a"),
			KeyStyle.Render("c"),
			KeyStyle.Render("esc"),
		),
	)

	return lipgloss.JoinVertical(
		lipgloss.Left,
		title,
		content,
		help,
	)
}

func (m *EscrowManagerModel) renderStats() string {
	totalCount := len(m.escrows)
	activeCount := 0
	completedCount := 0
	totalAmount := uint64(0)

	for _, esc := range m.escrows {
		if esc.IsActive() {
			activeCount++
		}
		if esc.Status == domain.EscrowStatusCompleted || esc.Status == domain.EscrowStatusReleased {
			completedCount++
		}
		totalAmount += esc.Amount
	}

	totalSOL := float64(totalAmount) / 1e9

	stats := []string{
		fmt.Sprintf("%s %s", LabelStyle.Render("Total:"), ValueStyle.Render(fmt.Sprintf("%d", totalCount))),
		fmt.Sprintf("%s %s", LabelStyle.Render("Active:"), HighlightStyle.Render(fmt.Sprintf("%d", activeCount))),
		fmt.Sprintf("%s %s", LabelStyle.Render("Volume:"), SuccessStyle.Render(fmt.Sprintf("%.2f SOL", totalSOL))),
	}

	content := lipgloss.JoinHorizontal(lipgloss.Top, stats...)
	return BoxStyle.Render(content)
}

func (m *EscrowManagerModel) renderFilters() string {
	filterOptions := []string{
		"All",
		"Active",
		"Completed",
		"Disputed",
	}

	var filters []string
	for _, opt := range filterOptions {
		style := SubtitleStyle
		if (m.filterStatus == "all" && opt == "All") ||
			m.filterStatus == opt {
			style = HighlightStyle
		}
		filters = append(filters, style.Render(opt))
	}

	filterBar := fmt.Sprintf("%s %s",
		LabelStyle.Render("Filter:"),
		lipgloss.JoinHorizontal(lipgloss.Top, filters...),
	)

	return BoxStyle.Render(filterBar)
}

func (m *EscrowManagerModel) renderEscrowDetails() string {
	if len(m.escrows) == 0 {
		return BoxStyle.Render("No escrows")
	}

	// Get selected escrow
	selectedIdx := m.table.Cursor()
	if selectedIdx >= len(m.escrows) {
		selectedIdx = 0
	}

	esc := m.escrows[selectedIdx]

	var details []string
	details = append(details, TitleStyle.Render("📋 Escrow Details"))
	details = append(details, "")

	// Status
	statusEmoji := esc.GetStatusEmoji()
	statusStyle := ValueStyle
	switch esc.Status {
	case domain.EscrowStatusCompleted, domain.EscrowStatusReleased:
		statusStyle = SuccessStyle
	case domain.EscrowStatusDisputed:
		statusStyle = ErrorStyle
	case domain.EscrowStatusInProgress, domain.EscrowStatusFunded:
		statusStyle = HighlightStyle
	}
	details = append(details, fmt.Sprintf("%s %s %s",
		LabelStyle.Render("Status:"),
		statusEmoji,
		statusStyle.Render(string(esc.Status)),
	))

	// Amount
	details = append(details, fmt.Sprintf("%s %s",
		LabelStyle.Render("Amount:"),
		SuccessStyle.Render(esc.GetFormattedAmount()),
	))

	details = append(details, "")
	details = append(details, TitleStyle.Render("👥 Parties"))
	details = append(details, fmt.Sprintf("%s %s", LabelStyle.Render("Client:"), SubtitleStyle.Render(esc.Client)))
	details = append(details, fmt.Sprintf("%s %s", LabelStyle.Render("Agent:"), SubtitleStyle.Render(esc.Agent)))

	// Description
	details = append(details, "")
	details = append(details, TitleStyle.Render("📝 Description"))
	details = append(details, SubtitleStyle.Render(esc.Description))

	// Timeline
	details = append(details, "")
	details = append(details, TitleStyle.Render("⏱️  Timeline"))
	details = append(details, fmt.Sprintf("%s %s", LabelStyle.Render("Created:"), esc.CreatedAt.Format("2006-01-02 15:04")))

	if esc.FundedAt != nil {
		details = append(details, fmt.Sprintf("%s %s", LabelStyle.Render("Funded:"), esc.FundedAt.Format("2006-01-02 15:04")))
	}

	if esc.Deadline != nil {
		deadlineStyle := ValueStyle
		if esc.IsOverdue() {
			deadlineStyle = ErrorStyle
		}
		details = append(details, fmt.Sprintf("%s %s", LabelStyle.Render("Deadline:"), deadlineStyle.Render(esc.Deadline.Format("2006-01-02 15:04"))))

		remaining := esc.GetTimeUntilDeadline()
		if remaining > 0 {
			days := int(remaining.Hours() / 24)
			hours := int(remaining.Hours()) % 24
			details = append(details, fmt.Sprintf("%s %dd %dh", LabelStyle.Render("Remaining:"), days, hours))
		}
	}

	// Duration
	duration := esc.GetDuration()
	days := int(duration.Hours() / 24)
	details = append(details, fmt.Sprintf("%s %d days", LabelStyle.Render("Duration:"), days))

	// Dispute info
	if esc.Dispute != nil {
		details = append(details, "")
		details = append(details, TitleStyle.Render("⚠️  Dispute"))
		details = append(details, fmt.Sprintf("%s %s", LabelStyle.Render("Status:"), ErrorStyle.Render(string(esc.Dispute.Status))))
		details = append(details, fmt.Sprintf("%s %s", LabelStyle.Render("Initiator:"), SubtitleStyle.Render(esc.Dispute.Initiator)))
		details = append(details, fmt.Sprintf("%s %s", LabelStyle.Render("Reason:"), SubtitleStyle.Render(esc.Dispute.Reason)))
	}

	// Milestones
	if len(esc.Milestones) > 0 {
		details = append(details, "")
		details = append(details, TitleStyle.Render("✅ Milestones"))
		for i, milestone := range esc.Milestones {
			if i >= 3 { // Show only first 3
				details = append(details, SubtitleStyle.Render(fmt.Sprintf("... and %d more", len(esc.Milestones)-3)))
				break
			}
			details = append(details, fmt.Sprintf("  • %s", SubtitleStyle.Render(milestone)))
		}
	}

	// Actions
	details = append(details, "")
	details = append(details, TitleStyle.Render("⚡ Actions"))

	if esc.CanRelease() {
		details = append(details, fmt.Sprintf("%s Release Funds", SuccessStyle.Render("[r]")))
	}

	if esc.CanDispute() {
		details = append(details, fmt.Sprintf("%s Dispute", ErrorStyle.Render("[d]")))
	}

	if esc.CanCancel() {
		details = append(details, fmt.Sprintf("%s Cancel", SubtitleStyle.Render("[x]")))
	}

	content := lipgloss.JoinVertical(lipgloss.Left, details...)
	return BoxStyle.Render(content)
}
