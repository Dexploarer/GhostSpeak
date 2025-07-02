#!/bin/bash

# 🚀 Wija Studio Extension - Quick Marketplace Publishing Script
# This script automates the entire publishing process

echo "🔮 WIJA STUDIO - MARKETPLACE PUBLISHING SCRIPT 🔮"
echo "================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Check prerequisites
print_status "Checking prerequisites..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the extension directory."
    exit 1
fi

# Check if vsce is installed
if ! command -v vsce &> /dev/null; then
    print_warning "vsce CLI not found. Installing..."
    npm install -g @vscode/vsce
    if [ $? -eq 0 ]; then
        print_success "vsce CLI installed successfully"
    else
        print_error "Failed to install vsce CLI. Please install manually: npm install -g @vscode/vsce"
        exit 1
    fi
else
    print_success "vsce CLI found: $(vsce --version)"
fi

# Check if icon exists (PNG required for marketplace)
if [ ! -f "assets/wija-icon.png" ]; then
    print_warning "PNG icon not found. Checking for SVG..."
    if [ -f "assets/wija-icon.svg" ]; then
        print_warning "SVG icon found but marketplace requires PNG."
        print_warning "Please convert assets/wija-icon.svg to assets/wija-icon.png (128x128)"
        print_warning "You can use online converters or imagemagick: convert assets/wija-icon.svg -resize 128x128 assets/wija-icon.png"
        echo ""
        read -p "Press Enter when you have created assets/wija-icon.png..."
        
        if [ ! -f "assets/wija-icon.png" ]; then
            print_error "PNG icon still not found. Cannot proceed without icon."
            exit 1
        fi
    else
        print_error "No icon found. Please create assets/wija-icon.png (128x128)"
        exit 1
    fi
fi

print_success "Icon file found"

# Step 2: Install dependencies and compile
print_status "Installing dependencies and compiling..."

npm install
if [ $? -ne 0 ]; then
    print_error "Failed to install dependencies"
    exit 1
fi

npm run compile
if [ $? -ne 0 ]; then
    print_error "Failed to compile TypeScript"
    exit 1
fi

print_success "Compilation successful"

# Step 3: Check publisher configuration
print_status "Checking publisher configuration..."

PUBLISHER=$(node -p "require('./package.json').publisher")
if [ "$PUBLISHER" = "wija" ] || [ "$PUBLISHER" = "undefined" ]; then
    print_warning "Publisher in package.json needs to be updated"
    echo "Current publisher: $PUBLISHER"
    echo ""
    echo "You need to:"
    echo "1. Create a publisher account: vsce create-publisher your-publisher-name"
    echo "2. Update package.json with your publisher name"
    echo ""
    read -p "Have you created a publisher and updated package.json? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Please create a publisher and update package.json, then run this script again"
        exit 1
    fi
fi

# Step 4: Create .vscodeignore if it doesn't exist
if [ ! -f ".vscodeignore" ]; then
    print_status "Creating .vscodeignore file..."
    cat > .vscodeignore << EOF
# Files to exclude from the extension package
node_modules/**
src/**
tests/**
docs/**
.git/**
.gitignore
.vscode/**
*.md
!README.md
tsconfig.json
.eslintrc.json
*.log
*.vsix
.DS_Store
thumbs.db
EOF
    print_success ".vscodeignore created"
fi

# Step 5: Package the extension
print_status "Packaging extension..."

vsce package
if [ $? -ne 0 ]; then
    print_error "Failed to package extension"
    exit 1
fi

VSIX_FILE=$(ls *.vsix | head -n1)
if [ -z "$VSIX_FILE" ]; then
    print_error "No .vsix file found after packaging"
    exit 1
fi

print_success "Extension packaged: $VSIX_FILE"

# Step 6: Test local installation
print_status "Testing local installation..."
read -p "Do you want to test the extension locally before publishing? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    code --install-extension "$VSIX_FILE"
    print_success "Extension installed locally"
    print_warning "Please test the extension in VS Code and come back when ready"
    read -p "Press Enter when you're ready to publish to marketplace..."
fi

# Step 7: Login to marketplace
print_status "Logging in to VS Code Marketplace..."

CURRENT_PUBLISHER=$(node -p "require('./package.json').publisher")
vsce login "$CURRENT_PUBLISHER"
if [ $? -ne 0 ]; then
    print_error "Failed to login to marketplace"
    print_warning "Make sure you have:"
    print_warning "1. Created a publisher account"
    print_warning "2. Generated a Personal Access Token in Azure DevOps"
    print_warning "3. Token has 'Marketplace > Acquire' and 'Marketplace > Manage' permissions"
    exit 1
fi

print_success "Successfully logged in to marketplace"

# Step 8: Publish to marketplace
echo ""
print_status "🚀 Ready to publish to VS Code Marketplace!"
echo ""
echo "Extension details:"
echo "- Name: $(node -p "require('./package.json').name")"
echo "- Display Name: $(node -p "require('./package.json').displayName")"
echo "- Version: $(node -p "require('./package.json').version")"
echo "- Publisher: $(node -p "require('./package.json').publisher")"
echo "- Package: $VSIX_FILE"
echo ""

read -p "Publish to marketplace now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Publishing to marketplace..."
    
    vsce publish
    if [ $? -eq 0 ]; then
        print_success "🎉 Extension published successfully!"
        echo ""
        echo "🔮 MARKETPLACE PUBLICATION COMPLETE! 🔮"
        echo "=================================="
        echo ""
        echo "Your extension is now live on the VS Code Marketplace!"
        echo ""
        echo "📊 What's next:"
        echo "1. Check your extension: https://marketplace.visualstudio.com/items?itemName=$CURRENT_PUBLISHER.$(node -p "require('./package.json').name")"
        echo "2. Monitor analytics: https://marketplace.visualstudio.com/manage/publishers/$CURRENT_PUBLISHER"
        echo "3. Share with the community!"
        echo ""
        echo "🎯 Marketing suggestions:"
        echo "- Tweet about your launch"
        echo "- Share in VS Code communities"
        echo "- Write a blog post"
        echo "- Update your documentation with marketplace links"
        echo ""
        print_success "The most dev-friendly AI extension is now live! 🌟"
    else
        print_error "Publication failed"
        print_warning "Check the error messages above and try again"
        exit 1
    fi
else
    print_warning "Publication cancelled"
    echo "Your extension is packaged and ready. Run 'vsce publish' when you're ready."
fi

echo ""
print_success "Script completed!" 