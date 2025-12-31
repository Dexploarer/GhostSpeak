.PHONY: help build install test lint clean run dev fmt vet coverage release docker

# Variables
BINARY_NAME=ghost
VERSION=$(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
BUILD_TIME=$(shell date -u '+%Y-%m-%d_%H:%M:%S')
LDFLAGS=-ldflags "-X main.Version=$(VERSION) -X main.BuildTime=$(BUILD_TIME)"

# Go parameters
GOCMD=go
GOBUILD=$(GOCMD) build
GOCLEAN=$(GOCMD) clean
GOTEST=$(GOCMD) test
GOGET=$(GOCMD) get
GOMOD=$(GOCMD) mod
GOFMT=$(GOCMD) fmt
GOVET=$(GOCMD) vet

help: ## Display this help screen
	@grep -h -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: ## Build the binary
	@echo "Building $(BINARY_NAME)..."
	$(GOBUILD) $(LDFLAGS) -o $(BINARY_NAME) -v

build-all: ## Build for all platforms
	@echo "Building for all platforms..."
	GOOS=darwin GOARCH=amd64 $(GOBUILD) $(LDFLAGS) -o $(BINARY_NAME)-darwin-amd64
	GOOS=darwin GOARCH=arm64 $(GOBUILD) $(LDFLAGS) -o $(BINARY_NAME)-darwin-arm64
	GOOS=linux GOARCH=amd64 $(GOBUILD) $(LDFLAGS) -o $(BINARY_NAME)-linux-amd64
	GOOS=linux GOARCH=arm64 $(GOBUILD) $(LDFLAGS) -o $(BINARY_NAME)-linux-arm64
	GOOS=windows GOARCH=amd64 $(GOBUILD) $(LDFLAGS) -o $(BINARY_NAME)-windows-amd64.exe

install: build ## Install the binary to $GOPATH/bin
	@echo "Installing $(BINARY_NAME)..."
	@mkdir -p $(GOPATH)/bin
	@cp $(BINARY_NAME) $(GOPATH)/bin/
	@echo "Installed to $(GOPATH)/bin/$(BINARY_NAME)"

test: ## Run tests
	@echo "Running tests..."
	$(GOTEST) -v ./...

test-coverage: ## Run tests with coverage
	@echo "Running tests with coverage..."
	$(GOTEST) -coverprofile=coverage.out -covermode=atomic ./...
	$(GOCMD) tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

test-race: ## Run tests with race detector
	@echo "Running tests with race detector..."
	$(GOTEST) -race -short ./...

test-integration: ## Run integration tests
	@echo "Running integration tests..."
	$(GOTEST) -tags=integration ./...

lint: ## Run linter
	@echo "Running linter..."
	@which golangci-lint > /dev/null || (echo "golangci-lint not installed. Run: curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $(go env GOPATH)/bin" && exit 1)
	golangci-lint run --timeout=5m

fmt: ## Format code
	@echo "Formatting code..."
	$(GOFMT) ./...

vet: ## Run go vet
	@echo "Running go vet..."
	$(GOVET) ./...

clean: ## Clean build artifacts
	@echo "Cleaning..."
	$(GOCLEAN)
	rm -f $(BINARY_NAME)
	rm -f $(BINARY_NAME)-*
	rm -f coverage.out coverage.html

run: build ## Build and run the binary
	@echo "Running $(BINARY_NAME)..."
	./$(BINARY_NAME)

dev: ## Run in development mode with hot reload (requires air)
	@which air > /dev/null || (echo "air not installed. Run: go install github.com/cosmtrek/air@latest" && exit 1)
	air

deps: ## Download dependencies
	@echo "Downloading dependencies..."
	$(GOMOD) download
	$(GOMOD) tidy

deps-upgrade: ## Upgrade dependencies
	@echo "Upgrading dependencies..."
	$(GOGET) -u ./...
	$(GOMOD) tidy

verify: fmt vet lint test ## Run all verification checks

ci: verify build ## Run CI checks (format, vet, lint, test, build)
	@echo "All CI checks passed!"

release: clean verify build-all ## Build release binaries
	@echo "Creating release..."
	@mkdir -p dist
	@mv $(BINARY_NAME)-* dist/
	@echo "Release binaries created in dist/"

docker-build: ## Build Docker image
	@echo "Building Docker image..."
	docker build -t ghostspeak/cli:$(VERSION) .
	docker tag ghostspeak/cli:$(VERSION) ghostspeak/cli:latest

docker-run: ## Run Docker container
	@echo "Running Docker container..."
	docker run --rm -it ghostspeak/cli:latest

benchmark: ## Run benchmarks
	@echo "Running benchmarks..."
	$(GOTEST) -bench=. -benchmem ./...

generate: ## Run go generate
	@echo "Running go generate..."
	$(GOCMD) generate ./...

mod-graph: ## Display module dependency graph
	@echo "Module dependency graph:"
	$(GOMOD) graph

size: build ## Display binary size
	@echo "Binary size:"
	@ls -lh $(BINARY_NAME)

version: ## Display version information
	@echo "Version: $(VERSION)"
	@echo "Build Time: $(BUILD_TIME)"

init-dev: deps ## Initialize development environment
	@echo "Initializing development environment..."
	@which golangci-lint > /dev/null || curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $$(go env GOPATH)/bin
	@which air > /dev/null || go install github.com/cosmtrek/air@latest
	@echo "Development environment ready!"

.DEFAULT_GOAL := help
