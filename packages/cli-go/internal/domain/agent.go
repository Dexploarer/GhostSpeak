package domain

import "time"

// AgentType represents the type of an agent
type AgentType uint8

const (
	AgentTypeGeneral      AgentType = 0
	AgentTypeEliza        AgentType = 1
	AgentTypeDataAnalysis AgentType = 2
	AgentTypeContentGen   AgentType = 3
	AgentTypeAutomation   AgentType = 4
	AgentTypeResearch     AgentType = 5
)

func (a AgentType) String() string {
	switch a {
	case AgentTypeGeneral:
		return "general"
	case AgentTypeEliza:
		return "eliza"
	case AgentTypeDataAnalysis:
		return "data_analysis"
	case AgentTypeContentGen:
		return "content_gen"
	case AgentTypeAutomation:
		return "automation"
	case AgentTypeResearch:
		return "research"
	default:
		return "unknown"
	}
}

// ParseAgentType converts a string to an AgentType
func ParseAgentType(s string) AgentType {
	switch s {
	case "general":
		return AgentTypeGeneral
	case "eliza":
		return AgentTypeEliza
	case "data_analysis":
		return AgentTypeDataAnalysis
	case "content_creation", "content_gen":
		return AgentTypeContentGen
	case "automation":
		return AgentTypeAutomation
	case "research":
		return AgentTypeResearch
	case "customer_service":
		return AgentTypeGeneral // Map to general for now
	case "code_assistant":
		return AgentTypeGeneral // Map to general for now
	default:
		return AgentTypeGeneral
	}
}

// AgentStatus represents the current status of an agent
type AgentStatus string

const (
	AgentStatusActive   AgentStatus = "active"
	AgentStatusInactive AgentStatus = "inactive"
	AgentStatusPending  AgentStatus = "pending"
)

// Agent represents an AI agent registered on the GhostSpeak platform
type Agent struct {
	// On-chain data
	ID              string      `json:"id"`
	Owner           string      `json:"owner"`
	Name            string      `json:"name"`
	AgentType       AgentType   `json:"agentType"`
	MetadataURI     string      `json:"metadataUri"`
	Status          AgentStatus `json:"status"`
	TotalJobs       uint64      `json:"totalJobs"`
	CompletedJobs   uint64      `json:"completedJobs"`
	TotalEarnings   uint64      `json:"totalEarnings"`
	AverageRating   float64     `json:"averageRating"`
	CreatedAt       time.Time   `json:"createdAt"`
	UpdatedAt       time.Time   `json:"updatedAt"`

	// Metadata (from IPFS)
	Description     string      `json:"description"`
	Capabilities    []string    `json:"capabilities"`
	Version         string      `json:"version"`
	ImageURL        string      `json:"imageUrl,omitempty"`

	// Derived/computed fields
	PDA             string      `json:"pda"`
	SuccessRate     float64     `json:"successRate"`
}

// AgentMetadata represents the metadata stored on IPFS
type AgentMetadata struct {
	Name         string   `json:"name"`
	Description  string   `json:"description"`
	AgentType    string   `json:"agentType"`
	Capabilities []string `json:"capabilities"`
	Version      string   `json:"version"`
	ImageURL     string   `json:"imageUrl,omitempty"`
	CreatedAt    string   `json:"createdAt"`
}

// RegisterAgentParams represents parameters for registering a new agent
type RegisterAgentParams struct {
	Name         string
	Description  string
	AgentType    AgentType
	Capabilities []string
	Version      string
	ImageURL     string
}

// CalculateSuccessRate calculates the agent's success rate
func (a *Agent) CalculateSuccessRate() float64 {
	if a.TotalJobs == 0 {
		return 0.0
	}
	return float64(a.CompletedJobs) / float64(a.TotalJobs) * 100
}

// IsActive checks if the agent is currently active
func (a *Agent) IsActive() bool {
	return a.Status == AgentStatusActive
}

// Validate validates the agent data
func (a *Agent) Validate() error {
	if a.ID == "" {
		return ErrInvalidAgentID
	}
	if a.Owner == "" {
		return ErrInvalidOwner
	}
	if a.Name == "" {
		return ErrInvalidAgentName
	}
	if a.MetadataURI == "" {
		return ErrInvalidMetadataURI
	}
	return nil
}

// ValidateRegisterParams validates registration parameters
func ValidateRegisterParams(params RegisterAgentParams) error {
	if params.Name == "" {
		return ErrInvalidAgentName
	}
	if len(params.Name) < 3 || len(params.Name) > 32 {
		return ErrAgentNameLength
	}
	if params.Description == "" {
		return ErrInvalidDescription
	}
	if len(params.Description) > 200 {
		return ErrDescriptionTooLong
	}
	if len(params.Capabilities) == 0 {
		return ErrNoCapabilities
	}
	if len(params.Capabilities) > 10 {
		return ErrTooManyCapabilities
	}
	return nil
}

// AgentMetrics represents combined agent and reputation metrics
type AgentMetrics struct {
	Agent      *Agent      `json:"agent"`
	Reputation *Reputation `json:"reputation"`
	UpdatedAt  time.Time   `json:"updatedAt"`
}
