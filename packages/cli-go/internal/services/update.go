package services

import (
	"fmt"
	"runtime"
	"time"

	"github.com/ghostspeak/cli-go/internal/config"
	"github.com/ghostspeak/cli-go/internal/ports"
	"github.com/go-resty/resty/v2"
)

const (
	GitHubAPIURL     = "https://api.github.com/repos/ghostspeak/cli-go/releases/latest"
	CacheKeyUpdate   = "update_check"
	CacheDuration    = 24 * time.Hour
)

// UpdateInfo holds information about an available update
type UpdateInfo struct {
	LatestVersion string    `json:"latest_version"`
	CurrentVersion string   `json:"current_version"`
	UpdateAvailable bool    `json:"update_available"`
	ReleaseURL     string    `json:"release_url"`
	Changelog      string    `json:"changelog"`
	PublishedAt    time.Time `json:"published_at"`
	CheckedAt      time.Time `json:"checked_at"`
}

// GitHubRelease represents a GitHub release response
type GitHubRelease struct {
	TagName     string    `json:"tag_name"`
	Name        string    `json:"name"`
	Body        string    `json:"body"`
	HTMLURL     string    `json:"html_url"`
	PublishedAt time.Time `json:"published_at"`
	Assets      []struct {
		Name               string `json:"name"`
		BrowserDownloadURL string `json:"browser_download_url"`
	} `json:"assets"`
}

// UpdateService handles version checking and updates
type UpdateService struct {
	currentVersion string
	storage        ports.Storage
	client         *resty.Client
}

// NewUpdateService creates a new update service
func NewUpdateService(currentVersion string, storage ports.Storage) *UpdateService {
	client := resty.New().
		SetTimeout(10 * time.Second).
		SetHeader("User-Agent", fmt.Sprintf("GhostSpeak-CLI/%s", currentVersion))

	return &UpdateService{
		currentVersion: currentVersion,
		storage:        storage,
		client:         client,
	}
}

// CheckForUpdates checks if a new version is available
func (s *UpdateService) CheckForUpdates(forceCheck bool) (*UpdateInfo, error) {
	// Check cache first unless forced
	if !forceCheck {
		var cached UpdateInfo
		if err := s.storage.GetJSON(CacheKeyUpdate, &cached); err == nil {
			// Check if cache is still valid (within 24 hours)
			if time.Since(cached.CheckedAt) < CacheDuration {
				config.Debug("Using cached update check")
				return &cached, nil
			}
		}
	}

	config.Debug("Checking for updates from GitHub...")

	// Fetch latest release from GitHub
	var release GitHubRelease
	resp, err := s.client.R().
		SetResult(&release).
		Get(GitHubAPIURL)

	if err != nil {
		return nil, fmt.Errorf("failed to check for updates: %w", err)
	}

	if resp.IsError() {
		return nil, fmt.Errorf("GitHub API error: %s", resp.Status())
	}

	// Parse version (remove 'v' prefix if present)
	latestVersion := release.TagName
	if len(latestVersion) > 0 && latestVersion[0] == 'v' {
		latestVersion = latestVersion[1:]
	}

	// Compare versions
	updateAvailable := s.compareVersions(latestVersion, s.currentVersion)

	updateInfo := &UpdateInfo{
		LatestVersion:   latestVersion,
		CurrentVersion:  s.currentVersion,
		UpdateAvailable: updateAvailable,
		ReleaseURL:      release.HTMLURL,
		Changelog:       release.Body,
		PublishedAt:     release.PublishedAt,
		CheckedAt:       time.Now(),
	}

	// Cache result
	if err := s.storage.SetJSONWithTTL(CacheKeyUpdate, updateInfo, CacheDuration); err != nil {
		config.Warnf("Failed to cache update info: %v", err)
	}

	return updateInfo, nil
}

// GetChangelog fetches the changelog for the latest release
func (s *UpdateService) GetChangelog() (string, error) {
	var release GitHubRelease
	resp, err := s.client.R().
		SetResult(&release).
		Get(GitHubAPIURL)

	if err != nil {
		return "", fmt.Errorf("failed to fetch changelog: %w", err)
	}

	if resp.IsError() {
		return "", fmt.Errorf("GitHub API error: %s", resp.Status())
	}

	return release.Body, nil
}

// GetDownloadURL returns the download URL for the current platform
func (s *UpdateService) GetDownloadURL() (string, error) {
	var release GitHubRelease
	resp, err := s.client.R().
		SetResult(&release).
		Get(GitHubAPIURL)

	if err != nil {
		return "", fmt.Errorf("failed to get download URL: %w", err)
	}

	if resp.IsError() {
		return "", fmt.Errorf("GitHub API error: %s", resp.Status())
	}

	// Determine the asset name based on platform
	platform := runtime.GOOS
	arch := runtime.GOARCH

	var assetName string
	switch platform {
	case "darwin":
		if arch == "arm64" {
			assetName = "ghost-darwin-arm64"
		} else {
			assetName = "ghost-darwin-amd64"
		}
	case "linux":
		if arch == "arm64" {
			assetName = "ghost-linux-arm64"
		} else {
			assetName = "ghost-linux-amd64"
		}
	case "windows":
		assetName = "ghost-windows-amd64.exe"
	default:
		return "", fmt.Errorf("unsupported platform: %s/%s", platform, arch)
	}

	// Find the matching asset
	for _, asset := range release.Assets {
		if asset.Name == assetName {
			return asset.BrowserDownloadURL, nil
		}
	}

	return "", fmt.Errorf("no download available for %s/%s", platform, arch)
}

// compareVersions compares two semantic versions
// Returns true if latest > current
func (s *UpdateService) compareVersions(latest, current string) bool {
	// Simple version comparison - assumes semver format (major.minor.patch)
	// For production, use a proper semver library

	// If versions are identical, no update needed
	if latest == current {
		return false
	}

	// Parse versions
	var latestMajor, latestMinor, latestPatch int
	var currentMajor, currentMinor, currentPatch int

	fmt.Sscanf(latest, "%d.%d.%d", &latestMajor, &latestMinor, &latestPatch)
	fmt.Sscanf(current, "%d.%d.%d", &currentMajor, &currentMinor, &currentPatch)

	// Compare major version
	if latestMajor > currentMajor {
		return true
	} else if latestMajor < currentMajor {
		return false
	}

	// Compare minor version
	if latestMinor > currentMinor {
		return true
	} else if latestMinor < currentMinor {
		return false
	}

	// Compare patch version
	return latestPatch > currentPatch
}

// CheckInBackground checks for updates in the background (non-blocking)
func (s *UpdateService) CheckInBackground() {
	go func() {
		updateInfo, err := s.CheckForUpdates(false)
		if err != nil {
			config.Debugf("Background update check failed: %v", err)
			return
		}

		if updateInfo.UpdateAvailable {
			config.Infof("New version available: v%s (current: v%s)",
				updateInfo.LatestVersion,
				updateInfo.CurrentVersion)
			config.Infof("Run 'ghost update check' for more information")
		}
	}()
}

// ClearCache clears the update check cache
func (s *UpdateService) ClearCache() error {
	return s.storage.Delete(CacheKeyUpdate)
}
