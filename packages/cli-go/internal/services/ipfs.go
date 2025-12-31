package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"time"

	"github.com/go-resty/resty/v2"
	"github.com/ghostspeak/cli-go/internal/config"
	"github.com/ghostspeak/cli-go/internal/domain"
)

const (
	PinataAPIURL      = "https://api.pinata.cloud"
	PinataGatewayURL  = "https://gateway.pinata.cloud/ipfs"
)

// IPFSService handles IPFS operations via Pinata
type IPFSService struct {
	cfg    *config.Config
	client *resty.Client
}

// NewIPFSService creates a new IPFS service
func NewIPFSService(cfg *config.Config) *IPFSService {
	client := resty.New()
	client.SetTimeout(30 * time.Second)

	// Set Pinata auth headers if configured
	if cfg.API.PinataJWT != "" {
		client.SetHeader("Authorization", "Bearer "+cfg.API.PinataJWT)
	} else if cfg.API.PinataAPIKey != "" && cfg.API.PinataSecretKey != "" {
		client.SetHeader("pinata_api_key", cfg.API.PinataAPIKey)
		client.SetHeader("pinata_secret_api_key", cfg.API.PinataSecretKey)
	}

	return &IPFSService{
		cfg:    cfg,
		client: client,
	}
}

// UploadJSON uploads JSON data to IPFS and returns the IPFS URI
func (s *IPFSService) UploadJSON(data interface{}) (string, error) {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return "", fmt.Errorf("failed to marshal JSON: %w", err)
	}

	// Create multipart form
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	// Add JSON file
	part, err := writer.CreateFormFile("file", "metadata.json")
	if err != nil {
		return "", fmt.Errorf("failed to create form file: %w", err)
	}

	if _, err := io.Copy(part, bytes.NewReader(jsonData)); err != nil {
		return "", fmt.Errorf("failed to write to form: %w", err)
	}

	// Add pinataMetadata
	pinataMetadata := map[string]interface{}{
		"name": "GhostSpeak Agent Metadata",
	}
	metadataJSON, _ := json.Marshal(pinataMetadata)
	writer.WriteField("pinataMetadata", string(metadataJSON))

	// Add pinataOptions
	pinataOptions := map[string]interface{}{
		"cidVersion": 1,
	}
	optionsJSON, _ := json.Marshal(pinataOptions)
	writer.WriteField("pinataOptions", string(optionsJSON))

	writer.Close()

	// Upload to Pinata
	resp, err := s.client.R().
		SetHeader("Content-Type", writer.FormDataContentType()).
		SetBody(body.Bytes()).
		Post(PinataAPIURL + "/pinning/pinFileToIPFS")

	if err != nil {
		return "", fmt.Errorf("failed to upload to Pinata: %w", err)
	}

	if resp.StatusCode() != 200 {
		return "", fmt.Errorf("Pinata upload failed with status %d: %s", resp.StatusCode(), resp.String())
	}

	// Parse response
	var result struct {
		IpfsHash string `json:"IpfsHash"`
	}
	if err := json.Unmarshal(resp.Body(), &result); err != nil {
		return "", fmt.Errorf("failed to parse Pinata response: %w", err)
	}

	if result.IpfsHash == "" {
		return "", domain.ErrIPFSUploadFailed
	}

	// Return IPFS URI
	uri := fmt.Sprintf("ipfs://%s", result.IpfsHash)
	config.Infof("Uploaded metadata to IPFS: %s", uri)

	return uri, nil
}

// FetchJSON fetches JSON data from IPFS
func (s *IPFSService) FetchJSON(uri string, target interface{}) error {
	// Convert ipfs:// URI to HTTP gateway URL
	var url string
	if len(uri) > 7 && uri[:7] == "ipfs://" {
		hash := uri[7:]
		url = fmt.Sprintf("%s/%s", PinataGatewayURL, hash)
	} else if len(uri) > 12 && uri[:12] == "https://ipfs" {
		url = uri
	} else {
		return domain.ErrInvalidIPFSHash
	}

	resp, err := s.client.R().Get(url)
	if err != nil {
		return fmt.Errorf("failed to fetch from IPFS: %w", err)
	}

	if resp.StatusCode() != 200 {
		return fmt.Errorf("IPFS fetch failed with status %d", resp.StatusCode())
	}

	if err := json.Unmarshal(resp.Body(), target); err != nil {
		return fmt.Errorf("failed to unmarshal IPFS data: %w", err)
	}

	return nil
}

// UploadAgentMetadata uploads agent metadata to IPFS
func (s *IPFSService) UploadAgentMetadata(metadata *domain.AgentMetadata) (string, error) {
	return s.UploadJSON(metadata)
}

// FetchAgentMetadata fetches agent metadata from IPFS
func (s *IPFSService) FetchAgentMetadata(uri string) (*domain.AgentMetadata, error) {
	var metadata domain.AgentMetadata
	if err := s.FetchJSON(uri, &metadata); err != nil {
		return nil, err
	}
	return &metadata, nil
}
