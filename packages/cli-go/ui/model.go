package ui

import (
	"fmt"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/ghostspeak/cli-go/internal/app"
)

// ViewState represents the current view
type ViewState int

const (
	MenuView ViewState = iota
	DashboardView
	AgentListView
	AgentRegisterView
	AgentDetailsView
	DIDManagerView
	CredentialViewerView
	GhostScoreDashboardView
	StakingPanelView
	GovernanceProposalsView
	EscrowManagerView
	SettingsView
)

// Model is the main application model
type Model struct {
	app            *app.App
	state          ViewState
	width          int
	height         int
	err            error
	selectedIndex  int
	menuItems      []MenuItem
	agentForm      *AgentFormModel
	agentList      *AgentListModel
	dashboard      *DashboardModel
	didManager     *DIDManagerModel
	credentialViewer *CredentialViewerModel
	// ghostScore     *GhostScoreModel // TODO: Implement
	// stakingPanel   *StakingPanelModel // TODO: Implement
	// governance     *GovernanceModel // TODO: Implement
	// escrowManager  *EscrowManagerModel // TODO: Implement
}

// MenuItem represents a menu option
type MenuItem struct {
	Title       string
	Description string
	View        ViewState
}

// NewModel creates a new application model
func NewModel(application *app.App) Model {
	return Model{
		app:           application,
		state:         MenuView,
		selectedIndex: 0,
		menuItems: []MenuItem{
			{
				Title:       "📊 Dashboard",
				Description: "View agent analytics and performance",
				View:        DashboardView,
			},
			{
				Title:       "🤖 Agents",
				Description: "Browse and manage registered agents",
				View:        AgentListView,
			},
			{
				Title:       "🆔 DID Manager",
				Description: "Manage decentralized identities",
				View:        DIDManagerView,
			},
			{
				Title:       "📜 Credentials",
				Description: "View and manage verifiable credentials",
				View:        CredentialViewerView,
			},
			{
				Title:       "⭐ Ghost Score",
				Description: "View reputation and performance metrics",
				View:        GhostScoreDashboardView,
			},
			{
				Title:       "🔒 Staking",
				Description: "Stake tokens and earn rewards",
				View:        StakingPanelView,
			},
			{
				Title:       "🗳️  Governance",
				Description: "View and vote on proposals",
				View:        GovernanceProposalsView,
			},
			{
				Title:       "💰 Escrow",
				Description: "Manage escrow agreements",
				View:        EscrowManagerView,
			},
			{
				Title:       "⚙️  Settings",
				Description: "Configure CLI settings",
				View:        SettingsView,
			},
		},
	}
}

// Init initializes the model
func (m Model) Init() tea.Cmd {
	return nil
}

// Update handles messages and updates the model
func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		return m, nil

	case tea.KeyMsg:
		switch m.state {
		case MenuView:
			return m.updateMenu(msg)
		case AgentRegisterView:
			return m.updateAgentRegister(msg)
		case AgentListView:
			return m.updateAgentList(msg)
		case DashboardView:
			return m.updateDashboard(msg)
		case DIDManagerView:
			return m.updateDIDManager(msg)
		case CredentialViewerView:
			return m.updateCredentialViewer(msg)
		case GhostScoreDashboardView:
			return m.updateGhostScore(msg)
		case StakingPanelView:
			return m.updateStakingPanel(msg)
		case GovernanceProposalsView:
			return m.updateGovernance(msg)
		case EscrowManagerView:
			return m.updateEscrowManager(msg)
		case SettingsView:
			return m.updateSettings(msg)
		}

	case error:
		m.err = msg
		return m, nil
	}

	return m, nil
}

// View renders the UI
func (m Model) View() string {
	if m.width == 0 {
		return "Loading..."
	}

	var content string

	switch m.state {
	case MenuView:
		content = m.viewMenu()
	case AgentRegisterView:
		content = m.viewAgentRegister()
	case AgentListView:
		content = m.viewAgentList()
	case DashboardView:
		content = m.viewDashboard()
	case DIDManagerView:
		content = m.viewDIDManager()
	case CredentialViewerView:
		content = m.viewCredentialViewer()
	case GhostScoreDashboardView:
		content = m.viewGhostScore()
	case StakingPanelView:
		content = m.viewStakingPanel()
	case GovernanceProposalsView:
		content = m.viewGovernance()
	case EscrowManagerView:
		content = m.viewEscrowManager()
	case SettingsView:
		content = m.viewSettings()
	default:
		content = "Unknown view"
	}

	// Add header
	header := m.renderHeader()

	// Add footer/help
	footer := m.renderFooter()

	// Combine everything
	return lipgloss.JoinVertical(
		lipgloss.Left,
		header,
		content,
		footer,
	)
}

