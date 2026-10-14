# ClipForge — Full-Featured Browser Video Editor

ClipForge is a CapCut-inspired client-side video editor built with React 19, TypeScript, Vite, Tailwind CSS, Web Audio API, and HTML5 Canvas.

## Features

### 🎬 Multi-Track Timeline
- **Unlimited Tracks**: Video, Audio, Text, Sticker, and Effects tracks.
- **Editing Tools**: Split at playhead (`S`), Trim edge handles, Delete (`Del`), Ripple delete, Duplicate (`Ctrl+D`), Freeze frame, Reverse, Mute, Lock, Hide.
- **Snapping & Magnetic Timeline**: Snaps to playhead, markers, and clip boundaries.
- **Audio Waveforms**: Procedural and media waveform previews directly on audio tracks.
- **Keyframe Visualization**: Interactive keyframe markers for scale, position, rotation, and opacity.

### 🎨 Live Canvas Preview & Effects
- **60 FPS Live Rendering Engine**: Multi-track layered compositing with hardware acceleration.
- **30+ Color Filters**: Cinematic Teal & Orange, Film Noir, Retro 70s, Cyberpunk, Golden Hour, Bleach Bypass, Emerald, and more.
- **12+ Dynamic Visual Effects**: RGB split glitch, Camera shake, Zoom pulse, VHS scanlines, Film grain, Light leaks, TV static, Edge glow.
- **Transitions**: Fade, Cross Dissolve, Slide Left/Right, Zoom In/Out, Wipe Left, Glitch Cut.
- **Chroma Key**: Green screen removal with color picker, similarity, and smoothness controls.
- **Shape Masks**: Circle, Rectangle, Heart, Star with feathering.
- **Aspect Ratios**: 16:9 (YouTube), 9:16 (TikTok/Shorts), 1:1 (Square), 4:5 (Instagram), 21:9 (Cinematic Ultrawide).
- **Safe Area Guides**: TikTok / Shorts UI overlays and 3x3 Rule-of-Thirds grid.

### ✍️ Typography & Captions
- **50+ Google Fonts**: Bebas Neue, Outfit, Anton, Montserrat, Bungee, Righteous, Playfair Display, and more.
- **Text Styles**: Gradient fills, stroke outlines, drop shadows, background pill boxes.
- **Kinetic Animations**: Typewriter, Bounce, Neon Glow, Karaoke word highlighting.
- **Auto-Captions**: In-browser speech & transcript segmentation with SRT import/export.

### 🔊 Audio Studio & SFX
- **Web Audio API Engine**: Multi-track synchronized playback.
- **Built-in Music & SFX**: Hyper Pop, Lofi Chill, Cinematic, Whoosh, Sub Drop Impact, Bubble Pop, Camera Shutter, Success Ding, Laser.
- **Voiceover Recorder**: In-app microphone recording directly onto timeline tracks with live meter.
- **Beat Detection**: Auto-markers sync aligned to musical BPM.
- **Voice Changer**: Robot, Chipmunk, Deep voice, Radio, Echo presets.

### 🤖 Gemini AI Capabilities
- **AI Script-to-Video**: Generates scenes, visual descriptions, headlines, and filters from a text prompt.
- **AI Voiceover (TTS)**: Studio voice synthesis with voices `Kore`, `Puck`, `Charon`, `Fenrir`, `Zephyr`.
- **AI Graphic Overlays**: Custom sticker and graphic generator.

### 💾 Persistence & Export
- **IndexedDB**: Persistent local project library, autosave every 5 seconds, crash recovery.
- **Client-Side Export**: 480p, 720p, 1080p, 2K, 4K at 24/30/60 FPS (MP4 / WebM / GIF / MP3 / PNG Frame Snapshot).

## Setup & Running

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```
