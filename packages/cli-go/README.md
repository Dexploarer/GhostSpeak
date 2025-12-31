# GhostSpeak Go CLI

A beautiful terminal UI for managing AI agents on the Solana blockchain, built with [Charm](https://charm.sh/) tools.

## Features

✨ **Beautiful TUI** - Built with Bubbletea, Bubbles, Lipgloss, and Huh
👻 **GhostSpeak Branding** - Official neon yellow/black theme with ASCII art
🤖 **Agent Management** - Register, list, and manage AI agents
📊 **Analytics Dashboard** - Real-time performance metrics and earnings
🎨 **Responsive Design** - Adaptive colors and layouts for any terminal
⌨️  **Keyboard Navigation** - Full keyboard-driven interface
🎪 **Custom Components** - Ghost-themed boxes, banners, and loaders

## Tech Stack

This CLI is built entirely with [Charmbracelet](https://github.com/charmbracelet) tools:

- **[Bubbletea](https://github.com/charmbracelet/bubbletea)** - The Elm Architecture-based TUI framework
- **[Bubbles](https://github.com/charmbracelet/bubbles)** - TUI components (table, list, spinner, progress)
- **[Lipgloss](https://github.com/charmbracelet/lipgloss)** - Style definitions and layout
- **[Huh](https://github.com/charmbracelet/huh)** - Forms and prompts

## Installation

### Prerequisites

- Go 1.21 or higher
- Terminal with Unicode support

### Build from Source

```bash
# Clone the repository
git clone https://github.com/ghostspeak/ghostspeak
cd ghostspeak/packages/cli-go

# Install dependencies
go mod download

# Build
go build -o ghostspeak-go

# Run
./ghostspeak-go
```

## Usage

Launch the CLI:

```bash
./ghostspeak-go
```

### Navigation

- **`↑` / `↓`** or **`j` / `k`** - Navigate menu items
- **`Enter`** - Select item
- **`Esc`** - Go back to main menu
- **`q`** or **`Ctrl+C`** - Quit

### Main Menu Options

#### 📊 Dashboard
View comprehensive analytics:
- Total agents and active status
- Job completion statistics
- Earnings metrics (SOL)
- Performance ratings
- Recent activity feed

#### 🤖 List Agents
Browse all your registered agents in a table view:
- Agent ID and name
- Type and status
- Capabilities count
- Total earnings

Navigate with arrow keys, press Enter to view details.

#### ➕ Register Agent
Multi-step form to register a new agent:
1. **Basic Info** - Name and description
2. **Configuration** - Type and capabilities
3. **Confirmation** - Review and submit

Form features:
- Real-time validation
- Character limits
- Multi-select capabilities
- Progress indicator

## Project Structure

```
cli-go/
├── main.go              # Entry point
├── ui/
│   ├── model.go         # Main Bubbletea model & navigation
│   ├── styles.go        # GhostSpeak themed Lipgloss styles
│   ├── splash.go        # Ghost ASCII art & branding components
│   ├── agent_form.go    # Agent registration (Huh forms)
│   ├── agent_list.go    # Agent listing (Bubbles table)
│   └── dashboard.go     # Analytics dashboard (Bubbles components)
├── go.mod
├── go.sum
├── README.md
└── .gitignore
```

## Architecture

The CLI follows the **Model-View-Update (MVU)** pattern from The Elm Architecture:

```
┌─────────────────┐
│   tea.Program   │
│   (Event Loop)  │
└────────┬────────┘
         │
    ┌────▼────┐
    │  Model  │ ◄── Application state
    └────┬────┘
         │
    ┌────▼────┐
    │ Update  │ ◄── Handle messages, update state
    └────┬────┘
         │
    ┌────▼────┐
    │  View   │ ◄── Render UI
    └─────────┘
```

### View States

The main model manages navigation between views:
- `MenuView` - Main menu
- `DashboardView` - Analytics dashboard
- `AgentListView` - Agent table
- `AgentRegisterView` - Registration form

Each view has its own sub-model implementing the `tea.Model` interface.

## GhostSpeak Brand Colors

The UI uses the official GhostSpeak brand colors from the logo:

```go
// Primary Brand Colors
Ghost Yellow:  #CFFF04  // Neon yellow/lime - main brand color
Ghost Black:   #000000  // Black - primary elements
Yellow Alt:    #D4FF00  // Slightly different yellow for variation

// Functional Colors
Success:       #00FF00  // Bright green
Warning:       #FFD700  // Gold
Error:         #FF0000  // Bright red

// Theme Strategy
- Primary background: Neon yellow (#CFFF04)
- Primary text: Black on yellow
- Inverted elements: Yellow on black (ghost boxes, header)
- Borders: Black for contrast
```

### Adaptive Colors

The CLI uses `lipgloss.AdaptiveColor` for terminal compatibility:
- Light backgrounds: Neon yellow with black text
- Dark backgrounds: Neon yellow remains vibrant

This ensures the GhostSpeak brand is consistent across all terminal themes! 👻

## Development

### Adding a New View

1. Create a new file in `ui/` (e.g., `ui/my_view.go`)
2. Define a model struct implementing `tea.Model`:
   ```go
   type MyViewModel struct {
       // fields
   }

   func (m *MyViewModel) Init() tea.Cmd { }
   func (m *MyViewModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) { }
   func (m *MyViewModel) View() string { }
   ```
3. Add the view state to `ViewState` enum in `model.go`
4. Add menu item and navigation logic

### Using Charmbracelet Components

#### Bubbles Components
```go
import "github.com/charmbracelet/bubbles/table"

t := table.New(
    table.WithColumns(columns),
    table.WithRows(rows),
)
```

#### Huh Forms
```go
import "github.com/charmbracelet/huh"

form := huh.NewForm(
    huh.NewGroup(
        huh.NewInput().Title("Name").Value(&name),
    ),
)
```

#### Lipgloss Styling
```go
import "github.com/charmbracelet/lipgloss"

style := lipgloss.NewStyle().
    Foreground(lipgloss.Color("#7D56F4")).
    Bold(true).
    Padding(1, 2)
```

## Future Enhancements

- [ ] Connect to Solana blockchain (currently shows mock data)
- [ ] Wallet integration
- [ ] Real-time job notifications
- [ ] Agent performance charts
- [ ] Export reports
- [ ] Configuration file support
- [ ] Multi-wallet support

## Resources

- [Bubbletea Tutorial](https://github.com/charmbracelet/bubbletea/tree/main/tutorials)
- [Bubbles Components](https://github.com/charmbracelet/bubbles)
- [Lipgloss Styling Guide](https://github.com/charmbracelet/lipgloss)
- [Huh Forms](https://github.com/charmbracelet/huh)

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