func (m Model) renderHeader() string {
	// Use the ghost banner for the header
	banner := RenderGhostBanner("GHOSTSPEAK CLI")
	subtitle := SubtitleStyle.Render("Manage AI Agents on Solana")

	return lipgloss.JoinVertical(
		lipgloss.Left,
		banner,
		subtitle,
	)
}

func (m Model) renderFooter() string {
	var help string

	switch m.state {
	case MenuView:
		help = HelpStyle.Render(
			fmt.Sprintf("%s navigate • %s select • %s quit",
				KeyStyle.Render("↑↓"),
				KeyStyle.Render("enter"),
				KeyStyle.Render("q"),
			),
		)
	default:
		help = HelpStyle.Render(
			fmt.Sprintf("%s back • %s quit",
				KeyStyle.Render("esc"),
				KeyStyle.Render("q"),
			),
		)
	}

	if m.err != nil {
		errMsg := ErrorStyle.Render(fmt.Sprintf("Error: %v", m.err))
		return lipgloss.JoinVertical(lipgloss.Left, errMsg, help)
	}

	return help
}

// Menu view methods
func (m Model) updateMenu(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "q", "ctrl+c":
		return m, tea.Quit

	case "up", "k":
		if m.selectedIndex > 0 {
			m.selectedIndex--
		}

	case "down", "j":
		if m.selectedIndex < len(m.menuItems)-1 {
			m.selectedIndex++
		}

	case "enter":
		selectedItem := m.menuItems[m.selectedIndex]
		m.state = selectedItem.View

		// Initialize sub-views
		switch m.state {
		case AgentRegisterView:
			m.agentForm = NewAgentFormModel(m.app)
		case AgentListView:
			m.agentList = NewAgentListModel(m.app)
		case DashboardView:
			m.dashboard = NewDashboardModel(m.app)
		case DIDManagerView:
			m.didManager = NewDIDManagerModel(m.app)
		case CredentialViewerView:
			m.credentialViewer = NewCredentialViewerModel(m.app)
		// case GhostScoreDashboardView:
		// 	m.ghostScore = NewGhostScoreModel(m.app)
		// case StakingPanelView:
		// 	m.stakingPanel = NewStakingPanelModel(m.app)
		// case GovernanceProposalsView:
		// 	m.governance = NewGovernanceModel(m.app)
		// case EscrowManagerView:
		// 	m.escrowManager = NewEscrowManagerModel(m.app)
		}
	}

	return m, nil
}

func (m Model) viewMenu() string {
	title := TitleStyle.Render("Main Menu")

	var menuItems []string
	for i, item := range m.menuItems {
		var style lipgloss.Style
		if i == m.selectedIndex {
			style = SelectedMenuItemStyle
		} else {
			style = MenuItemStyle
		}

		menuItem := fmt.Sprintf("%s\n%s",
			style.Render(item.Title),
			SubtitleStyle.Render("  "+item.Description),
		)
		menuItems = append(menuItems, menuItem)
	}

	content := lipgloss.JoinVertical(lipgloss.Left, menuItems...)

	return lipgloss.JoinVertical(
		lipgloss.Left,
		title,
		content,
	)
}

// Placeholder methods for other views
func (m Model) updateAgentRegister(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "esc":
		m.state = MenuView
	case "q", "ctrl+c":
		return m, tea.Quit
	}

	// Integrate with AgentFormModel
	if m.agentForm != nil {
		updatedForm, cmd := m.agentForm.Update(msg)
		if f, ok := updatedForm.(*AgentFormModel); ok {
			m.agentForm = f
		}
		// Type assert cmd to tea.Cmd if not nil
		if cmd != nil {
			if teaCmd, ok := cmd.(tea.Cmd); ok {
				return m, teaCmd
			}
		}
	}

	return m, nil
}

func (m Model) viewAgentRegister() string {
	if m.agentForm == nil {
		return "Loading form..."
	}
	return m.agentForm.View()
}

