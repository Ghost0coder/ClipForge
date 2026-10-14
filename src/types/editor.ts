export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5' | '21:9';

export interface AspectRatioConfig {
  ratio: AspectRatio;
  label: string;
  width: number;
  height: number;
  iconName: string;
}

export const ASPECT_RATIOS: Record<AspectRatio, AspectRatioConfig> = {
  '16:9': { ratio: '16:9', label: '16:9 (YouTube, Landscape)', width: 1920, height: 1080, iconName: 'Monitor' },
  '9:16': { ratio: '9:16', label: '9:16 (TikTok, Shorts, Reels)', width: 1080, height: 1920, iconName: 'Smartphone' },
  '1:1': { ratio: '1:1', label: '1:1 (Square, Feed)', width: 1080, height: 1080, iconName: 'Square' },
  '4:5': { ratio: '4:5', label: '4:5 (Instagram Portrait)', width: 1080, height: 1350, iconName: 'Image' },
  '21:9': { ratio: '21:9', label: '21:9 (Cinematic Ultrawide)', width: 2560, height: 1080, iconName: 'Tv' },
};

export type TrackType = 'video' | 'audio' | 'text' | 'sticker' | 'effect';

export interface Keyframe {
  id: string;
  time: number; // relative to clip start (seconds)
  property: 'x' | 'y' | 'scale' | 'rotation' | 'opacity' | 'volume';
  value: number;
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
}

export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'difference';

export type MaskType = 'none' | 'circle' | 'rectangle' | 'heart' | 'star' | 'horizontal' | 'mirror';

export interface MaskConfig {
  type: MaskType;
  size: number; // 0 - 100%
  feather: number; // 0 - 50px
  x: number; // offset % (-50 to +50)
  y: number; // offset % (-50 to +50)
  invert?: boolean;
}

export interface ChromaKeyConfig {
  enabled: boolean;
  keyColor: string; // hex, default #00FF00
  similarity: number; // 0 - 100
  smoothness: number; // 0 - 100
}

export interface ColorAdjustments {
  brightness: number; // -100 to 100 (0 default)
  contrast: number; // -100 to 100 (0 default)
  saturation: number; // -100 to 100 (0 default)
  exposure: number; // -100 to 100
  highlights: number; // -100 to 100
  shadows: number; // -100 to 100
  temperature: number; // -100 to 100 (warm/cool)
  tint: number; // -100 to 100 (green/magenta)
  vignette: number; // 0 to 100
  sharpen: number; // 0 to 100
  grain: number; // 0 to 100
}

export interface TextClipProperties {
  text: string;
  fontFamily: string;
  fontSize: number; // px at 1080p scale
  fontWeight?: string;
  color: string;
  gradient?: {
    enabled: boolean;
    from: string;
    to: string;
    direction: 'horizontal' | 'vertical';
  };
  strokeColor?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  bgColor?: string;
  bgPadding?: number;
  bgRadius?: number;
  align: 'left' | 'center' | 'right';
  letterSpacing: number;
  lineHeight: number;
  animation?: 'none' | 'typewriter' | 'fade' | 'bounce' | 'slide-up' | 'glow' | 'karaoke';
  isCaption?: boolean;
  karaokeColor?: string;
}

export interface AudioProperties {
  volume: number; // 0 to 2 (1 = 100%)
  fadeIn: number; // seconds
  fadeOut: number; // seconds
  mute: boolean;
  pitchShift: number; // -12 to 12
  voiceChanger?: 'none' | 'robot' | 'chipmunk' | 'deep' | 'radio' | 'echo';
  equalizer?: {
    bass: number; // -12 to 12 dB
    mid: number;
    treble: number;
  };
}

export interface TransitionConfig {
  type: 'none' | 'fade' | 'dissolve' | 'slide-left' | 'slide-right' | 'zoom-in' | 'zoom-out' | 'wipe-left' | 'wipe-right' | 'glitch';
  duration: number; // seconds (0.2 to 2.0)
}

export interface Clip {
  id: string;
  trackId: string;
  type: 'video' | 'audio' | 'image' | 'text' | 'sticker' | 'color';
  name: string;
  start: number; // timeline start time in seconds
  duration: number; // timeline duration in seconds
  sourceStart: number; // offset into source media in seconds
  sourceDuration: number; // original media duration in seconds
  mediaUrl?: string; // blob URL or data URL
  thumbnailUrl?: string;
  color?: string; // for solid color clips

  // Visual Transformations
  x: number; // canvas center offset X (-100% to +100%)
  y: number; // canvas center offset Y (-100% to +100%)
  scale: number; // 0.1 to 10.0 (default 1.0)
  rotation: number; // degrees -360 to +360
  opacity: number; // 0 to 1
  flipH: boolean;
  flipV: boolean;
  blendMode: BlendMode;
  mask?: MaskConfig;
  chromaKey?: ChromaKeyConfig;
  crop?: { top: number; bottom: number; left: number; right: number };
  drawingData?: string;

  // Speed
  speed: number; // 0.1 to 100 (default 1.0)
  speedCurve?: 'constant' | 'flash-in' | 'flash-out' | 'bullet' | 'hero' | 'jump';
  reverse?: boolean;
  freezeFrame?: boolean;

  // Color Grading & Filters
  filter?: string; // filter ID
  filterIntensity: number; // 0 - 100
  adjustments: ColorAdjustments;

  // Special Effects (Glitch, RGB split, Shake, VHS, Zoom Pulse, etc.)
  effectType?: string;
  effectIntensity?: number;

  // Transitions
  transitionIn?: TransitionConfig;
  transitionOut?: TransitionConfig;

  // Sub-properties
  textProps?: TextClipProperties;
  audioProps?: AudioProperties;
  stickerUrl?: string;
  stickerEmoji?: string;

  // Keyframes
  keyframes: Keyframe[];
}

export interface Track {
  id: string;
  name: string;
  type: TrackType;
  clips: Clip[];
  locked: boolean;
  hidden: boolean;
  muted: boolean;
  volume: number; // 0 to 1
}

export interface Marker {
  id: string;
  time: number; // seconds
  label: string;
  color: string;
}

export interface ProjectBackground {
  type: 'color' | 'gradient' | 'blur' | 'transparent';
  color: string;
  gradient?: string;
}

export interface Project {
  id: string;
  name: string;
  aspectRatio: AspectRatio;
  duration: number; // calculated max duration of all tracks
  fps: number;
  tracks: Track[];
  markers: Marker[];
  background: ProjectBackground;
  createdAt: number;
  updatedAt: number;
  thumbnail?: string;
}

export interface ExportSettings {
  resolution: '480p' | '720p' | '1080p' | '2K' | '4K';
  fps: 24 | 30 | 60;
  format: 'mp4' | 'webm' | 'gif' | 'mp3' | 'png-frame';
  quality: 'low' | 'medium' | 'high' | 'ultra';
}

export interface MediaAsset {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'image';
  url: string;
  thumbnailUrl?: string;
  duration?: number;
  width?: number;
  height?: number;
  fileSize?: number;
  addedAt: number;
}
