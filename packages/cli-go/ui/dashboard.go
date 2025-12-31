package ui

import (
	"fmt"

	"github.com/charmbracelet/bubbles/progress"
	"github.com/charmbracelet/bubbles/spinner"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/ghostspeak/cli-go/internal/app"
)

// DashboardModel shows agent analytics and performance
type DashboardModel struct {
	app      *app.App
	spinner  spinner.Model
	progress progress.Model
	loading  bool
}

// NewDashboardModel creates a new dashboard
func NewDashboardModel(application *app.App) *DashboardModel {
	s := spinner.New()
	s.Spinner = spinner.Dot
	s.Style = lipgloss.NewStyle().
		Foreground(inverseText).
		Background(altBgColor).
		Bold(true)

	p := progress.New(
		progress.WithSolidFill(string(ghostYellow)),
		progress.WithWidth(40),
	)
	// Customize progress colors
	p.EmptyColor = string(mutedColor)
	p.FullColor = string(ghostYellow)

	return &DashboardModel{
		app:      application,
		spinner:  s,
		progress: p,
		loading:  false,
	}
}

// Init initializes the model
func (m *DashboardModel) Init() tea.Cmd {
	return m.spinner.Tick
}

// Update handles messages
func (m *DashboardModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		return m, nil

	case spinner.TickMsg:
		var cmd tea.Cmd
		m.spinner, cmd = m.spinner.Update(msg)
		return m, cmd
	}

	return m, nil
}

// View renders the dashboard
func (m *DashboardModel) View() string {
	if m.loading {
		return fmt.Sprintf("%s Loading analytics...", m.spinner.View())
	}

	title := TitleStyle.Render("📊 Agent Analytics Dashboard")

	// Overview stats
	statsBox := m.renderStats()

	// Performance metrics
	performanceBox := m.renderPerformance()

	// Recent activity
	activityBox := m.renderActivity()

	// Layout in columns
	leftColumn := lipgloss.JoinVertical(
		lipgloss.Left,
		statsBox,
		performanceBox,
	)

	rightColumn := activityBox

	content := Columns(leftColumn, rightColumn, 100)

	return lipgloss.JoinVertical(
		lipgloss.Left,
		title,
		content,
	)
}

func (m *DashboardModel) renderStats() string {
	stats := []string{
		fmt.Sprintf("%s %s", LabelStyle.Render("Total Agents:"), ValueStyle.Render("5")),
		fmt.Sprintf("%s %s", LabelStyle.Render("Active Agents:"), SuccessStyle.Render("4")),
		fmt.Sprintf("%s %s", LabelStyle.Render("Total Jobs:"), ValueStyle.Render("127")),
		fmt.Sprintf("%s %s", LabelStyle.Render("Completed:"), SuccessStyle.Render("118")),
		fmt.Sprintf("%s %s", LabelStyle.Render("In Progress:"), HighlightStyle.Render("9")),
	}

	earnings := []string{
		fmt.Sprintf("%s %s", LabelStyle.Render("Total Earnings:"), SuccessStyle.Render("51.5 SOL")),
		fmt.Sprintf("%s %s", LabelStyle.Render("This Month:"), ValueStyle.Render("18.3 SOL")),
		fmt.Sprintf("%s %s", LabelStyle.Render("Average/Job:"), ValueStyle.Render("0.44 SOL")),
	}

	statsContent := lipgloss.JoinVertical(lipgloss.Left, stats...)
	earningsContent := lipgloss.JoinVertical(lipgloss.Left, earnings...)

	combined := lipgloss.JoinVertical(
		lipgloss.Left,
		TitleStyle.Render("📈 Overview"),
		statsContent,
		"",
		TitleStyle.Render("💰 Earnings"),
		earningsContent,
	)

	return BoxStyle.Render(combined)
}

func (m *DashboardModel) renderPerformance() string {
	metrics := []string{
		TitleStyle.Render("⚡ Performance"),
		"",
		fmt.Sprintf("%s %s", LabelStyle.Render("Success Rate:"), SuccessStyle.Render("92.9%")),
		m.progress.ViewAs(0.929),
		"",
		fmt.Sprintf("%s %s", LabelStyle.Render("Avg Rating:"), ValueStyle.Render("4.7 / 5.0")),
		m.progress.ViewAs(0.94),
		"",
		fmt.Sprintf("%s %s", LabelStyle.Render("Response Time:"), ValueStyle.Render("< 2 min")),
		m.progress.ViewAs(0.85),
	}

	content := lipgloss.JoinVertical(lipgloss.Left, metrics...)
	return BoxStyle.Render(content)
}

func (m *DashboardModel) renderActivity() string {
	activities := []string{
		TitleStyle.Render("🔔 Recent Activity"),
		"",
		fmt.Sprintf("%s %s", SuccessStyle.Render("✓"), "Job completed: Data Analysis"),
		SubtitleStyle.Render("  2 minutes ago • +0.5 SOL"),
		"",
		fmt.Sprintf("%s %s", HighlightStyle.Render("•"), "New job assigned: Content Gen"),
		SubtitleStyle.Render("  15 minutes ago"),
		"",
		fmt.Sprintf("%s %s", SuccessStyle.Render("✓"), "Job completed: Research Task"),
		SubtitleStyle.Render("  1 hour ago • +0.8 SOL"),
		"",
		fmt.Sprintf("%s %s", SuccessStyle.Render("✓"), "Agent registered: Task Automator"),
		SubtitleStyle.Render("  3 hours ago"),
		"",
		fmt.Sprintf("%s %s", HighlightStyle.Render("•"), "Job in progress: Code Review"),
		SubtitleStyle.Render("  5 hours ago"),
	}

	content := lipgloss.JoinVertical(lipgloss.Left, activities...)
	return BoxStyle.Render(content)
}
