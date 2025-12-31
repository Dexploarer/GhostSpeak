package ui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/bubbles/table"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/ghostspeak/cli-go/internal/app"
	"github.com/ghostspeak/cli-go/internal/domain"
)

// DIDManagerModel handles DID management
type DIDManagerModel struct {
	app          *app.App
	table        table.Model
	selectedView string // "main", "methods", "services", "export"
	did          *domain.DIDDocument
}

// NewDIDManagerModel creates a new DID manager
func NewDIDManagerModel(application *app.App) *DIDManagerModel {
	// Define table columns
	columns := []table.Column{
		{Title: "ID", Width: 30},
		{Title: "Type", Width: 25},
		{Title: "Controller", Width: 30},
		{Title: "Status", Width: 10},
	}

	// Sample verification methods data
	rows := []table.Row{
		{"key-1", "Ed25519VerificationKey2020", "did:sol:devnet:...", "Active"},
		{"key-2", "X25519KeyAgreementKey2020", "did:sol:devnet:...", "Active"},
	}

	t := table.New(
		table.WithColumns(columns),
		table.WithRows(rows),
		table.WithFocused(true),
		table.WithHeight(8),
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

	// Create sample DID document
	sampleDID := &domain.DIDDocument{
		DID:        "did:sol:devnet:GhstTzV6DKPx4dLsQk8PoJPh9kqZnEEVvdkXB2kGyLb3",
		Controller: "GhstTzV6DKPx4dLsQk8PoJPh9kqZnEEVvdkXB2kGyLb3",
		Network:    "devnet",
		Deactivated: false,
		VerificationMethods: []domain.VerificationMethod{
			{
				ID:                 "key-1",
				MethodType:         domain.VerificationMethodEd25519,
				Controller:         "did:sol:devnet:GhstTzV6DKPx4dLsQk8PoJPh9kqZnEEVvdkXB2kGyLb3",
				PublicKeyMultibase: "z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
				Relationships:      []domain.VerificationRelationship{domain.RelationshipAuthentication},
				Revoked:            false,
			},
			{
				ID:                 "key-2",
				MethodType:         domain.VerificationMethodX25519,
				Controller:         "did:sol:devnet:GhstTzV6DKPx4dLsQk8PoJPh9kqZnEEVvdkXB2kGyLb3",
				PublicKeyMultibase: "z6LSbysY2xFMRpGMhb7tFTLMpeuPRaqaWM1yECx2AtzE3KCc",
				Relationships:      []domain.VerificationRelationship{domain.RelationshipKeyAgreement},
				Revoked:            false,
			},
		},
		ServiceEndpoints: []domain.ServiceEndpoint{
			{
				ID:              "agent-service",
				ServiceType:     domain.ServiceTypeAIAgent,
				ServiceEndpoint: "https://api.ghostspeak.io/agents/GhstTzV6DKPx4dLsQk8PoJPh9kqZnEEVvdkXB2kGyLb3",
				Description:     "AI Agent API endpoint",
			},
		},
		PDA: "Did1234567890abcdefghijklmnopqrstuvwxyzABCDEF",
	}

	return &DIDManagerModel{
		app:          application,
		table:        t,
		selectedView: "main",
		did:          sampleDID,
	}
}

// Init initializes the model
func (m *DIDManagerModel) Init() tea.Cmd {
	return nil
}

// Update handles messages
func (m *DIDManagerModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd
	m.table, cmd = m.table.Update(msg)
	return m, cmd
}

// View renders the DID manager
func (m *DIDManagerModel) View() string {
	title := TitleStyle.Render("🆔 DID Manager")

	if m.did == nil {
		return lipgloss.JoinVertical(
			lipgloss.Left,
			title,
			BoxStyle.Render("No DID found. Create one to get started."),
		)
	}

	// DID Info Panel
	didInfo := m.renderDIDInfo()

	// Verification Methods
	methodsPanel := m.renderVerificationMethods()

	// Service Endpoints
	servicesPanel := m.renderServiceEndpoints()

	// Actions
	actionsPanel := m.renderActions()

	// Layout
	leftColumn := lipgloss.JoinVertical(
		lipgloss.Left,
		didInfo,
		methodsPanel,
	)

	rightColumn := lipgloss.JoinVertical(
		lipgloss.Left,
		servicesPanel,
		actionsPanel,
	)

	content := Columns(leftColumn, rightColumn, 120)

	help := HelpStyle.Render(
		fmt.Sprintf("%s navigate • %s export W3C • %s back",
			KeyStyle.Render("↑↓"),
			KeyStyle.Render("e"),
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

func (m *DIDManagerModel) renderDIDInfo() string {
	status := SuccessStyle.Render("Active")
	if m.did.Deactivated {
		status = ErrorStyle.Render("Deactivated")
	}

	info := []string{
		TitleStyle.Render("📋 DID Document"),
		"",
		fmt.Sprintf("%s %s", LabelStyle.Render("DID:"), ValueStyle.Render(m.did.DID)),
		fmt.Sprintf("%s %s", LabelStyle.Render("Network:"), ValueStyle.Render(m.did.Network)),
		fmt.Sprintf("%s %s", LabelStyle.Render("Status:"), status),
		fmt.Sprintf("%s %s", LabelStyle.Render("PDA:"), ValueStyle.Render(m.did.PDA)),
		"",
		fmt.Sprintf("%s %d", LabelStyle.Render("Verification Methods:"), len(m.did.VerificationMethods)),
		fmt.Sprintf("%s %d", LabelStyle.Render("Service Endpoints:"), len(m.did.ServiceEndpoints)),
	}

	content := lipgloss.JoinVertical(lipgloss.Left, info...)
	return BoxStyle.Render(content)
}

func (m *DIDManagerModel) renderVerificationMethods() string {
	var methods []string
	methods = append(methods, TitleStyle.Render("🔑 Verification Methods"))
	methods = append(methods, "")

	if len(m.did.VerificationMethods) == 0 {
		methods = append(methods, SubtitleStyle.Render("No verification methods"))
	} else {
		for i, vm := range m.did.VerificationMethods {
			if i > 2 { // Show only first 3
				methods = append(methods, SubtitleStyle.Render(
					fmt.Sprintf("... and %d more", len(m.did.VerificationMethods)-3),
				))
				break
			}

			status := SuccessStyle.Render("✓ Active")
			if vm.Revoked {
				status = ErrorStyle.Render("✗ Revoked")
			}

			// Get relationship names
			var rels []string
			for _, rel := range vm.Relationships {
				rels = append(rels, rel.String())
			}
			relStr := strings.Join(rels, ", ")

			vmInfo := fmt.Sprintf("%s %s", HighlightStyle.Render(vm.ID), status)
			vmType := fmt.Sprintf("  %s: %s", LabelStyle.Render("Type"), ValueStyle.Render(vm.MethodType.String()))
			vmRels := fmt.Sprintf("  %s: %s", LabelStyle.Render("Relationships"), SubtitleStyle.Render(relStr))

			methods = append(methods, vmInfo, vmType, vmRels, "")
		}
	}

	content := lipgloss.JoinVertical(lipgloss.Left, methods...)
	return BoxStyle.Render(content)
}

func (m *DIDManagerModel) renderServiceEndpoints() string {
	var services []string
	services = append(services, TitleStyle.Render("🌐 Service Endpoints"))
	services = append(services, "")

	if len(m.did.ServiceEndpoints) == 0 {
		services = append(services, SubtitleStyle.Render("No service endpoints"))
	} else {
		for i, se := range m.did.ServiceEndpoints {
			if i > 2 { // Show only first 3
				services = append(services, SubtitleStyle.Render(
					fmt.Sprintf("... and %d more", len(m.did.ServiceEndpoints)-3),
				))
				break
			}

			seInfo := HighlightStyle.Render(se.ID)
			seType := fmt.Sprintf("  %s: %s", LabelStyle.Render("Type"), ValueStyle.Render(se.ServiceType.String()))
			seEndpoint := fmt.Sprintf("  %s: %s", LabelStyle.Render("Endpoint"), SubtitleStyle.Render(se.ServiceEndpoint))

			services = append(services, seInfo, seType, seEndpoint)

			if se.Description != "" {
				seDesc := fmt.Sprintf("  %s: %s", LabelStyle.Render("Description"), SubtitleStyle.Render(se.Description))
				services = append(services, seDesc)
			}

			services = append(services, "")
		}
	}

	content := lipgloss.JoinVertical(lipgloss.Left, services...)
	return BoxStyle.Render(content)
}

func (m *DIDManagerModel) renderActions() string {
	actions := []string{
		TitleStyle.Render("⚡ Actions"),
		"",
		fmt.Sprintf("%s Export W3C Format", HighlightStyle.Render("[e]")),
		fmt.Sprintf("%s Add Verification Method", HighlightStyle.Render("[a]")),
		fmt.Sprintf("%s Add Service Endpoint", HighlightStyle.Render("[s]")),
		fmt.Sprintf("%s Deactivate DID", HighlightStyle.Render("[d]")),
		"",
		SubtitleStyle.Render("Press the key to perform the action"),
	}

	content := lipgloss.JoinVertical(lipgloss.Left, actions...)
	return BoxStyle.Render(content)
}