func (m Model) updateAgentList(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "esc":
		m.state = MenuView
	case "q", "ctrl+c":
		return m, tea.Quit
	}

	// Integrate with AgentListModel
	if m.agentList != nil {
		updatedList, cmd := m.agentList.Update(msg)
		if l, ok := updatedList.(*AgentListModel); ok {
			m.agentList = l
			return m, cmd
		}
	}

	return m, nil
}

func (m Model) viewAgentList() string {
	if m.agentList == nil {
		return "Loading agents..."
	}
	return m.agentList.View()
}

func (m Model) updateDashboard(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "esc":
		m.state = MenuView
	case "q", "ctrl+c":
		return m, tea.Quit
	}

	// Integrate with DashboardModel
	if m.dashboard != nil {
		updatedDashboard, cmd := m.dashboard.Update(msg)
		if d, ok := updatedDashboard.(*DashboardModel); ok {
			m.dashboard = d
			return m, cmd
		}
	}

	return m, nil
}

func (m Model) viewDashboard() string {
	if m.dashboard == nil {
		return "Loading dashboard..."
	}
	return m.dashboard.View()
}

// DID Manager view methods
func (m Model) updateDIDManager(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "esc":
		m.state = MenuView
	case "q", "ctrl+c":
		return m, tea.Quit
	}

	if m.didManager != nil {
		updatedManager, cmd := m.didManager.Update(msg)
		if d, ok := updatedManager.(*DIDManagerModel); ok {
			m.didManager = d
			return m, cmd
		}
	}

	return m, nil
}

func (m Model) viewDIDManager() string {
	if m.didManager == nil {
		return "Loading DID manager..."
	}
	return m.didManager.View()
}

// Credential Viewer view methods
func (m Model) updateCredentialViewer(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "esc":
		m.state = MenuView
	case "q", "ctrl+c":
		return m, tea.Quit
	}

	if m.credentialViewer != nil {
		updatedViewer, cmd := m.credentialViewer.Update(msg)
		if c, ok := updatedViewer.(*CredentialViewerModel); ok {
			m.credentialViewer = c
			return m, cmd
		}
	}

	return m, nil
}

func (m Model) viewCredentialViewer() string {
	if m.credentialViewer == nil {
		return "Loading credentials..."
	}
	return m.credentialViewer.View()
}

// Ghost Score view methods - TODO: Implement
func (m Model) updateGhostScore(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "esc":
		m.state = MenuView
	case "q", "ctrl+c":
		return m, tea.Quit
	}
	return m, nil
}

func (m Model) viewGhostScore() string {
	title := TitleStyle.Render("⭐ Ghost Score Dashboard")
	content := BoxStyle.Render("Ghost Score dashboard coming soon...")
	return lipgloss.JoinVertical(lipgloss.Left, title, content)
}

// Staking Panel view methods - TODO: Implement
func (m Model) updateStakingPanel(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "esc":
		m.state = MenuView
	case "q", "ctrl+c":
		return m, tea.Quit
	}
	return m, nil
}

func (m Model) viewStakingPanel() string {
	title := TitleStyle.Render("🔒 Staking Panel")
	content := BoxStyle.Render("Staking panel coming soon...")
	return lipgloss.JoinVertical(lipgloss.Left, title, content)
}

// Governance view methods - TODO: Implement
func (m Model) updateGovernance(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "esc":
		m.state = MenuView
	case "q", "ctrl+c":
		return m, tea.Quit
	}
	return m, nil
}

func (m Model) viewGovernance() string {
	title := TitleStyle.Render("🗳️ Governance")
	content := BoxStyle.Render("Governance panel coming soon...")
	return lipgloss.JoinVertical(lipgloss.Left, title, content)
}

// Escrow Manager view methods - TODO: Implement
func (m Model) updateEscrowManager(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "esc":
		m.state = MenuView
	case "q", "ctrl+c":
		return m, tea.Quit
	}
	return m, nil
}

func (m Model) viewEscrowManager() string {
	title := TitleStyle.Render("💰 Escrow Manager")
	content := BoxStyle.Render("Escrow manager coming soon...")
	return lipgloss.JoinVertical(lipgloss.Left, title, content)
}

// Settings view methods
func (m Model) updateSettings(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "esc":
		m.state = MenuView
	case "q", "ctrl+c":
		return m, tea.Quit
	}

	return m, nil
}

func (m Model) viewSettings() string {
	title := TitleStyle.Render("⚙️  Settings")
	content := BoxStyle.Render("Settings panel coming soon...")
	return lipgloss.JoinVertical(lipgloss.Left, title, content)
}
