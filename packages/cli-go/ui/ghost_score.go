package ui

import (
	"fmt"

	"github.com/charmbracelet/bubbles/progress"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/ghostspeak/cli-go/internal/app"
	"github.com/ghostspeak/cli-go/internal/domain"
)

// GhostScoreModel displays reputation and Ghost Score dashboard
type GhostScoreModel struct {
	app        *app.App
	progress   progress.Model
	reputation *domain.Reputation
}

// NewGhostScoreModel creates a new Ghost Score dashboard
func NewGhostScoreModel(application *app.App) *GhostScoreModel {
	p := progress.New(
		progress.WithSolidFill(string(ghostYellow)),
		progress.WithWidth(40),
	)
	p.EmptyColor = string(mutedColor)
	p.FullColor = string(ghostYellow)

	// Sample reputation data
	sampleRep := &domain.Reputation{
		AgentAddress:    "GhstTzV6DKPx4dLsQk8PoJPh9kqZnEEVvdkXB2kGyLb3",
		GhostScore:      850,
		Tier:            domain.TierPlatinum,
		TotalJobs:       127,
		CompletedJobs:   118,
		FailedJobs:      9,
		SuccessRate:     92.9,
		AverageRating:   4.7,
		ResponseTime:    90,  // 90 seconds
		CompletionTime:  3200, // ~53 minutes
		TotalEarnings:   51_500_000_000, // 51.5 SOL
		AverageEarnings: 0.44,
		Tags: []domain.ReputationTag{
			domain.TagVerified,
			domain.TagHighPerformer,
			domain.TagReliable,
			domain.TagTrusted,
			domain.TagExperienced,
		},
		AdminVerified: true,
		PayAIEvents:   45,
		PayAIRevenue:  15_000_000_000, // 15 SOL
		PDA:           "Rep1234567890abcdefghijklmnopqrstuvwxyzABCD",
	}

	return &GhostScoreModel{
		app:        application,
		progress:   p,
		reputation: sampleRep,
	}
}

// Init initializes the model
func (m *GhostScoreModel) Init() tea.Cmd {
	return nil
}

// Update handles messages
func (m *GhostScoreModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	return m, nil
}

