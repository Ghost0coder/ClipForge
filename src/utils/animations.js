/**
 * ClipForge Data-Driven Animations Registry (80+ Animations)
 * Categories: in, out, loop, text
 */

export function applyEasing(t, easing) {
  let clamped = Math.max(0, Math.min(1, t));
  if (easing === 'linear') return clamped;
  if (easing === 'easeIn') return clamped * clamped;
  if (easing === 'easeOut') return clamped * (2 - clamped);
  if (easing === 'easeInOut') return clamped < 0.5 ? 2 * clamped * clamped : -1 + (4 - 2 * clamped) * clamped;
  if (easing === 'bounce') {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (clamped < 1 / d1) return n1 * clamped * clamped;
    if (clamped < 2 / d1) return n1 * (clamped -= 1.5 / d1) * clamped + 0.75;
    if (clamped < 2.5 / d1) return n1 * (clamped -= 2.25 / d1) * clamped + 0.9375;
    return n1 * (clamped -= 2.625 / d1) * clamped + 0.984375;
  }
  if (easing === 'elastic') {
    if (clamped === 0) return 0;
    if (clamped === 1) return 1;
    return -Math.pow(2, 10 * (clamped - 1)) * Math.sin((clamped - 1.1) * 5 * Math.PI);
  }
  return clamped < 0.5 ? 2 * clamped * clamped : -1 + (4 - 2 * clamped) * clamped;
}

export const ANIMATION_CATEGORIES = ['In', 'Out', 'Loop', 'Text'];

