# Dosel — Visual Direction & Design Spec (`frame.md`)

## 1. Brand Identity & Color Tokens
Derived from `docs/branding.md`, `web/src/styles.css`, and `docs/pitch/deck.html`:
- **Deep Canopy Dark (`--bg-dark`)**: `#0a1a13` (primary dark background for satellite, problem, dual-signal validation, and closing scenes)
- **Elevated Forest Surface (`--surface-dark`)**: `#112419` (cards, HUD panels, telemetry inspect boxes)
- **Canopy Hairline (`--line-dark`)**: `#223c2d` (`1px solid` structural borders)
- **Primary Light Ink (`--ink-light`)**: `#eef3e4` (warm off-white text on dark backgrounds — contrast ratio > 13:1)
- **Muted Sage (`--muted-dark`)**: `#9db3a4` (secondary labels and captions on dark backgrounds — contrast ratio > 6.5:1)
- **Chlorophyll Lime (`--accent`)**: `#c8f25c` (active NDVI status, primary metrics, cursor highlights, verified badges; use `#0a1a13` ink when used as fill)
- **Frozen Alert Coral (`--crit`)**: `#ff7a5c` (`TACOP1` frozen state, deforestation alerts, `-0,202` NDVI drop indicator)
- **Editorial Paper Light (`--bg-light`)**: `#edf0eb` / `#f2f4ea` (used as framing contrast in live web app showcase cards)
- **Editorial Deep Ink (`--ink-dark`)**: `#14201a`
- **Forest Green Accent (`--ok-light`)**: `#1d5c3e`

## 2. Typography (Pre-Bundled Compiler Safe Fonts)
To guarantee 100% deterministic rendering and zero `font_family_without_font_face` lint errors:
- **Display & Headlines**: `'Montserrat', sans-serif` (`font-weight: 800` / `900`, tight tracking `-0.03em`, line-height `1.04`)
- **UI & Body Copy**: `'Inter', sans-serif` (`font-weight: 400` / `500` / `600` / `700`, line-height `1.4`)
- **Telemetry, Coordinates, Contract Hashes & Numbers**: `'IBM Plex Mono', monospace` (`font-weight: 500` / `700`, `font-variant-numeric: tabular-nums`)

## 3. Layout & Safe Zones (`1920 × 1080`)
- **Outer Frame Padding**: `64px` horizontal, `48px` top, `116px` bottom (reserving `y: 964px–1052px` for the synchronized voiceover guide subtitle bar so captions never collide with scene content).
- **App Showcase Framing**: Browser window mockups with `ideathon-henna.vercel.app` URL bar, crisp `1px solid #223c2d` border, subtle dark drop shadow, animated interactive cursor with lime click-ripple, and floating glass HUD callout cards that zoom into key data points.