// View renders the Ghost Score dashboard
func (m *GhostScoreModel) View() string {
	title := TitleStyle.Render("⭐ Ghost Score Dashboard")

	if m.reputation == nil {
		return lipgloss.JoinVertical(
			lipgloss.Left,
			title,
			BoxStyle.Render("No reputation data available"),
		)
	}

	// Main score display
	scorePanel := m.renderScorePanel()

	// Performance breakdown
	breakdownPanel := m.renderBreakdown()

	// Tags and badges
	tagsPanel := m.renderTags()

	// Leaderboard position
	leaderboardPanel := m.renderLeaderboard()

	// Layout
	leftColumn := lipgloss.JoinVertical(
		lipgloss.Left,
		scorePanel,
		breakdownPanel,
	)

	rightColumn := lipgloss.JoinVertical(
		lipgloss.Left,
		tagsPanel,
		leaderboardPanel,
	)

	content := Columns(leftColumn, rightColumn, 120)

	help := HelpStyle.Render(
		fmt.Sprintf("%s refresh • %s back",
			KeyStyle.Render("r"),
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

func (m *GhostScoreModel) renderScorePanel() string {
	// Large Ghost Score display
	scoreStyle := lipgloss.NewStyle().
		Foreground(inverseText).
		Background(altBgColor).
		Bold(true).
		Align(lipgloss.Center).
		Padding(2, 4).
		Border(lipgloss.DoubleBorder()).
		BorderForeground(ghostYellow)

	scoreDisplay := scoreStyle.Render(
		fmt.Sprintf("👻 %d", m.reputation.GhostScore),
	)

	// Tier badge
	tierColor := ghostYellow
	tierEmoji := "🥉"
	switch m.reputation.Tier {
	case domain.TierPlatinum:
		tierEmoji = "💎"
	case domain.TierGold:
		tierEmoji = "🥇"
	case domain.TierSilver:
		tierEmoji = "🥈"
	}

	tierBadge := lipgloss.NewStyle().
		Foreground(altBgColor).
		Background(tierColor).
		Bold(true).
		Padding(0, 2).
		Render(fmt.Sprintf("%s %s Tier", tierEmoji, m.reputation.Tier))

	content := lipgloss.JoinVertical(
		lipgloss.Center,
		scoreDisplay,
		"",
		tierBadge,
		"",
		SubtitleStyle.Render(fmt.Sprintf("Agent: %s", m.reputation.AgentAddress[:20]+"...")),
	)

	return BoxStyle.Render(content)
}

func (m *GhostScoreModel) renderBreakdown() string {
	var breakdown []string
	breakdown = append(breakdown, TitleStyle.Render("📊 Score Breakdown"))
	breakdown = append(breakdown, "")

	// Success Rate (0-300 points)
	successPoints := int(m.reputation.SuccessRate * 3.0)
	breakdown = append(breakdown, LabelStyle.Render("Success Rate (300 pts max)"))
	breakdown = append(breakdown, fmt.Sprintf("  %s", m.progress.ViewAs(float64(successPoints)/300.0)))
	breakdown = append(breakdown, fmt.Sprintf("  %s %.1f%% = %d points", HighlightStyle.Render("→"), m.reputation.SuccessRate, successPoints))
	breakdown = append(breakdown, "")

	// Average Rating (0-200 points)
	ratingPoints := int((m.reputation.AverageRating / 5.0) * 200.0)
	breakdown = append(breakdown, LabelStyle.Render("Average Rating (200 pts max)"))
	breakdown = append(breakdown, fmt.Sprintf("  %s", m.progress.ViewAs(float64(ratingPoints)/200.0)))
	breakdown = append(breakdown, fmt.Sprintf("  %s %.1f / 5.0 = %d points", HighlightStyle.Render("→"), m.reputation.AverageRating, ratingPoints))
	breakdown = append(breakdown, "")

	// Experience (0-200 points)
	experiencePoints := int(m.reputation.TotalJobs) * 2
	if experiencePoints > 200 {
		experiencePoints = 200
	}
	breakdown = append(breakdown, LabelStyle.Render("Experience (200 pts max)"))
	breakdown = append(breakdown, fmt.Sprintf("  %s", m.progress.ViewAs(float64(experiencePoints)/200.0)))
	breakdown = append(breakdown, fmt.Sprintf("  %s %d jobs = %d points", HighlightStyle.Render("→"), m.reputation.TotalJobs, experiencePoints))
	breakdown = append(breakdown, "")

	// Response Time (0-150 points)
	responsePoints := 0
	if m.reputation.ResponseTime <= 60 {
		responsePoints = 150
	} else if m.reputation.ResponseTime <= 300 {
		responsePoints = 100
	} else if m.reputation.ResponseTime <= 900 {
		responsePoints = 50
	}
	breakdown = append(breakdown, LabelStyle.Render("Response Time (150 pts max)"))
	breakdown = append(breakdown, fmt.Sprintf("  %s", m.progress.ViewAs(float64(responsePoints)/150.0)))
	breakdown = append(breakdown, fmt.Sprintf("  %s %ds avg = %d points", HighlightStyle.Render("→"), m.reputation.ResponseTime, responsePoints))

	content := lipgloss.JoinVertical(lipgloss.Left, breakdown...)
	return BoxStyle.Render(content)
}

func (m *GhostScoreModel) renderTags() string {
	var tags []string
	tags = append(tags, TitleStyle.Render("🏷️  Tags & Badges"))
	tags = append(tags, "")

	if len(m.reputation.Tags) == 0 {
		tags = append(tags, SubtitleStyle.Render("No tags assigned"))
	} else {
		for _, tag := range m.reputation.Tags {
			tagStyle := HighlightStyle
			emoji := "•"

			switch tag {
			case domain.TagVerified:
				emoji = "✓"
			case domain.TagHighPerformer:
				emoji = "🌟"
			case domain.TagReliable:
				emoji = "🎯"
			case domain.TagTrusted:
				emoji = "🛡️"
			case domain.TagExperienced:
				emoji = "👨‍💼"
			case domain.TagSpecialist:
				emoji = "🔬"
			}

			tags = append(tags, fmt.Sprintf("%s %s", emoji, tagStyle.Render(string(tag))))
		}
	}

	// Add verification status
	tags = append(tags, "")
	if m.reputation.AdminVerified {
		tags = append(tags, SuccessStyle.Render("✓ Admin Verified"))
	}

	// PayAI integration
	if m.reputation.PayAIEvents > 0 {
		tags = append(tags, "")
		tags = append(tags, HighlightStyle.Render("💳 PayAI Integrated"))
		tags = append(tags, fmt.Sprintf("  %s %d events", LabelStyle.Render("Events:"), m.reputation.PayAIEvents))
		tags = append(tags, fmt.Sprintf("  %s %.2f SOL", LabelStyle.Render("Revenue:"), float64(m.reputation.PayAIRevenue)/1e9))
	}

	content := lipgloss.JoinVertical(lipgloss.Left, tags...)
	return BoxStyle.Render(content)
}

func (m *GhostScoreModel) renderLeaderboard() string {
	var leaderboard []string
	leaderboard = append(leaderboard, TitleStyle.Render("🏆 Leaderboard"))
	leaderboard = append(leaderboard, "")

	// Mock leaderboard position
	position := 15
	totalAgents := 487

	leaderboard = append(leaderboard, fmt.Sprintf("%s #%d", LabelStyle.Render("Your Rank:"), position))
	leaderboard = append(leaderboard, fmt.Sprintf("%s %d agents", LabelStyle.Render("Total Agents:"), totalAgents))
	leaderboard = append(leaderboard, "")

	// Percentile
	percentile := 100.0 - (float64(position)/float64(totalAgents))*100.0
	leaderboard = append(leaderboard, fmt.Sprintf("%s Top %.1f%%", HighlightStyle.Render("🎯"), percentile))
	leaderboard = append(leaderboard, "")

	// Performance metrics summary
	leaderboard = append(leaderboard, TitleStyle.Render("📈 Metrics Summary"))
	leaderboard = append(leaderboard, "")
	leaderboard = append(leaderboard, fmt.Sprintf("%s %d", LabelStyle.Render("Total Jobs:"), m.reputation.TotalJobs))
	leaderboard = append(leaderboard, fmt.Sprintf("%s %d", LabelStyle.Render("Completed:"), m.reputation.CompletedJobs))
	leaderboard = append(leaderboard, fmt.Sprintf("%s %.1f%%", LabelStyle.Render("Success Rate:"), m.reputation.SuccessRate))
	leaderboard = append(leaderboard, fmt.Sprintf("%s %.2f SOL", LabelStyle.Render("Total Earnings:"), float64(m.reputation.TotalEarnings)/1e9))
	leaderboard = append(leaderboard, fmt.Sprintf("%s %.3f SOL", LabelStyle.Render("Avg per Job:"), m.reputation.AverageEarnings))

	content := lipgloss.JoinVertical(lipgloss.Left, leaderboard...)
	return BoxStyle.Render(content)
}
