/**
 * @fileoverview Main data models and constants for ClipForge Video Editor.
 */

/**
 * Aspect Ratio enum values.
 * @readonly
 * @enum {string}
 */
export const AspectRatio = Object.freeze({
  SIXTEEN_NINE: '16:9',
  NINE_SIXTEEN: '9:16',
  ONE_ONE: '1:1',
  FOUR_FIVE: '4:5',
  TWENTY_ONE_NINE: '21:9',
});

/**
 * Aspect Ratio configurations with pixel dimensions and labels.
 */
export const ASPECT_RATIOS = Object.freeze({
  '16:9': Object.freeze({ ratio: '16:9', label: '16:9 (YouTube, Landscape)', width: 1920, height: 1080, iconName: 'Monitor' }),
  '9:16': Object.freeze({ ratio: '9:16', label: '9:16 (TikTok, Shorts, Reels)', width: 1080, height: 1920, iconName: 'Smartphone' }),
  '1:1': Object.freeze({ ratio: '1:1', label: '1:1 (Square, Feed)', width: 1080, height: 1080, iconName: 'Square' }),
  '4:5': Object.freeze({ ratio: '4:5', label: '4:5 (Instagram Portrait)', width: 1080, height: 1350, iconName: 'Image' }),
  '21:9': Object.freeze({ ratio: '21:9', label: '21:9 (Cinematic Ultrawide)', width: 2560, height: 1080, iconName: 'Tv' }),
});

/**
 * Track type category.
 * @readonly
 * @enum {string}
 */
export const TrackType = Object.freeze({
  VIDEO: 'video',
  AUDIO: 'audio',
  TEXT: 'text',
  STICKER: 'sticker',
  EFFECT: 'effect',
});

/**
 * Blend mode options for video & image compositing.
 * @readonly
 * @enum {string}
 */
export const BlendMode = Object.freeze({
  NORMAL: 'normal',
  MULTIPLY: 'multiply',
  SCREEN: 'screen',
  OVERLAY: 'overlay',
  DARKEN: 'darken',
  LIGHTEN: 'lighten',
  COLOR_DODGE: 'color-dodge',
  COLOR_BURN: 'color-burn',
  DIFFERENCE: 'difference',
});

/**
 * Mask shape type.
 * @readonly
 * @enum {string}
 */
export const MaskType = Object.freeze({
  NONE: 'none',
  CIRCLE: 'circle',
  RECTANGLE: 'rectangle',
  HEART: 'heart',
  STAR: 'star',
  HORIZONTAL: 'horizontal',
  MIRROR: 'mirror',
});

/**
 * Transition type.
 * @readonly
 * @enum {string}
 */
export const TransitionType = Object.freeze({
  NONE: 'none',
  FADE: 'fade',
  DISSOLVE: 'dissolve',
  SLIDE_LEFT: 'slide-left',
  SLIDE_RIGHT: 'slide-right',
  ZOOM_IN: 'zoom-in',
  ZOOM_OUT: 'zoom-out',
  WIPE_LEFT: 'wipe-left',
  WIPE_RIGHT: 'wipe-right',
  GLITCH: 'glitch',
});

/**
 * Keyframe model representing an animated property value at a specific offset time.
 * @typedef {Object} Keyframe
 * @property {string} id - Unique identifier.
 * @property {number} time - Relative offset in seconds from clip start.
 * @property {'x'|'y'|'scale'|'rotation'|'opacity'|'volume'} property - Animated property key.
 * @property {number} value - Numeric value for the property.
 * @property {'linear'|'easeIn'|'easeOut'|'easeInOut'} easing - Easing interpolation curve.
 */
export const Keyframe = Object.freeze({});

/**
 * Effect / Transition configuration applied to a media clip or timeline track.
 * @typedef {Object} Effect
 * @property {string} id - Effect identifier.
 * @property {string} name - Human-readable display label.
 * @property {string} [type] - Effect or transition algorithm type.
 * @property {number} [intensity] - Effect intensity (0-100).
 * @property {number} [duration] - Transition duration in seconds.
 */
export const Effect = Object.freeze({});

/**
 * Clip model representing a single timeline media element.
 * @typedef {Object} Clip
 * @property {string} id - Unique clip ID.
 * @property {string} trackId - Parent track ID.
 * @property {'video'|'audio'|'image'|'text'|'sticker'|'color'} type - Media clip type.
 * @property {string} name - Display name.
 * @property {number} start - Timeline placement time in seconds.
 * @property {number} duration - Duration on the timeline in seconds.
 * @property {number} sourceStart - Trimmed start offset in source media.
 * @property {number} sourceDuration - Total duration of source media.
 * @property {string} [mediaUrl] - Blob URL or data URL.
 * @property {string} [mediaId] - IndexedDB storage key.
 * @property {string} [thumbnailUrl] - Preview frame thumbnail URL.
 * @property {number} x - Horizontal canvas center offset %.
 * @property {number} y - Vertical canvas center offset %.
 * @property {number} scale - Scale multiplier (default 1.0).
 * @property {number} rotation - Rotation angle in degrees (-360 to +360).
 * @property {number} opacity - Alpha transparency (0 to 1).
 * @property {boolean} flipH - Horizontal flip mirror.
 * @property {boolean} flipV - Vertical flip mirror.
 * @property {string} blendMode - Canvas globalCompositeOperation blend mode.
 * @property {number} speed - Playback speed multiplier (0.1 to 100).
 * @property {Keyframe[]} keyframes - Animated transformation keyframes.
 */
export const Clip = Object.freeze({});

/**
 * Track model containing a sequential or layered list of clips.
 * @typedef {Object} Track
 * @property {string} id - Unique track ID.
 * @property {string} name - Display title.
 * @property {'video'|'audio'|'text'|'sticker'|'effect'} type - Track category.
 * @property {Clip[]} clips - Array of clips placed on this track.
 * @property {boolean} locked - Whether edits to this track are locked.
 * @property {boolean} hidden - Whether track visual output is hidden.
 * @property {boolean} muted - Whether track audio output is muted.
 * @property {number} volume - Volume gain multiplier (0 to 1).
 */
export const Track = Object.freeze({});

/**
 * Project data model containing all tracks, markers, canvas settings, and metadata.
 * @typedef {Object} Project
 * @property {string} id - Unique project ID.
 * @property {string} name - Project title.
 * @property {string} aspectRatio - Canvas aspect ratio (e.g. '16:9', '9:16').
 * @property {number} duration - Calculated total project duration in seconds.
 * @property {number} fps - Playback and export frame rate (24, 30, 60).
 * @property {Track[]} tracks - Multi-track timeline lanes.
 * @property {Array} markers - Timeline navigational markers.
 * @property {Object} background - Background canvas fill color or pattern.
 * @property {number} createdAt - Creation timestamp.
 * @property {number} updatedAt - Last modified timestamp.
 * @property {string} [thumbnail] - Project cover thumbnail image.
 */
export const Project = Object.freeze({});

// Backward-compatible safe exports
export const TextClipProperties = Object.freeze({});
export const AudioProperties = Object.freeze({});
export const ExportSettings = Object.freeze({});
export const Marker = Object.freeze({});
export const MaskConfig = Object.freeze({});
export const ChromaKeyConfig = Object.freeze({});
export const ColorAdjustments = Object.freeze({});
export const TransitionConfig = Object.freeze({});
export const ProjectBackground = Object.freeze({});
export const MediaAsset = Object.freeze({});
export const AspectRatioConfig = Object.freeze({});
