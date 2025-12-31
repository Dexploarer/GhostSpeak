package domain

import (
	"fmt"
	"time"
)

// VerificationMethodType represents the cryptographic type of a verification method
type VerificationMethodType uint8

const (
	VerificationMethodEd25519 VerificationMethodType = 0 // Ed25519VerificationKey2020
	VerificationMethodX25519  VerificationMethodType = 1 // X25519KeyAgreementKey2020
)

func (v VerificationMethodType) String() string {
	switch v {
	case VerificationMethodEd25519:
		return "Ed25519VerificationKey2020"
	case VerificationMethodX25519:
		return "X25519KeyAgreementKey2020"
	default:
		return "unknown"
	}
}

// VerificationRelationship represents how a verification method can be used
type VerificationRelationship uint8

const (
	RelationshipAuthentication VerificationRelationship = 0 // Proving identity
	RelationshipAssertionMethod VerificationRelationship = 1 // Issuing credentials
	RelationshipKeyAgreement   VerificationRelationship = 2 // Encryption
)

func (v VerificationRelationship) String() string {
	switch v {
	case RelationshipAuthentication:
		return "authentication"
	case RelationshipAssertionMethod:
		return "assertionMethod"
	case RelationshipKeyAgreement:
		return "keyAgreement"
	default:
		return "unknown"
	}
}

// ServiceEndpointType represents the type of service endpoint
type ServiceEndpointType uint8

const (
	ServiceTypeAIAgent           ServiceEndpointType = 0
	ServiceTypeCredentialRepo    ServiceEndpointType = 1
	ServiceTypeDIDCommMessaging  ServiceEndpointType = 2
	ServiceTypeLinkedDomains     ServiceEndpointType = 3
)

func (s ServiceEndpointType) String() string {
	switch s {
	case ServiceTypeAIAgent:
		return "AIAgentService"
	case ServiceTypeCredentialRepo:
		return "CredentialRepository"
	case ServiceTypeDIDCommMessaging:
		return "DIDCommMessaging"
	case ServiceTypeLinkedDomains:
		return "LinkedDomains"
	default:
		return "unknown"
	}
}

