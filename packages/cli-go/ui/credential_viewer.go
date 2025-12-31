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

// CredentialViewerModel handles credential viewing and management
type CredentialViewerModel struct {
	app         *app.App
	table       table.Model
	credentials []*domain.Credential
	filterType  string // "all", "AgentIdentity", "Reputation", "JobCompletion"
}

// NewCredentialViewerModel creates a new credential viewer
func NewCredentialViewerModel(application *app.App) *CredentialViewerModel {
	// Define table columns
	columns := []table.Column{
		{Title: "ID", Width: 12},
		{Title: "Type", Width: 20},
		{Title: "Status", Width: 10},
		{Title: "Subject", Width: 30},
		{Title: "Crossmint", Width: 12},
		{Title: "Expires", Width: 15},
	}

	// Sample credentials data
	now := time.Now()
	expiresIn30Days := now.Add(30 * 24 * time.Hour)

	sampleCredentials := []*domain.Credential{
		{
			ID:      "cred-001",
			Type:    domain.CredentialTypeAgentIdentity,
			Subject: "GhstTzV6DKPx4dLsQk8PoJPh9kqZnEEVvdkXB2kGyLb3",
			Issuer:  "did:sol:devnet:authority",
			Status:  domain.CredentialStatusActive,
			SubjectData: map[string]interface{}{
				"agentId":      "agent-001",
				"name":         "Data Analyzer Pro",
				"capabilities": []string{"nlp", "data_proc", "api"},
			},
			IssuedAt: now.Add(-10 * 24 * time.Hour),
			CrossmintSync: &domain.CrossmintSyncInfo{
				Status: "synced",
				Chain:  "base-sepolia",
			},
			PDA: "Cred1234567890abcdefghijklmnopqrstuvwxyzABC1",
		},
		{
			ID:      "cred-002",
			Type:    domain.CredentialTypeReputation,
			Subject: "GhstTzV6DKPx4dLsQk8PoJPh9kqZnEEVvdkXB2kGyLb3",
			Issuer:  "did:sol:devnet:authority",
			Status:  domain.CredentialStatusActive,
			SubjectData: map[string]interface{}{
				"ghostScore":  850,
				"tier":        "Platinum",
				"totalJobs":   127,
				"successRate": 92.9,
			},
			IssuedAt:  now.Add(-5 * 24 * time.Hour),
			ExpiresAt: &expiresIn30Days,
			CrossmintSync: &domain.CrossmintSyncInfo{
				Status: "pending",
			},
			PDA: "Cred1234567890abcdefghijklmnopqrstuvwxyzABC2",
		},
		{
			ID:      "cred-003",
			Type:    domain.CredentialTypeJobCompletion,
			Subject: "GhstTzV6DKPx4dLsQk8PoJPh9kqZnEEVvdkXB2kGyLb3",
			Issuer:  "did:sol:devnet:client123",
			Status:  domain.CredentialStatusActive,
			SubjectData: map[string]interface{}{
				"jobId":  "job-456",
				"rating": 4.8,
				"amount": 500000000, // 0.5 SOL
			},
			IssuedAt: now.Add(-2 * 24 * time.Hour),
			PDA:      "Cred1234567890abcdefghijklmnopqrstuvwxyzABC3",
		},
	}

	rows := buildCredentialRows(sampleCredentials)

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

	return &CredentialViewerModel{
		app:         application,
		table:       t,
		credentials: sampleCredentials,
		filterType:  "all",
	}
}

func buildCredentialRows(credentials []*domain.Credential) []table.Row {
	var rows []table.Row
	for _, cred := range credentials {
		// Format ID (truncate)
		id := cred.ID
		if len(id) > 12 {
			id = id[:12]
		}

		// Format subject (truncate)
		subject := cred.Subject
		if len(subject) > 30 {
			subject = subject[:27] + "..."
		}

		// Status
		status := string(cred.Status)

		// Crossmint sync status
		crossmintStatus := "-"
		if cred.CrossmintSync != nil {
			switch cred.CrossmintSync.Status {
			case "synced":
				crossmintStatus = "✓ Synced"
			case "pending":
				crossmintStatus = "⏳ Pending"
			case "failed":
				crossmintStatus = "✗ Failed"
			}
		}

		// Expiration
		expires := "Never"
		if cred.ExpiresAt != nil {
			daysUntil := int(time.Until(*cred.ExpiresAt).Hours() / 24)
			if daysUntil <= 0 {
				expires = "Expired"
			} else if daysUntil <= 7 {
				expires = fmt.Sprintf("%d days", daysUntil)
			} else {
				expires = cred.ExpiresAt.Format("2006-01-02")
			}
		}

		rows = append(rows, table.Row{
			id,
			string(cred.Type),
			status,
			subject,
			crossmintStatus,
			expires,
		})
	}
	return rows
}

// Init initializes the model
func (m *CredentialViewerModel) Init() tea.Cmd {
	return nil
}

