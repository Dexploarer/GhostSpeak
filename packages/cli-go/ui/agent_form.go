package ui

import (
	"fmt"

	"github.com/charmbracelet/huh"
	"github.com/charmbracelet/lipgloss"
	"github.com/ghostspeak/cli-go/internal/app"
)

// AgentFormModel handles agent registration
type AgentFormModel struct {
	app  *app.App
	form *huh.Form

	// Form fields
	name         string
	description  string
	capabilities []string
	agentType    string
}

// NewAgentFormModel creates a new agent registration form
func NewAgentFormModel(application *app.App) *AgentFormModel {
	m := &AgentFormModel{
		app: application,
	}

	// Create the form with Huh
	m.form = huh.NewForm(
		huh.NewGroup(
			huh.NewInput().
				Title("Agent Name").
				Placeholder("My AI Agent").
				Description("A unique name for your agent").
				Value(&m.name).
				Validate(func(s string) error {
					if len(s) < 3 {
						return fmt.Errorf("name must be at least 3 characters")
					}
					return nil
				}),

			huh.NewText().
				Title("Description").
				Placeholder("This agent helps with...").
				Description("Describe what your agent does").
				CharLimit(500).
				Lines(5).
				Value(&m.description).
				Validate(func(s string) error {
					if len(s) < 10 {
						return fmt.Errorf("description must be at least 10 characters")
					}
					return nil
				}),
		),

		huh.NewGroup(
			huh.NewSelect[string]().
				Title("Agent Type").
				Description("Select the type of agent").
				Options(
					huh.NewOption("General Purpose", "general"),
					huh.NewOption("Data Analysis", "data_analysis"),
					huh.NewOption("Content Generation", "content_gen"),
					huh.NewOption("Task Automation", "automation"),
					huh.NewOption("Research Assistant", "research"),
				).
				Value(&m.agentType),

			huh.NewMultiSelect[string]().
				Title("Capabilities").
				Description("Select all capabilities your agent has (up to 5)").
				Options(
					huh.NewOption("Natural Language Processing", "nlp"),
					huh.NewOption("Code Generation", "code_gen"),
					huh.NewOption("Data Processing", "data_proc"),
					huh.NewOption("API Integration", "api"),
					huh.NewOption("Web Scraping", "scraping"),
					huh.NewOption("Image Analysis", "vision"),
					huh.NewOption("Audio Processing", "audio"),
					huh.NewOption("Machine Learning", "ml"),
				).
				Limit(5).
				Value(&m.capabilities),
		),

		huh.NewGroup(
			huh.NewConfirm().
				Title("Ready to register?").
				Description("This will create your agent on the Solana blockchain.").
				Affirmative("Yes, register my agent!").
				Negative("No, let me review"),
		),
	)

	return m
}

// Update handles messages
func (m *AgentFormModel) Update(msg interface{}) (interface{}, interface{}) {
	// Huh forms handle their own updates
	form, cmd := m.form.Update(msg)
	if f, ok := form.(*huh.Form); ok {
		m.form = f
	}
	return m, cmd
}

// View renders the form
func (m *AgentFormModel) View() string {
	if m.form.State == huh.StateCompleted {
		return m.renderSuccess()
	}

	title := TitleStyle.Render("Register New Agent")

	return lipgloss.JoinVertical(
		lipgloss.Left,
		title,
		m.form.View(),
	)
}

func (m *AgentFormModel) renderSuccess() string {
	var summary string
	summary += SuccessStyle.Render("✓ Agent Registered Successfully!\n\n")
	summary += LabelStyle.Render("Name: ") + ValueStyle.Render(m.name) + "\n"
	summary += LabelStyle.Render("Type: ") + ValueStyle.Render(m.agentType) + "\n"
	summary += LabelStyle.Render("Capabilities: ") + ValueStyle.Render(
		fmt.Sprintf("%d selected", len(m.capabilities)),
	) + "\n\n"
	summary += SubtitleStyle.Render("Your agent is now live on Solana!\n")
	summary += HelpStyle.Render("Press ESC to return to the main menu")

	return BoxStyle.Render(summary)
}