// DIDDocument represents a W3C-compliant DID document stored on Solana
type DIDDocument struct {
	// Identifier
	DID        string    `json:"did"`        // Format: did:sol:{network}:{controller}
	Controller string    `json:"controller"` // Owner address
	Network    string    `json:"network"`    // devnet, testnet, mainnet

	// Verification methods
	VerificationMethods []VerificationMethod `json:"verificationMethods"`

	// Service endpoints
	ServiceEndpoints []ServiceEndpoint `json:"serviceEndpoints"`

	// Status
	Deactivated  bool      `json:"deactivated"`
	DeactivatedAt *time.Time `json:"deactivatedAt,omitempty"`

	// Metadata
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`

	// On-chain data
	PDA string `json:"pda"`
}

// VerificationMethod represents a cryptographic verification method
type VerificationMethod struct {
	ID                 string                     `json:"id"`
	MethodType         VerificationMethodType     `json:"type"`
	Controller         string                     `json:"controller"`
	PublicKeyMultibase string                     `json:"publicKeyMultibase"`
	Relationships      []VerificationRelationship `json:"relationships"`
	CreatedAt          time.Time                  `json:"createdAt"`
	Revoked            bool                       `json:"revoked"`
	RevokedAt          *time.Time                 `json:"revokedAt,omitempty"`
}

// ServiceEndpoint represents a service endpoint
type ServiceEndpoint struct {
	ID              string              `json:"id"`
	ServiceType     ServiceEndpointType `json:"type"`
	ServiceEndpoint string              `json:"serviceEndpoint"`
	Description     string              `json:"description,omitempty"`
}

// CreateDIDParams represents parameters for creating a DID
type CreateDIDParams struct {
	Controller          string
	Network             string
	VerificationMethods []VerificationMethod
	ServiceEndpoints    []ServiceEndpoint
}

// UpdateDIDParams represents parameters for updating a DID
type UpdateDIDParams struct {
	DIDDocument              string // PDA address
	AddVerificationMethod    *VerificationMethod
	RemoveVerificationMethod string // ID to remove
	AddServiceEndpoint       *ServiceEndpoint
	RemoveServiceEndpoint    string // ID to remove
}

// DeactivateDIDParams represents parameters for deactivating a DID
type DeactivateDIDParams struct {
	DIDDocument string // PDA address
}

// W3CDIDDocument represents a W3C-compliant DID document for export
type W3CDIDDocument struct {
	Context            []string                `json:"@context"`
	ID                 string                  `json:"id"`
	Controller         string                  `json:"controller"`
	VerificationMethod []W3CVerificationMethod `json:"verificationMethod,omitempty"`
	Authentication     []string                `json:"authentication,omitempty"`
	AssertionMethod    []string                `json:"assertionMethod,omitempty"`
	KeyAgreement       []string                `json:"keyAgreement,omitempty"`
	Service            []W3CServiceEndpoint    `json:"service,omitempty"`
}

// W3CVerificationMethod represents a W3C verification method
type W3CVerificationMethod struct {
	ID                 string `json:"id"`
	Type               string `json:"type"`
	Controller         string `json:"controller"`
	PublicKeyMultibase string `json:"publicKeyMultibase"`
}

// W3CServiceEndpoint represents a W3C service endpoint
type W3CServiceEndpoint struct {
	ID              string `json:"id"`
	Type            string `json:"type"`
	ServiceEndpoint string `json:"serviceEndpoint"`
}

// FormatDID formats a DID string from network and controller
func FormatDID(network, controller string) string {
	return fmt.Sprintf("did:sol:%s:%s", network, controller)
}

// ParseDID parses a DID string into network and controller
func ParseDID(did string) (network, controller string, err error) {
	// Expected format: did:sol:{network}:{controller}
	// For now, return a simple parse (production would use proper DID parsing)
	if len(did) < 12 || did[:8] != "did:sol:" {
		return "", "", fmt.Errorf("invalid DID format")
	}

	// Simple split - in production use proper DID parser
	parts := did[8:] // Remove "did:sol:"
	// Split by first ":"
	for i, ch := range parts {
		if ch == ':' {
			network = parts[:i]
			controller = parts[i+1:]
			return network, controller, nil
		}
	}

	return "", "", fmt.Errorf("invalid DID format: missing network or controller")
}

// ToW3C converts a DID document to W3C format
func (d *DIDDocument) ToW3C() *W3CDIDDocument {
	w3c := &W3CDIDDocument{
		Context: []string{
			"https://www.w3.org/ns/did/v1",
			"https://w3id.org/security/suites/ed25519-2020/v1",
		},
		ID:                 d.DID,
		Controller:         FormatDID(d.Network, d.Controller),
		VerificationMethod: []W3CVerificationMethod{},
		Authentication:     []string{},
		AssertionMethod:    []string{},
		KeyAgreement:       []string{},
		Service:            []W3CServiceEndpoint{},
	}

	// Convert verification methods
	for _, vm := range d.VerificationMethods {
		if vm.Revoked {
			continue
		}

		vmID := fmt.Sprintf("%s#%s", d.DID, vm.ID)
		w3cVM := W3CVerificationMethod{
			ID:                 vmID,
			Type:               vm.MethodType.String(),
			Controller:         vm.Controller,
			PublicKeyMultibase: vm.PublicKeyMultibase,
		}
		w3c.VerificationMethod = append(w3c.VerificationMethod, w3cVM)

		// Add to relationship arrays
		for _, rel := range vm.Relationships {
			switch rel {
			case RelationshipAuthentication:
				w3c.Authentication = append(w3c.Authentication, vmID)
			case RelationshipAssertionMethod:
				w3c.AssertionMethod = append(w3c.AssertionMethod, vmID)
			case RelationshipKeyAgreement:
				w3c.KeyAgreement = append(w3c.KeyAgreement, vmID)
			}
		}
	}

	// Convert service endpoints
	for _, se := range d.ServiceEndpoints {
		w3c.Service = append(w3c.Service, W3CServiceEndpoint{
			ID:              fmt.Sprintf("%s#%s", d.DID, se.ID),
			Type:            se.ServiceType.String(),
			ServiceEndpoint: se.ServiceEndpoint,
		})
	}

	return w3c
}

// IsActive checks if the DID is active
func (d *DIDDocument) IsActive() bool {
	return !d.Deactivated
}

// HasVerificationMethod checks if a verification method exists
func (d *DIDDocument) HasVerificationMethod(id string) bool {
	for _, vm := range d.VerificationMethods {
		if vm.ID == id && !vm.Revoked {
			return true
		}
	}
	return false
}

// HasServiceEndpoint checks if a service endpoint exists
func (d *DIDDocument) HasServiceEndpoint(id string) bool {
	for _, se := range d.ServiceEndpoints {
		if se.ID == id {
			return true
		}
	}
	return false
}

// ValidateCreateParams validates DID creation parameters
func ValidateCreateDIDParams(params CreateDIDParams) error {
	if params.Controller == "" {
		return ErrInvalidController
	}
	if params.Network == "" {
		return ErrInvalidNetwork
	}
	// At least one verification method is recommended
	if len(params.VerificationMethods) == 0 {
		return fmt.Errorf("at least one verification method is required")
	}
	return nil
}

// DID-related errors
var (
	ErrDIDNotFound       = fmt.Errorf("DID not found")
	ErrDIDAlreadyExists  = fmt.Errorf("DID already exists")
	ErrDIDDeactivated    = fmt.Errorf("DID is deactivated")
	ErrInvalidController = fmt.Errorf("invalid controller")
	ErrInvalidNetwork    = fmt.Errorf("invalid network")
	ErrUnauthorized      = fmt.Errorf("unauthorized: signer is not the DID controller")
)