// Update handles messages
func (m *CredentialViewerModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd
	m.table, cmd = m.table.Update(msg)
	return m, cmd
}

// View renders the credential viewer
func (m *CredentialViewerModel) View() string {
	title := TitleStyle.Render("📜 Verifiable Credentials")

	// Stats
	stats := m.renderStats()

	// Filter bar
	filters := m.renderFilters()

	// Table
	tableView := BoxStyle.Render(m.table.View())

	// Selected credential details
	details := m.renderSelectedDetails()

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
		fmt.Sprintf("%s navigate • %s filter • %s sync • %s issue new • %s back",
			KeyStyle.Render("↑↓"),
			KeyStyle.Render("f"),
			KeyStyle.Render("s"),
			KeyStyle.Render("i"),
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

func (m *CredentialViewerModel) renderStats() string {
	totalCount := len(m.credentials)
	activeCount := 0
	syncedCount := 0

	for _, cred := range m.credentials {
		if cred.Status == domain.CredentialStatusActive {
			activeCount++
		}
		if cred.CrossmintSync != nil && cred.CrossmintSync.Status == "synced" {
			syncedCount++
		}
	}

	stats := []string{
		fmt.Sprintf("%s %s", LabelStyle.Render("Total:"), ValueStyle.Render(fmt.Sprintf("%d", totalCount))),
		fmt.Sprintf("%s %s", LabelStyle.Render("Active:"), SuccessStyle.Render(fmt.Sprintf("%d", activeCount))),
		fmt.Sprintf("%s %s", LabelStyle.Render("Synced:"), HighlightStyle.Render(fmt.Sprintf("%d", syncedCount))),
	}

	content := lipgloss.JoinHorizontal(lipgloss.Top, stats...)
	return BoxStyle.Render(content)
}

func (m *CredentialViewerModel) renderFilters() string {
	filterOptions := []string{
		"All",
		string(domain.CredentialTypeAgentIdentity),
		string(domain.CredentialTypeReputation),
		string(domain.CredentialTypeJobCompletion),
	}

	var filters []string
	for _, opt := range filterOptions {
		style := SubtitleStyle
		if (m.filterType == "all" && opt == "All") ||
			m.filterType == opt {
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

func (m *CredentialViewerModel) renderSelectedDetails() string {
	if len(m.credentials) == 0 {
		return BoxStyle.Render("No credentials")
	}

	// Get selected credential (using cursor position)
	selectedIdx := m.table.Cursor()
	if selectedIdx >= len(m.credentials) {
		selectedIdx = 0
	}

	cred := m.credentials[selectedIdx]

	var details []string
	details = append(details, TitleStyle.Render("📋 Details"))
	details = append(details, "")
	details = append(details, fmt.Sprintf("%s %s", LabelStyle.Render("ID:"), ValueStyle.Render(cred.ID)))
	details = append(details, fmt.Sprintf("%s %s", LabelStyle.Render("Type:"), ValueStyle.Render(string(cred.Type))))
	details = append(details, fmt.Sprintf("%s %s", LabelStyle.Render("Status:"), SuccessStyle.Render(string(cred.Status))))
	details = append(details, "")
	details = append(details, fmt.Sprintf("%s %s", LabelStyle.Render("Subject:"), SubtitleStyle.Render(cred.Subject)))
	details = append(details, fmt.Sprintf("%s %s", LabelStyle.Render("Issuer:"), SubtitleStyle.Render(cred.Issuer)))
	details = append(details, "")
	details = append(details, fmt.Sprintf("%s %s", LabelStyle.Render("Issued:"), ValueStyle.Render(cred.IssuedAt.Format("2006-01-02 15:04"))))

	if cred.ExpiresAt != nil {
		details = append(details, fmt.Sprintf("%s %s", LabelStyle.Render("Expires:"), ValueStyle.Render(cred.ExpiresAt.Format("2006-01-02 15:04"))))
	}

	// Subject data
	details = append(details, "")
	details = append(details, TitleStyle.Render("📊 Subject Data"))
	for key, value := range cred.SubjectData {
		details = append(details, fmt.Sprintf("  %s: %v", LabelStyle.Render(key), value))
	}

	// Crossmint sync
	if cred.CrossmintSync != nil {
		details = append(details, "")
		details = append(details, TitleStyle.Render("🔗 Crossmint Sync"))
		details = append(details, fmt.Sprintf("  %s: %s", LabelStyle.Render("Status"), cred.CrossmintSync.Status))
		if cred.CrossmintSync.Chain != "" {
			details = append(details, fmt.Sprintf("  %s: %s", LabelStyle.Render("Chain"), cred.CrossmintSync.Chain))
		}
		if cred.CrossmintSync.CredentialID != "" {
			details = append(details, fmt.Sprintf("  %s: %s", LabelStyle.Render("Credential ID"), cred.CrossmintSync.CredentialID))
		}
	}

	content := lipgloss.JoinVertical(lipgloss.Left, details...)
	return BoxStyle.Render(content)
}
