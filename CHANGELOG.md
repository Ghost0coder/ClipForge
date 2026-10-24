# Changelog

All notable changes to ClipForge will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [0.3.0] — 2026-10-24

### Added
- **Onboarding Modal**: First-run welcome wizard guiding new users through core features.
- **Project Manager Modal**: Full project library with create, rename, duplicate, and delete support.
- **AI Smart Highlights**: Gemini-powered automatic scene detection and highlight clip extraction.
- **Template System**: Pre-built video project templates for common use-cases (reels, vlogs, cinematic).
- **AdvancedColorTools component**: Dedicated color-grading panel with curves, HSL, and LUT support.
- **SpeedCurveEditor**: Bezier-based speed ramping editor for smooth speed transitions.
- **AudioMixerModal**: Multi-channel audio mixer with pan, gain, EQ, and compressor controls.

### Changed
- `README.md` now includes version and CI badges.
- `package.json` corrected — name was `react-example`, now `clipforge`; version was `0.0.0`, now `0.3.0`.
- Build tools (`vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`, `vite-plugin-pwa`) moved from `dependencies` → `devDependencies`.

---

## [0.2.0] — 2026-10-20

### Added
- **Light Mode**: Full light theme support with system preference persistence via `localStorage`.
- **Vercel Analytics**: Integrated `@vercel/analytics` for page-view and event insights.
- **`KeyboardShortcutsModal`**: Interactive cheat-sheet listing all keyboard shortcuts.
- **`ProjectManagerModal`**: Initial project persistence and multi-project management.
- **`OnboardingModal`**: Placeholder first-run modal (completed in v0.3.0).
- **`TemplateModal`**: Browse and apply project templates (completed in v0.3.0).

### Changed
- Codebase migrated from TypeScript (`.tsx` / `.ts`) to JavaScript (`.jsx` / `.js`) for broader contributor accessibility.
- `RightInspector`, `Timeline`, `LeftPanel`, `TopBar` heavily refactored for theming support.
- `index.css` extended with theme variables and utility classes.
- `index.html` updated with theme-persistence script and meta tags.

### Fixed
- Build-time syntax errors cleaned up.
- Unused export utilities removed from `src/utils/`.

---

## [0.1.0] — 2026-10-15

### Added
- **PWA Support**: Service Worker with Workbox, `manifest.json`, offline caching, install prompt.
- **PWA Icons**: `pwa-192x192.png`, `pwa-512x512.png`, `pwa-maskable-512x512.png`, `apple-touch-icon.png`, `favicon.ico`, `icon.svg`.
- **`scripts/generate-icons.js`**: Utility to regenerate PWA icons from source SVG.
- **`PWAInstallButton`**: In-app install-to-homescreen button component.
- **`MobileBottomToolbar`**: Bottom navigation bar for mobile viewport.
- **`MobileFloatingClipBar`**: Floating clip controls for touch-friendly editing.
- **`ToastContainer`**: Global notification toast system with auto-dismiss.
- **`useResponsive` hook**: Breakpoint detection for responsive layout switching.
- **`usePWAInstall` hook**: Handles `beforeinstallprompt` event lifecycle.
- **Sample video utility**: In-app sample video assets for demo projects.
- **Beat Detection**: BPM-aligned auto-markers on audio tracks.
- **Keyframe Visualization**: Interactive keyframe markers on the timeline.

### Changed
- `server.js` refactored for production Express static serving with Vite proxy fallback.
- `CenterPreview`, `ExportModal`, `LeftPanel`, `Timeline`, `TopBar` significantly extended for mobile and PWA support.
- `editorStore` extended with persistent state hydration from IndexedDB.
- `tsconfig.json` updated for stricter type-checking.
- `vite.config.ts` extended with `VitePWA` plugin configuration.

---

## [0.0.1] — 2026-10-13 *(Initial Release)*

### Added
- **Core application structure**: React 19 + Vite + TailwindCSS 4 + Zustand state management.
- **Multi-track Timeline**: Video, Audio, Text, Sticker, and Effects tracks with drag-and-drop clip editing.
- **60 FPS Canvas Renderer**: Multi-layer compositing with hardware-accelerated HTML5 Canvas.
- **30+ Color Filters**: Cinematic Teal & Orange, Film Noir, Retro 70s, Cyberpunk, Golden Hour, and more.
- **12+ Visual Effects**: RGB split glitch, camera shake, zoom pulse, VHS scanlines, film grain, light leaks.
- **Transitions**: Fade, Cross Dissolve, Slide, Zoom, Wipe, Glitch Cut.
- **Chroma Key**: Green screen removal with color picker.
- **Shape Masks**: Circle, Rectangle, Heart, Star with feathering.
- **50+ Google Fonts** for text overlays and captions.
- **Auto-Captions**: In-browser speech segmentation with SRT import/export.
- **Web Audio API Engine**: Multi-track synchronized playback, voiceover recorder, voice changer.
- **Gemini AI**: Script-to-video, AI TTS voiceover, AI graphic overlay generation.
- **IndexedDB Persistence**: Project library, autosave every 5 seconds, crash recovery.
- **Client-Side Export**: 480p–4K MP4, WebM, GIF, MP3, PNG frame snapshot.
- **Express Backend**: Proxies Gemini API calls server-side to protect API key.

[Unreleased]: https://github.com/Ghost0coder/ClipForge/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/Ghost0coder/ClipForge/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/Ghost0coder/ClipForge/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Ghost0coder/ClipForge/compare/823878c...v0.1.0