export const ANIMATIONS_REGISTRY = {
  // --- IN ANIMATIONS (28+) ---
  'fade-in': { id: 'fade-in', name: 'Fade In', category: 'In', defaultDuration: 0.6, compute: (p) => ({ opacity: p }) },
  'zoom-in': { id: 'zoom-in', name: 'Zoom In', category: 'In', defaultDuration: 0.6, compute: (p) => ({ scale: 0.2 + 0.8 * p, opacity: p }) },
  'zoom-out-in': { id: 'zoom-out-in', name: 'Zoom Out In', category: 'In', defaultDuration: 0.7, compute: (p) => ({ scale: 1.4 - 0.4 * p, opacity: p }) },
  'slide-left-in': { id: 'slide-left-in', name: 'Slide Left', category: 'In', defaultDuration: 0.6, compute: (p) => ({ x: (1 - p) * 300, opacity: p }) },
  'slide-right-in': { id: 'slide-right-in', name: 'Slide Right', category: 'In', defaultDuration: 0.6, compute: (p) => ({ x: -(1 - p) * 300, opacity: p }) },
  'slide-up-in': { id: 'slide-up-in', name: 'Slide Up', category: 'In', defaultDuration: 0.6, compute: (p) => ({ y: (1 - p) * 250, opacity: p }) },
  'slide-down-in': { id: 'slide-down-in', name: 'Slide Down', category: 'In', defaultDuration: 0.6, compute: (p) => ({ y: -(1 - p) * 250, opacity: p }) },
  'pop': { id: 'pop', name: 'Pop', category: 'In', defaultDuration: 0.5, compute: (p) => {
    const scale = p < 0.7 ? (p / 0.7) * 1.15 : 1.15 - ((p - 0.7) / 0.3) * 0.15;
    return { scale: Math.max(0.01, scale), opacity: Math.min(1, p * 1.5) };
  }},
  'bounce-in': { id: 'bounce-in', name: 'Bounce In', category: 'In', defaultDuration: 0.7, compute: (p) => {
    const spring = Math.sin(p * Math.PI * 1.5) * (1 - p);
    return { y: -spring * 45, scale: 0.4 + 0.6 * p, opacity: p };
  }},
  'spin-in': { id: 'spin-in', name: 'Spin In', category: 'In', defaultDuration: 0.6, compute: (p) => ({ rotation: (1 - p) * 360, scale: p, opacity: p }) },
  'flip-in': { id: 'flip-in', name: 'Flip In', category: 'In', defaultDuration: 0.6, compute: (p) => ({ scaleX: p, opacity: p }) },
  'swing-in': { id: 'swing-in', name: 'Swing In', category: 'In', defaultDuration: 0.6, compute: (p) => ({ rotation: Math.sin(p * Math.PI * 2) * 25 * (1 - p), opacity: p }) },
  'drop-in': { id: 'drop-in', name: 'Drop In', category: 'In', defaultDuration: 0.6, compute: (p) => ({ y: -(1 - p) * 400, scale: 0.8 + 0.2 * p, opacity: p }) },
  'rise-up': { id: 'rise-up', name: 'Rise Up', category: 'In', defaultDuration: 0.6, compute: (p) => ({ y: (1 - p) * 350, opacity: p }) },
  'blur-in': { id: 'blur-in', name: 'Blur In', category: 'In', defaultDuration: 0.6, compute: (p) => ({ blur: (1 - p) * 25, opacity: p }) },
  'glitch-in': { id: 'glitch-in', name: 'Glitch In', category: 'In', defaultDuration: 0.5, compute: (p) => ({ x: (Math.random() - 0.5) * 40 * (1 - p), opacity: p }) },
  'rgb-split-in': { id: 'rgb-split-in', name: 'RGB Split In', category: 'In', defaultDuration: 0.6, compute: (p) => ({ skewX: (1 - p) * 20, opacity: p }) },
  'wipe-left-in': { id: 'wipe-left-in', name: 'Wipe Left', category: 'In', defaultDuration: 0.6, compute: (p) => ({ clipProgress: p, opacity: 1 }) },
  'wipe-right-in': { id: 'wipe-right-in', name: 'Wipe Right', category: 'In', defaultDuration: 0.6, compute: (p) => ({ clipProgress: p, opacity: 1 }) },
  'wipe-up-in': { id: 'wipe-up-in', name: 'Wipe Up', category: 'In', defaultDuration: 0.6, compute: (p) => ({ clipProgress: p, opacity: 1 }) },
  'wipe-down-in': { id: 'wipe-down-in', name: 'Wipe Down', category: 'In', defaultDuration: 0.6, compute: (p) => ({ clipProgress: p, opacity: 1 }) },
  'circle-reveal': { id: 'circle-reveal', name: 'Circle Reveal', category: 'In', defaultDuration: 0.6, compute: (p) => ({ scale: p, opacity: 1 }) },
  'mask-reveal': { id: 'mask-reveal', name: 'Mask Reveal', category: 'In', defaultDuration: 0.6, compute: (p) => ({ clipProgress: p, opacity: 1 }) },
  'stretch-in': { id: 'stretch-in', name: 'Stretch In', category: 'In', defaultDuration: 0.6, compute: (p) => ({ scaleX: 0.2 + 0.8 * p, opacity: p }) },
  'skew-in': { id: 'skew-in', name: 'Skew In', category: 'In', defaultDuration: 0.6, compute: (p) => ({ skewX: (1 - p) * 45, opacity: p }) },
  'elastic-in': { id: 'elastic-in', name: 'Elastic In', category: 'In', defaultDuration: 0.7, compute: (p) => ({ scale: 1 + Math.sin(p * Math.PI * 4) * 0.3 * (1 - p), opacity: p }) },
  'wobble-in': { id: 'wobble-in', name: 'Wobble In', category: 'In', defaultDuration: 0.6, compute: (p) => ({ rotation: Math.sin(p * Math.PI * 5) * 15 * (1 - p), opacity: p }) },
  'shutter-in': { id: 'shutter-in', name: 'Shutter In', category: 'In', defaultDuration: 0.6, compute: (p) => ({ scaleY: p, opacity: p }) },
  'roll-in': { id: 'roll-in', name: 'Roll In', category: 'In', defaultDuration: 0.6, compute: (p) => ({ rotation: (1 - p) * 180, x: (1 - p) * -200, opacity: p }) },

  // --- OUT ANIMATIONS (28+) ---
  'fade-out': { id: 'fade-out', name: 'Fade Out', category: 'Out', defaultDuration: 0.6, compute: (p) => ({ opacity: 1 - p }) },
  'zoom-out': { id: 'zoom-out', name: 'Zoom Out', category: 'Out', defaultDuration: 0.6, compute: (p) => ({ scale: 1 - 0.7 * p, opacity: 1 - p }) },
  'zoom-in-out': { id: 'zoom-in-out', name: 'Zoom In Out', category: 'Out', defaultDuration: 0.7, compute: (p) => ({ scale: 1 + 0.5 * p, opacity: 1 - p }) },
  'slide-left-out': { id: 'slide-left-out', name: 'Slide Left', category: 'Out', defaultDuration: 0.6, compute: (p) => ({ x: -p * 300, opacity: 1 - p }) },
  'slide-right-out': { id: 'slide-right-out', name: 'Slide Right', category: 'Out', defaultDuration: 0.6, compute: (p) => ({ x: p * 300, opacity: 1 - p }) },
  'slide-up-out': { id: 'slide-up-out', name: 'Slide Up', category: 'Out', defaultDuration: 0.6, compute: (p) => ({ y: -p * 250, opacity: 1 - p }) },
  'slide-down-out': { id: 'slide-down-out', name: 'Slide Down', category: 'Out', defaultDuration: 0.6, compute: (p) => ({ y: p * 250, opacity: 1 - p }) },
  'shrink': { id: 'shrink', name: 'Shrink', category: 'Out', defaultDuration: 0.5, compute: (p) => ({ scale: Math.max(0.01, 1 - p), opacity: 1 - p }) },
  'bounce-out': { id: 'bounce-out', name: 'Bounce Out', category: 'Out', defaultDuration: 0.7, compute: (p) => ({ y: p * 50, scale: Math.max(0.01, 1 - p), opacity: 1 - p }) },
  'spin-out': { id: 'spin-out', name: 'Spin Out', category: 'Out', defaultDuration: 0.6, compute: (p) => ({ rotation: p * 360, scale: 1 - p, opacity: 1 - p }) },
  'flip-out': { id: 'flip-out', name: 'Flip Out', category: 'Out', defaultDuration: 0.6, compute: (p) => ({ scaleX: 1 - p, opacity: 1 - p }) },
  'fall-down': { id: 'fall-down', name: 'Fall Down', category: 'Out', defaultDuration: 0.6, compute: (p) => ({ y: p * 400, rotation: p * 45, opacity: 1 - p }) },
  'float-away': { id: 'float-away', name: 'Float Away', category: 'Out', defaultDuration: 0.7, compute: (p) => ({ y: -p * 300, scale: 1 + 0.3 * p, opacity: 1 - p }) },
  'blur-out': { id: 'blur-out', name: 'Blur Out', category: 'Out', defaultDuration: 0.6, compute: (p) => ({ blur: p * 25, opacity: 1 - p }) },
  'glitch-out': { id: 'glitch-out', name: 'Glitch Out', category: 'Out', defaultDuration: 0.5, compute: (p) => ({ x: (Math.random() - 0.5) * 40 * p, opacity: 1 - p }) },
  'rgb-split-out': { id: 'rgb-split-out', name: 'RGB Split Out', category: 'Out', defaultDuration: 0.6, compute: (p) => ({ skewX: p * 20, opacity: 1 - p }) },
  'wipe-left-out': { id: 'wipe-left-out', name: 'Wipe Left', category: 'Out', defaultDuration: 0.6, compute: (p) => ({ clipProgress: 1 - p, opacity: 1 }) },
  'wipe-right-out': { id: 'wipe-right-out', name: 'Wipe Right', category: 'Out', defaultDuration: 0.6, compute: (p) => ({ clipProgress: 1 - p, opacity: 1 }) },
  'wipe-up-out': { id: 'wipe-up-out', name: 'Wipe Up', category: 'Out', defaultDuration: 0.6, compute: (p) => ({ clipProgress: 1 - p, opacity: 1 }) },
  'wipe-down-out': { id: 'wipe-down-out', name: 'Wipe Down', category: 'Out', defaultDuration: 0.6, compute: (p) => ({ clipProgress: 1 - p, opacity: 1 }) },
  'circle-close': { id: 'circle-close', name: 'Circle Close', category: 'Out', defaultDuration: 0.6, compute: (p) => ({ scale: 1 - p, opacity: 1 }) },
  'mask-close': { id: 'mask-close', name: 'Mask Close', category: 'Out', defaultDuration: 0.6, compute: (p) => ({ clipProgress: 1 - p, opacity: 1 }) },
  'stretch-out': { id: 'stretch-out', name: 'Stretch Out', category: 'Out', defaultDuration: 0.6, compute: (p) => ({ scaleX: 1 - 0.8 * p, opacity: 1 - p }) },
  'skew-out': { id: 'skew-out', name: 'Skew Out', category: 'Out', defaultDuration: 0.6, compute: (p) => ({ skewX: p * 45, opacity: 1 - p }) },
  'dissolve': { id: 'dissolve', name: 'Dissolve', category: 'Out', defaultDuration: 0.6, compute: (p) => ({ opacity: 1 - p, blur: p * 10 }) },
  'shatter': { id: 'shatter', name: 'Shatter', category: 'Out', defaultDuration: 0.6, compute: (p) => ({ scale: 1 + p * 0.5, opacity: 1 - p, rotation: p * 15 }) },
  'roll-out': { id: 'roll-out', name: 'Roll Out', category: 'Out', defaultDuration: 0.6, compute: (p) => ({ rotation: p * 180, x: p * 200, opacity: 1 - p }) },
  'fall-off': { id: 'fall-off', name: 'Fall Off', category: 'Out', defaultDuration: 0.6, compute: (p) => ({ y: p * 300, rotation: p * 90, opacity: 1 - p }) },

  // --- LOOP / COMBO ANIMATIONS (24+) ---
  'pulse': { id: 'pulse', name: 'Pulse', category: 'Loop', defaultDuration: 1.0, compute: (t) => ({ scale: 1 + Math.sin(t * Math.PI * 4) * 0.08 }) },
  'heartbeat': { id: 'heartbeat', name: 'Heartbeat', category: 'Loop', defaultDuration: 0.8, compute: (t) => {
    const beat = Math.abs(Math.sin(t * Math.PI * 4));
    return { scale: 1 + beat * 0.12 };
  }},
  'float': { id: 'float', name: 'Float', category: 'Loop', defaultDuration: 2.0, compute: (t) => ({ y: Math.sin(t * Math.PI * 2) * 12 }) },
  'swing': { id: 'swing', name: 'Swing', category: 'Loop', defaultDuration: 1.5, compute: (t) => ({ rotation: Math.sin(t * Math.PI * 2) * 8 }) },
  'wobble': { id: 'wobble', name: 'Wobble', category: 'Loop', defaultDuration: 1.0, compute: (t) => ({ rotation: Math.sin(t * Math.PI * 6) * 5, x: Math.sin(t * Math.PI * 4) * 4 }) },
  'shake': { id: 'shake', name: 'Shake', category: 'Loop', defaultDuration: 0.5, compute: (t) => ({ x: (Math.sin(t * 40) * 6), rotation: (Math.cos(t * 30) * 2) }) },
  'jitter': { id: 'jitter', name: 'Jitter', category: 'Loop', defaultDuration: 0.4, compute: (t) => ({ x: (Math.random() - 0.5) * 8, y: (Math.random() - 0.5) * 8 }) },
  'spin-loop': { id: 'spin-loop', name: 'Spin Loop', category: 'Loop', defaultDuration: 3.0, compute: (t) => ({ rotation: (t * 360) % 360 }) },
  'wave': { id: 'wave', name: 'Wave', category: 'Loop', defaultDuration: 2.0, compute: (t) => ({ y: Math.sin(t * Math.PI * 2) * 10, rotation: Math.sin(t * Math.PI * 2) * 4 }) },
  'breathe': { id: 'breathe', name: 'Breathe', category: 'Loop', defaultDuration: 3.0, compute: (t) => ({ scale: 1 + Math.sin(t * Math.PI * 2) * 0.05 }) },
  'flicker': { id: 'flicker', name: 'Flicker', category: 'Loop', defaultDuration: 0.8, compute: (t) => ({ opacity: 0.5 + Math.random() * 0.5 }) },
  'blink': { id: 'blink', name: 'Blink', category: 'Loop', defaultDuration: 1.0, compute: (t) => ({ opacity: Math.sin(t * Math.PI * 4) > 0 ? 1 : 0.2 }) },
  'bounce-loop': { id: 'bounce-loop', name: 'Bounce Loop', category: 'Loop', defaultDuration: 1.0, compute: (t) => ({ y: -Math.abs(Math.sin(t * Math.PI * 2)) * 18 }) },
  'tilt': { id: 'tilt', name: 'Tilt', category: 'Loop', defaultDuration: 2.0, compute: (t) => ({ rotation: Math.sin(t * Math.PI * 2) * 6 }) },
  'sway': { id: 'sway', name: 'Sway', category: 'Loop', defaultDuration: 2.5, compute: (t) => ({ x: Math.sin(t * Math.PI * 2) * 15 }) },
  'zoom-loop': { id: 'zoom-loop', name: 'Zoom Loop', category: 'Loop', defaultDuration: 2.0, compute: (t) => ({ scale: 1 + Math.sin(t * Math.PI * 2) * 0.1 }) },
  'glitch-loop': { id: 'glitch-loop', name: 'Glitch Loop', category: 'Loop', defaultDuration: 1.0, compute: (t) => ({ x: Math.random() > 0.8 ? (Math.random() - 0.5) * 15 : 0 }) },
  'rubber-band': { id: 'rubber-band', name: 'Rubber Band', category: 'Loop', defaultDuration: 1.2, compute: (t) => {
    const s = Math.sin(t * Math.PI * 2);
    return { scaleX: 1 + s * 0.15, scaleY: 1 - s * 0.15 };
  }},
  'jelly': { id: 'jelly', name: 'Jelly', category: 'Loop', defaultDuration: 1.0, compute: (t) => {
    const s = Math.sin(t * Math.PI * 4);
    return { scaleX: 1 + s * 0.1, scaleY: 1 - s * 0.1 };
  }},
  'pendulum': { id: 'pendulum', name: 'Pendulum', category: 'Loop', defaultDuration: 2.0, compute: (t) => ({ rotation: Math.sin(t * Math.PI * 2) * 12 }) },
  'ken-burns': { id: 'ken-burns', name: 'Ken Burns', category: 'Loop', defaultDuration: 5.0, compute: (t) => ({ scale: 1 + t * 0.15, x: t * 20 }) },
  'flash': { id: 'flash', name: 'Flash', category: 'Loop', defaultDuration: 1.0, compute: (t) => ({ opacity: Math.sin(t * Math.PI * 6) > 0.5 ? 1 : 0.4 }) },
  'color-shift': { id: 'color-shift', name: 'Color Shift', category: 'Loop', defaultDuration: 3.0, compute: (t) => ({ hueRotate: (t * 360) % 360 }) },
  'wave-pulse': { id: 'wave-pulse', name: 'Wave Pulse', category: 'Loop', defaultDuration: 2.0, compute: (t) => ({ scale: 1 + Math.sin(t * Math.PI * 2) * 0.08, y: Math.cos(t * Math.PI * 2) * 6 }) },

  // --- TEXT ANIMATIONS (20+, supporting per-character/word/line) ---
  'typewriter': { id: 'typewriter', name: 'Typewriter', category: 'Text', defaultDuration: 1.5, typeMode: 'character', compute: (p, idx, total) => ({ revealRatio: Math.min(1, p * (total * 0.8 + 2)) }) },
  'letter-pop': { id: 'letter-pop', name: 'Letter Pop', category: 'Text', defaultDuration: 1.0, typeMode: 'character', compute: (p, idx, total) => ({ scale: Math.min(1, Math.max(0, (p * total - idx) * 2)), opacity: Math.min(1, (p * total - idx) * 2) }) },
  'letter-slide-up': { id: 'letter-slide-up', name: 'Letter Slide Up', category: 'Text', defaultDuration: 1.0, typeMode: 'character', compute: (p, idx, total) => ({ y: (1 - Math.min(1, Math.max(0, (p * total - idx) * 2))) * 30, opacity: Math.min(1, (p * total - idx) * 2) }) },
  'letter-fade': { id: 'letter-fade', name: 'Letter Fade', category: 'Text', defaultDuration: 1.0, typeMode: 'character', compute: (p, idx, total) => ({ opacity: Math.min(1, Math.max(0, (p * total - idx) * 2)) }) },
  'word-pop': { id: 'word-pop', name: 'Word Pop', category: 'Text', defaultDuration: 1.0, typeMode: 'word', compute: (p, idx, total) => ({ scale: Math.min(1, Math.max(0, (p * total - idx) * 2)), opacity: Math.min(1, (p * total - idx) * 2) }) },
  'word-slide': { id: 'word-slide', name: 'Word Slide', category: 'Text', defaultDuration: 1.0, typeMode: 'word', compute: (p, idx, total) => ({ y: (1 - Math.min(1, Math.max(0, (p * total - idx) * 2))) * 40, opacity: Math.min(1, (p * total - idx) * 2) }) },
  'wave-text': { id: 'wave-text', name: 'Wave Text', category: 'Text', defaultDuration: 1.5, typeMode: 'character', compute: (p, idx, total) => ({ y: Math.sin(p * Math.PI * 4 + idx * 0.5) * 15 }) },
  'bounce-letters': { id: 'bounce-letters', name: 'Bounce Letters', category: 'Text', defaultDuration: 1.2, typeMode: 'character', compute: (p, idx, total) => ({ y: -Math.abs(Math.sin(p * Math.PI * 3 + idx * 0.4)) * 20 }) },
  'scatter-in': { id: 'scatter-in', name: 'Scatter In', category: 'Text', defaultDuration: 1.0, typeMode: 'character', compute: (p, idx, total) => ({ x: (Math.sin(idx) * 100) * (1 - p), y: (Math.cos(idx) * 100) * (1 - p), opacity: p }) },
  'random-fade': { id: 'random-fade', name: 'Random Fade', category: 'Text', defaultDuration: 1.0, typeMode: 'character', compute: (p, idx, total) => ({ opacity: Math.min(1, p * 1.5 + (idx % 3) * 0.1) }) },
  'blur-reveal': { id: 'blur-reveal', name: 'Blur Reveal', category: 'Text', defaultDuration: 1.0, typeMode: 'line', compute: (p) => ({ blur: (1 - p) * 15, opacity: p }) },
  'mask-reveal-lr': { id: 'mask-reveal-lr', name: 'Mask Reveal LR', category: 'Text', defaultDuration: 1.0, typeMode: 'line', compute: (p) => ({ clipProgress: p, opacity: 1 }) },
  'glitch-text': { id: 'glitch-text', name: 'Glitch Text', category: 'Text', defaultDuration: 0.8, typeMode: 'character', compute: (p, idx) => ({ x: Math.sin(p * 20 + idx) * 6 }) },
  'neon-flicker': { id: 'neon-flicker', name: 'Neon Flicker', category: 'Text', defaultDuration: 1.0, typeMode: 'line', compute: (p) => ({ opacity: Math.sin(p * Math.PI * 8) > 0 ? 1 : 0.6 }) },
  'tracking-in': { id: 'tracking-in', name: 'Tracking In', category: 'Text', defaultDuration: 1.0, typeMode: 'character', compute: (p) => ({ scale: 0.8 + 0.2 * p, opacity: p }) },
  'rotate-words': { id: 'rotate-words', name: 'Rotate Words', category: 'Text', defaultDuration: 1.0, typeMode: 'word', compute: (p, idx, total) => ({ rotation: (1 - Math.min(1, Math.max(0, (p * total - idx) * 2))) * 90, opacity: p }) },
  'flip-words': { id: 'flip-words', name: 'Flip Words', category: 'Text', defaultDuration: 1.0, typeMode: 'word', compute: (p, idx, total) => ({ scaleX: Math.min(1, Math.max(0, (p * total - idx) * 2)), opacity: p }) },
  'karaoke': { id: 'karaoke', name: 'Karaoke Highlight', category: 'Text', defaultDuration: 2.0, typeMode: 'word', compute: (p, idx, total) => ({ highlight: p * total >= idx && p * total <= idx + 1 }) },
  'underline-draw': { id: 'underline-draw', name: 'Underline Draw', category: 'Text', defaultDuration: 1.0, typeMode: 'line', compute: (p) => ({ lineProgress: p }) },
  'strikethrough-draw': { id: 'strikethrough-draw', name: 'Strikethrough', category: 'Text', defaultDuration: 1.0, typeMode: 'line', compute: (p) => ({ lineProgress: p }) },
  'highlighter-sweep': { id: 'highlighter-sweep', name: 'Highlighter Sweep', category: 'Text', defaultDuration: 1.0, typeMode: 'line', compute: (p) => ({ highlightProgress: p }) },
  'count-up': { id: 'count-up', name: 'Count Up Numbers', category: 'Text', defaultDuration: 1.5, typeMode: 'line', compute: (p) => ({ progress: p }) }
};

export const ANIMATIONS_LIST = Object.values(ANIMATIONS_REGISTRY);
