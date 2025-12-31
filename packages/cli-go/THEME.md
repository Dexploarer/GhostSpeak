# GhostSpeak Go CLI Theme Guide

This document explains the GhostSpeak brand theme implementation in the Go CLI.

## Brand Colors

The theme is based on the official GhostSpeak logo:

![GhostSpeak Logo Colors]
- **Primary**: Neon Yellow/Lime (#CFFF04) - The iconic background
- **Secondary**: Black (#000000) - The ghost silhouette and primary elements
- **Accent**: Yellow variation (#D4FF00) - For highlights and variety

## Design Philosophy

The GhostSpeak ghost has a **zippered mouth** - this represents privacy and encrypted communication. The CLI embodies this with:

1. **High Contrast** - Black on neon yellow for maximum readability
2. **Inverted Elements** - Yellow on black "ghost boxes" mimic the logo
3. **Bold Borders** - Thick black borders create structure
4. **Playful Icons** - Ghost emojis (👻🎃💀) for loading states

## Component Styles

### Standard Elements
- **Background**: Neon yellow (#CFFF04)
- **Text**: Black (#000000)
- **Borders**: Black with thick/rounded styles

### Ghost Elements (Inverted)
- **Background**: Black (#000000)
- **Text**: Neon yellow (#CFFF04)
- **Borders**: Yellow with rounded borders

Used for: Headers, special boxes, selected items, banners

### Tables
- **Header**: Black text on yellow background with thick border
- **Selected Row**: Yellow text on black background (inverted)
- **Normal Cells**: Black on yellow

### Progress Bars
- **Full**: Neon yellow (#CFFF04)
- **Empty**: Dark gray (#333333)
- **Background**: Black for contrast

## ASCII Art Components

### Full Ghost Logo
Located in `ui/splash.go`:
```
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
▄▀░░░░░░░░░░░░░░░░░▀▄
█░░░░░░░░░░░░░░░░░░░░░█
...
```
Used for: Splash screens, about pages

### Simple Ghost
```
▄▄▄▄▄
▄▀ ◉ ◉ ▀▄
█   ▬▬▬   █
▀▄     ▄▀
▀▀▀▀▀
```
Used for: Loading screens, small spaces

### Zipper Mouth
```
▬▬▬▬▬▬▬▬
```
Used for: Decorative separators, banners

## Utility Functions

### `RenderGhostBanner(text string)`
Creates a banner with ghost emoji + text + zipper

### `RenderSplashScreen(width, height int)`
Full splash screen with ASCII art ghost logo

### `ZipperLine(width int)`
Decorative separator line

### `GhostLoader(message string, frame int)`
Animated loader cycling through: 👻 → 🎃 → 💀 → 🦴

## Adaptive Colors

For terminal compatibility:

```go
adaptiveBrand = lipgloss.AdaptiveColor{
    Light: "#CFFF04", // Neon yellow on light terminals
    Dark:  "#CFFF04", // Same yellow on dark terminals
}

adaptiveText = lipgloss.AdaptiveColor{
    Light: "#000000", // Black text on light backgrounds
    Dark:  "#CFFF04", // Yellow text on dark backgrounds
}
```

## Usage Examples

### Creating a Ghost-themed Box
```go
content := GhostBoxStyle.Render("Secret Message!")
// Yellow text on black background with yellow border
```

### Creating a Standard Box
```go
content := BoxStyle.Render("Normal Content")
// Black text on yellow background with black border
```

### Adding a Header
```go
header := RenderGhostBanner("ANALYTICS")
// 👻 ANALYTICS ▬▬▬▬▬▬▬▬
```

### Creating a Zipper Separator
```go
separator := ZipperLine(80)
// ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
```

## Color Accessibility

The high contrast between neon yellow and black ensures:
- ✅ WCAG AAA compliance for normal text
- ✅ Excellent visibility in all lighting conditions
- ✅ Works on any terminal color scheme
- ✅ Distinctive brand recognition

## Best Practices

1. **Use Ghost Boxes for Important Content** - Inverted colors draw attention
2. **Keep Yellow Background Prominent** - It's the brand signature
3. **Black Borders for Structure** - Thick borders create clear sections
4. **Ghost Emojis for Fun** - 👻 adds personality to loading states
5. **Zipper for Privacy** - Use zipper decorations for security-related features

## Future Enhancements

- [ ] Animated zipper opening/closing effect
- [ ] Ghost ASCII animations (floating effect)
- [ ] Sound effects (terminal bell) for ghost appearance
- [ ] Color gradients within yellow spectrum
- [ ] Custom Nerd Font icons for ghost symbols
