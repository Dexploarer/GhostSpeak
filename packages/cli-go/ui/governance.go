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

// GovernanceModel handles governance proposals and voting
type GovernanceModel struct {
	app       *app.App
	table     table.Model
	proposals []*domain.Proposal
	filterStatus string // "all", "active", "passed", "failed"
}

// NewGovernanceModel creates a new governance model
func NewGovernanceModel(application *app.App) *GovernanceModel {
	// Define table columns
	columns := []table.Column{
		{Title: "ID", Width: 10},
		{Title: "Title", Width: 40},
		{Title: "Type", Width: 20},
		{Title: "Status", Width: 12},
		{Title: "Votes For", Width: 12},
		{Title: "Ends In", Width: 15},
	}

	// Sample proposals
	now := time.Now()
	sampleProposals := []*domain.Proposal{
		{
			ID:           "prop-001",
			Proposer:     "GhstProposer1",
			Type:         domain.ProposalTypeParameterChange,
			Status:       domain.ProposalStatusActive,
			Title:        "Increase Ghost Score Rewards",
			Description:  "Proposal to increase Ghost Score rewards by 20% to incentivize quality agents",
			VotingStartsAt: now.Add(-2 * 24 * time.Hour),
			VotingEndsAt:   now.Add(5 * 24 * time.Hour),
			VotesFor:       450,
			VotesAgainst:   120,
			VotesAbstain:   30,
			QuorumRequired: 500,
			PDA:            "Prop123456789abcdefghijklmnopqrstuvwxyzAB1",
		},
		{
			ID:           "prop-002",
			Proposer:     "GhstProposer2",
			Type:         domain.ProposalTypeTreasurySpend,
			Status:       domain.ProposalStatusActive,
			Title:        "Fund Marketing Campaign",
			Description:  "Allocate 100,000 GHOST tokens for Q1 marketing campaign",
			VotingStartsAt: now.Add(-1 * 24 * time.Hour),
			VotingEndsAt:   now.Add(6 * 24 * time.Hour),
			VotesFor:       320,
			VotesAgainst:   80,
			VotesAbstain:   15,
			QuorumRequired: 400,
			PDA:            "Prop123456789abcdefghijklmnopqrstuvwxyzAB2",
		},
		{
			ID:           "prop-003",
			Proposer:     "GhstProposer3",
			Type:         domain.ProposalTypeGeneral,
			Status:       domain.ProposalStatusPassed,
			Title:        "Implement Multi-Signature Support",
			Description:  "Add multi-signature wallet support for enhanced security",
			VotingStartsAt: now.Add(-10 * 24 * time.Hour),
			VotingEndsAt:   now.Add(-3 * 24 * time.Hour),
			VotesFor:       850,
			VotesAgainst:   120,
			VotesAbstain:   45,
			QuorumRequired: 600,
			PDA:            "Prop123456789abcdefghijklmnopqrstuvwxyzAB3",
		},
	}

	rows := buildProposalRows(sampleProposals)

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

	return &GovernanceModel{
		app:          application,
		table:        t,
		proposals:    sampleProposals,
		filterStatus: "all",
	}
}

func buildProposalRows(proposals []*domain.Proposal) []table.Row {
	var rows []table.Row
	for _, prop := range proposals {
		// ID
		id := prop.ID
		if len(id) > 10 {
			id = id[:10]
		}

		// Title
		title := prop.Title
		if len(title) > 40 {
			title = title[:37] + "..."
		}

		// Status
		status := string(prop.Status)

		// Votes For
		votesFor := fmt.Sprintf("%d", prop.VotesFor)

		// Time remaining
		var endsIn string
		if prop.Status == domain.ProposalStatusActive {
			remaining := prop.GetTimeRemaining()
			if remaining > 0 {
				days := int(remaining.Hours() / 24)
				endsIn = fmt.Sprintf("%d days", days)
			} else {
				endsIn = "Ended"
			}
		} else {
			endsIn = "-"
		}

		rows = append(rows, table.Row{
			id,
			title,
			string(prop.Type),
			status,
			votesFor,
			endsIn,
		})
	}
	return rows
}

// Init initializes the model
func (m *GovernanceModel) Init() tea.Cmd {
	return nil
}

// Update handles messages
func (m *GovernanceModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd
	m.table, cmd = m.table.Update(msg)
	return m, cmd
}

