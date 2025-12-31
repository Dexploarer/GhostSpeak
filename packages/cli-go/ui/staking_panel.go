package ui

import (
	"fmt"
	"time"

	"github.com/charmbracelet/bubbles/progress"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/ghostspeak/cli-go/internal/app"
	"github.com/ghostspeak/cli-go/internal/domain"
)

// StakingPanelModel handles staking operations
type StakingPanelModel struct {
	app      *app.App
	progress progress.Model
	account  *domain.StakingAccount
	stats    *domain.StakingStats
}

// NewStakingPanelModel creates a new staking panel
func NewStakingPanelModel(application *app.App) *StakingPanelModel {
	p := progress.New(
		progress.WithSolidFill(string(ghostYellow)),
		progress.WithWidth(40),
	)
	p.EmptyColor = string(mutedColor)
	p.FullColor = string(ghostYellow)

	// Sample staking account
	unlockTime := time.Now().Add(60 * 24 * time.Hour)
	sampleAccount := &domain.StakingAccount{
		Staker:             "GhstTzV6DKPx4dLsQk8PoJPh9kqZnEEVvdkXB2kGyLb3",
		Amount:             10_000_000_000,
		AmountGHOST:        10000.0,
		LockPeriod:         domain.Lock90Days,
		UnlocksAt:          unlockTime,
		Status:             domain.StatusLocked,
		Tier:               domain.StakingTierSilver,
		ReputationBoost:    15.0,
		HasVerifiedBadge:   true,
		HasPremiumBenefits: false,
		UnclaimedRewards:   150_000_000,
		CurrentAPY:         12.0,
		EstimatedAPY:       12.0,
		PDA:                "Stake123",
	}

	sampleStats := &domain.StakingStats{
		TotalStaked:      500_000_000_000_000,
		TotalStakedGHOST: 500_000.0,
		TotalStakers:     1247,
		AverageAPY:       12.5,
	}

	return &StakingPanelModel{
		app:      application,
		progress: p,
		account:  sampleAccount,
		stats:    sampleStats,
	}
}

func (m *StakingPanelModel) Init() tea.Cmd {
	return nil
}

func (m *StakingPanelModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	return m, nil
}

func (m *StakingPanelModel) View() string {
	title := TitleStyle.Render("🔒 Staking Panel")
	accountPanel := m.renderAccount()
	statsPanel := m.renderStats()
	actionsPanel := m.renderActions()

	leftCol := lipgloss.JoinVertical(lipgloss.Left, accountPanel)
	rightCol := lipgloss.JoinVertical(lipgloss.Left, statsPanel, actionsPanel)
	content := Columns(leftCol, rightCol, 120)

	help := HelpStyle.Render(fmt.Sprintf("%s back", KeyStyle.Render("esc")))
	return lipgloss.JoinVertical(lipgloss.Left, title, content, help)
}

func (m *StakingPanelModel) renderAccount() string {
	if m.account == nil {
		return BoxStyle.Render("No staking account")
	}

	var lines []string
	lines = append(lines, TitleStyle.Render("💰 Your Stake"))
	lines = append(lines, "")
	lines = append(lines, fmt.Sprintf("%s %.2f GHOST", LabelStyle.Render("Amount:"), m.account.AmountGHOST))
	lines = append(lines, fmt.Sprintf("%s %s", LabelStyle.Render("Tier:"), HighlightStyle.Render(string(m.account.Tier))))
	lines = append(lines, fmt.Sprintf("%s ~%.2f%% (variable)", LabelStyle.Render("Est. APY:"), m.account.EstimatedAPY))
	lines = append(lines, "")

	remaining := m.account.TimeUntilUnlock()
	if remaining > 0 {
		days := int(remaining.Hours() / 24)
		lines = append(lines, fmt.Sprintf("%s %d days", LabelStyle.Render("Unlocks In:"), days))
	} else {
		lines = append(lines, fmt.Sprintf("%s %s", LabelStyle.Render("Status:"), SuccessStyle.Render("Unlocked")))
	}

	rewardsGHOST := float64(m.account.UnclaimedRewards) / 1e9
	lines = append(lines, "")
	lines = append(lines, fmt.Sprintf("%s %.6f GHOST", LabelStyle.Render("Rewards:"), rewardsGHOST))

	content := lipgloss.JoinVertical(lipgloss.Left, lines...)
	return BoxStyle.Render(content)
}

func (m *StakingPanelModel) renderStats() string {
	if m.stats == nil {
		return BoxStyle.Render("No stats")
	}

	var lines []string
	lines = append(lines, TitleStyle.Render("🌐 Global Stats"))
	lines = append(lines, "")
	lines = append(lines, fmt.Sprintf("%s %.2f GHOST", LabelStyle.Render("Total Staked:"), m.stats.TotalStakedGHOST))
	lines = append(lines, fmt.Sprintf("%s %d", LabelStyle.Render("Stakers:"), m.stats.TotalStakers))
	lines = append(lines, fmt.Sprintf("%s %.2f%%", LabelStyle.Render("Avg APY:"), m.stats.AverageAPY))

	content := lipgloss.JoinVertical(lipgloss.Left, lines...)
	return BoxStyle.Render(content)
}

func (m *StakingPanelModel) renderActions() string {
	var lines []string
	lines = append(lines, TitleStyle.Render("⚡ Actions"))
	lines = append(lines, "")

	if m.account == nil {
		lines = append(lines, fmt.Sprintf("%s Stake Tokens", HighlightStyle.Render("[s]")))
	} else {
		if m.account.CanUnstake() {
			lines = append(lines, fmt.Sprintf("%s Unstake", SuccessStyle.Render("[u]")))
		}
		if m.account.UnclaimedRewards > 0 {
			lines = append(lines, fmt.Sprintf("%s Claim Rewards", SuccessStyle.Render("[c]")))
		}
	}

	content := lipgloss.JoinVertical(lipgloss.Left, lines...)
	return BoxStyle.Render(content)
}