// View renders the governance panel
func (m *GovernanceModel) View() string {
	title := TitleStyle.Render("🗳️  Governance Proposals")

	// Stats
	stats := m.renderStats()

	// Filter bar
	filters := m.renderFilters()

	// Table
	tableView := BoxStyle.Render(m.table.View())

	// Selected proposal details
	details := m.renderProposalDetails()

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
		fmt.Sprintf("%s navigate • %s vote • %s create • %s back",
			KeyStyle.Render("↑↓"),
			KeyStyle.Render("v"),
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

func (m *GovernanceModel) renderStats() string {
	totalCount := len(m.proposals)
	activeCount := 0
	passedCount := 0

	for _, prop := range m.proposals {
		if prop.Status == domain.ProposalStatusActive {
			activeCount++
		} else if prop.Status == domain.ProposalStatusPassed {
			passedCount++
		}
	}

	stats := []string{
		fmt.Sprintf("%s %s", LabelStyle.Render("Total:"), ValueStyle.Render(fmt.Sprintf("%d", totalCount))),
		fmt.Sprintf("%s %s", LabelStyle.Render("Active:"), HighlightStyle.Render(fmt.Sprintf("%d", activeCount))),
		fmt.Sprintf("%s %s", LabelStyle.Render("Passed:"), SuccessStyle.Render(fmt.Sprintf("%d", passedCount))),
	}

	content := lipgloss.JoinHorizontal(lipgloss.Top, stats...)
	return BoxStyle.Render(content)
}

func (m *GovernanceModel) renderFilters() string {
	filterOptions := []string{
		"All",
		"Active",
		"Passed",
		"Failed",
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

func (m *GovernanceModel) renderProposalDetails() string {
	if len(m.proposals) == 0 {
		return BoxStyle.Render("No proposals")
	}

	// Get selected proposal
	selectedIdx := m.table.Cursor()
	if selectedIdx >= len(m.proposals) {
		selectedIdx = 0
	}

	prop := m.proposals[selectedIdx]

	var details []string
	details = append(details, TitleStyle.Render("📋 Proposal Details"))
	details = append(details, "")
	details = append(details, HighlightStyle.Render(prop.Title))
	details = append(details, "")
	details = append(details, fmt.Sprintf("%s %s", LabelStyle.Render("ID:"), ValueStyle.Render(prop.ID)))
	details = append(details, fmt.Sprintf("%s %s", LabelStyle.Render("Type:"), ValueStyle.Render(string(prop.Type))))
	details = append(details, fmt.Sprintf("%s %s", LabelStyle.Render("Proposer:"), SubtitleStyle.Render(prop.Proposer)))
	details = append(details, "")

	// Status
	statusStyle := ValueStyle
	switch prop.Status {
	case domain.ProposalStatusActive:
		statusStyle = HighlightStyle
	case domain.ProposalStatusPassed:
		statusStyle = SuccessStyle
	case domain.ProposalStatusFailed:
		statusStyle = ErrorStyle
	}
	details = append(details, fmt.Sprintf("%s %s", LabelStyle.Render("Status:"), statusStyle.Render(string(prop.Status))))

	// Voting info
	details = append(details, "")
	details = append(details, TitleStyle.Render("🗳️  Voting"))
	details = append(details, fmt.Sprintf("%s %d", LabelStyle.Render("For:"), prop.VotesFor))
	details = append(details, fmt.Sprintf("%s %d", LabelStyle.Render("Against:"), prop.VotesAgainst))
	details = append(details, fmt.Sprintf("%s %d", LabelStyle.Render("Abstain:"), prop.VotesAbstain))
	details = append(details, fmt.Sprintf("%s %d", LabelStyle.Render("Quorum:"), prop.QuorumRequired))
	details = append(details, "")

	// Quorum progress
	quorumProgress := prop.GetQuorumProgress()
	quorumStyle := ValueStyle
	if quorumProgress >= 100 {
		quorumStyle = SuccessStyle
	}
	details = append(details, fmt.Sprintf("%s %s",
		LabelStyle.Render("Quorum Progress:"),
		quorumStyle.Render(fmt.Sprintf("%.1f%%", quorumProgress)),
	))

	// Approval rate
	approvalRate := prop.GetApprovalRate()
	approvalStyle := ValueStyle
	if approvalRate > 50 {
		approvalStyle = SuccessStyle
	} else {
		approvalStyle = ErrorStyle
	}
	details = append(details, fmt.Sprintf("%s %s",
		LabelStyle.Render("Approval Rate:"),
		approvalStyle.Render(fmt.Sprintf("%.1f%%", approvalRate)),
	))

	// Time info
	if prop.Status == domain.ProposalStatusActive {
		details = append(details, "")
		remaining := prop.GetTimeRemaining()
		if remaining > 0 {
			days := int(remaining.Hours() / 24)
			hours := int(remaining.Hours()) % 24
			details = append(details, fmt.Sprintf("%s %dd %dh",
				LabelStyle.Render("Time Remaining:"),
				days, hours,
			))
		}
	}

	// Actions
	if prop.CanVote() {
		details = append(details, "")
		details = append(details, TitleStyle.Render("⚡ Actions"))
		details = append(details, fmt.Sprintf("%s Vote For", SuccessStyle.Render("[1]")))
		details = append(details, fmt.Sprintf("%s Vote Against", ErrorStyle.Render("[2]")))
		details = append(details, fmt.Sprintf("%s Abstain", SubtitleStyle.Render("[3]")))
	}

	content := lipgloss.JoinVertical(lipgloss.Left, details...)
	return BoxStyle.Render(content)
}
