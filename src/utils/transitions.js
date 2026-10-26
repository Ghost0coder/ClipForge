/**
 * ClipForge - Comprehensive Transitions System
 * Data-driven registry with 100+ production-grade Canvas 2D transitions.
 * Supports Direction, Easing, Overlap Compositing, Live Preview, and MP4 Export.
 */

// Easing Functions
export function applyEasing(t, easing = 'easeInOut') {
  const clamped = Math.max(0, Math.min(1, t));
  switch (easing) {
    case 'linear':
      return clamped;
    case 'easeIn':
      return clamped * clamped;
    case 'easeOut':
      return 1 - (1 - clamped) * (1 - clamped);
    case 'easeInOut':
      return clamped < 0.5
        ? 2 * clamped * clamped
        : 1 - Math.pow(-2 * clamped + 2, 2) / 2;
    case 'bounce': {
      const n1 = 7.5625;
      const d1 = 2.75;
      let x = clamped;
      if (x < 1 / d1) {
        return n1 * x * x;
      } else if (x < 2 / d1) {
        x -= 1.5 / d1;
        return n1 * x * x + 0.75;
      } else if (x < 2.5 / d1) {
        x -= 2.25 / d1;
        return n1 * x * x + 0.9375;
      } else {
        x -= 2.625 / d1;
        return n1 * x * x + 0.984375;
      }
    }
    case 'elastic': {
      if (clamped === 0) return 0;
      if (clamped === 1) return 1;
      const p = 0.3;
      return Math.pow(2, -10 * clamped) * Math.sin(((clamped - p / 4) * (2 * Math.PI)) / p) + 1;
    }
    default:
      return clamped < 0.5 ? 2 * clamped * clamped : 1 - Math.pow(-2 * clamped + 2, 2) / 2;
  }
}

// Shape Drawing Utilities for Procedural Wipe Masks
function drawStarPath(ctx, cx, cy, spikes, outerRadius, innerRadius) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
}

function drawHeartPath(ctx, cx, cy, size) {
  ctx.beginPath();
  const topCurveHeight = size * 0.3;
  ctx.moveTo(cx, cy + size * 0.35);
  // top left curve
  ctx.bezierCurveTo(
    cx - size * 0.5,
    cy - size * 0.3,
    cx - size * 0.5,
    cy - size * 0.65,
    cx,
    cy - size * 0.25
  );
  // top right curve
  ctx.bezierCurveTo(
    cx + size * 0.5,
    cy - size * 0.65,
    cx + size * 0.5,
    cy - size * 0.3,
    cx,
    cy + size * 0.35
  );
  ctx.closePath();
}

// Helper: safe draw image with clipping bounds
function drawFrame(ctx, source, x = 0, y = 0, w, h) {
  if (!source) return;
  try {
    ctx.drawImage(source, x, y, w, h);
  } catch (e) {}
}

/**
 * MASTER TRANSITION REGISTRY
 * Each transition contains:
 *  - id: unique identifier
 *  - name: friendly label
 *  - category: grouping
 *  - defaultDuration: default seconds
 *  - icon: descriptive icon indicator
 *  - directions: optional supported directions (e.g. ['left', 'right', 'up', 'down'])
 *  - render: (ctx, outCanvas, inCanvas, p, w, h, opts) => void
 */
export const TRANSITIONS_REGISTRY = {
  // ==========================================
  // 1. BASIC TRANSITIONS
  // ==========================================
  'fade': {
    id: 'fade',
    name: 'Fade',
    category: 'Basic',
    defaultDuration: 0.6,
    icon: 'Moon',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      ctx.save();
      ctx.globalAlpha = p;
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  'dissolve': {
    id: 'dissolve',
    name: 'Cross Dissolve',
    category: 'Basic',
    defaultDuration: 0.7,
    icon: 'Blend',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      ctx.save();
      ctx.globalAlpha = 1 - p;
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = p;
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  'fade-black': {
    id: 'fade-black',
    name: 'Fade through Black',
    category: 'Basic',
    defaultDuration: 0.8,
    icon: 'Moon',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      if (p < 0.5) {
        const outAlpha = 1 - p * 2;
        ctx.save();
        ctx.globalAlpha = outAlpha;
        drawFrame(ctx, outCanvas, 0, 0, w, h);
        ctx.restore();
      } else {
        const inAlpha = (p - 0.5) * 2;
        ctx.save();
        ctx.globalAlpha = inAlpha;
        drawFrame(ctx, inCanvas, 0, 0, w, h);
        ctx.restore();
      }
    },
  },

  'fade-white': {
    id: 'fade-white',
    name: 'Fade through White',
    category: 'Basic',
    defaultDuration: 0.8,
    icon: 'Sun',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      if (p < 0.5) {
        const outP = p * 2;
        drawFrame(ctx, outCanvas, 0, 0, w, h);
        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${outP})`;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      } else {
        const inP = (1 - p) * 2;
        drawFrame(ctx, inCanvas, 0, 0, w, h);
        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${inP})`;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }
    },
  },

  'cross-blur': {
    id: 'cross-blur',
    name: 'Cross Blur',
    category: 'Basic',
    defaultDuration: 0.7,
    icon: 'EyeOff',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      const blurPx = Math.sin(p * Math.PI) * 22;
      ctx.save();
      if (blurPx > 0.5) ctx.filter = `blur(${blurPx.toFixed(1)}px)`;
      ctx.globalAlpha = 1 - p;
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      ctx.restore();

      ctx.save();
      if (blurPx > 0.5) ctx.filter = `blur(${blurPx.toFixed(1)}px)`;
      ctx.globalAlpha = p;
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  'dip-color': {
    id: 'dip-color',
    name: 'Dip to Color',
    category: 'Basic',
    defaultDuration: 0.8,
    icon: 'Palette',
    render: (ctx, outCanvas, inCanvas, p, w, h, opts) => {
      const color = opts?.color || '#0f172a';
      if (p < 0.5) {
        drawFrame(ctx, outCanvas, 0, 0, w, h);
        ctx.save();
        ctx.globalAlpha = p * 2;
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      } else {
        drawFrame(ctx, inCanvas, 0, 0, w, h);
        ctx.save();
        ctx.globalAlpha = (1 - p) * 2;
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }
    },
  },

  // ==========================================
  // 2. SLIDE AND PUSH
  // ==========================================
  'slide-left': {
    id: 'slide-left',
    name: 'Slide Left',
    category: 'Slide and push',
    defaultDuration: 0.5,
    icon: 'ArrowLeft',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      drawFrame(ctx, inCanvas, w * (1 - p), 0, w, h);
    },
  },

  'slide-right': {
    id: 'slide-right',
    name: 'Slide Right',
    category: 'Slide and push',
    defaultDuration: 0.5,
    icon: 'ArrowRight',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      drawFrame(ctx, inCanvas, -w * (1 - p), 0, w, h);
    },
  },

  'slide-up': {
    id: 'slide-up',
    name: 'Slide Up',
    category: 'Slide and push',
    defaultDuration: 0.5,
    icon: 'ArrowUp',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      drawFrame(ctx, inCanvas, 0, h * (1 - p), w, h);
    },
  },

  'slide-down': {
    id: 'slide-down',
    name: 'Slide Down',
    category: 'Slide and push',
    defaultDuration: 0.5,
    icon: 'ArrowDown',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      drawFrame(ctx, inCanvas, 0, -h * (1 - p), w, h);
    },
  },

  'push-left': {
    id: 'push-left',
    name: 'Push Left',
    category: 'Slide and push',
    defaultDuration: 0.5,
    icon: 'MoveLeft',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, -w * p, 0, w, h);
      drawFrame(ctx, inCanvas, w * (1 - p), 0, w, h);
    },
  },

  'push-right': {
    id: 'push-right',
    name: 'Push Right',
    category: 'Slide and push',
    defaultDuration: 0.5,
    icon: 'MoveRight',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, w * p, 0, w, h);
      drawFrame(ctx, inCanvas, -w * (1 - p), 0, w, h);
    },
  },

  'push-up': {
    id: 'push-up',
    name: 'Push Up',
    category: 'Slide and push',
    defaultDuration: 0.5,
    icon: 'MoveUp',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, 0, -h * p, w, h);
      drawFrame(ctx, inCanvas, 0, h * (1 - p), w, h);
    },
  },

  'push-down': {
    id: 'push-down',
    name: 'Push Down',
    category: 'Slide and push',
    defaultDuration: 0.5,
    icon: 'MoveDown',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, 0, h * p, w, h);
      drawFrame(ctx, inCanvas, 0, -h * (1 - p), w, h);
    },
  },

  'cover-left': {
    id: 'cover-left',
    name: 'Cover Left',
    category: 'Slide and push',
    defaultDuration: 0.5,
    icon: 'ChevronsLeft',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetX = -10;
      drawFrame(ctx, inCanvas, w * (1 - p), 0, w, h);
      ctx.restore();
    },
  },

  'cover-right': {
    id: 'cover-right',
    name: 'Cover Right',
    category: 'Slide and push',
    defaultDuration: 0.5,
    icon: 'ChevronsRight',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetX = 10;
      drawFrame(ctx, inCanvas, -w * (1 - p), 0, w, h);
      ctx.restore();
    },
  },

  'reveal-left': {
    id: 'reveal-left',
    name: 'Reveal Left',
    category: 'Slide and push',
    defaultDuration: 0.5,
    icon: 'Eye',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = -8;
      drawFrame(ctx, outCanvas, -w * p, 0, w, h);
      ctx.restore();
    },
  },

  'reveal-right': {
    id: 'reveal-right',
    name: 'Reveal Right',
    category: 'Slide and push',
    defaultDuration: 0.5,
    icon: 'Eye',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 8;
      drawFrame(ctx, outCanvas, w * p, 0, w, h);
      ctx.restore();
    },
  },

  'stack-up': {
    id: 'stack-up',
    name: 'Stack Up',
    category: 'Slide and push',
    defaultDuration: 0.6,
    icon: 'Layers',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      const outScale = 1 - 0.15 * p;
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(outScale, outScale);
      ctx.translate(-w / 2, -h / 2);
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      ctx.restore();

      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = -10;
      drawFrame(ctx, inCanvas, 0, h * (1 - p), w, h);
      ctx.restore();
    },
  },

  'stack-down': {
    id: 'stack-down',
    name: 'Stack Down',
    category: 'Slide and push',
    defaultDuration: 0.6,
    icon: 'Layers',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      const outScale = 1 - 0.15 * p;
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(outScale, outScale);
      ctx.translate(-w / 2, -h / 2);
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      ctx.restore();

      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 10;
      drawFrame(ctx, inCanvas, 0, -h * (1 - p), w, h);
      ctx.restore();
    },
  },

  'split-slide-h': {
    id: 'split-slide-h',
    name: 'Split Slide Horizontal',
    category: 'Slide and push',
    defaultDuration: 0.6,
    icon: 'Columns',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      const offset = (w / 2) * p;
      // Left half
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w / 2, h);
      ctx.clip();
      drawFrame(ctx, outCanvas, -offset, 0, w, h);
      ctx.restore();
      // Right half
      ctx.save();
      ctx.beginPath();
      ctx.rect(w / 2, 0, w / 2, h);
      ctx.clip();
      drawFrame(ctx, outCanvas, offset, 0, w, h);
      ctx.restore();
    },
  },

  'split-slide-v': {
    id: 'split-slide-v',
    name: 'Split Slide Vertical',
    category: 'Slide and push',
    defaultDuration: 0.6,
    icon: 'Rows',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      const offset = (h / 2) * p;
      // Top half
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, h / 2);
      ctx.clip();
      drawFrame(ctx, outCanvas, 0, -offset, w, h);
      ctx.restore();
      // Bottom half
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, h / 2, w, h / 2);
      ctx.clip();
      drawFrame(ctx, outCanvas, 0, offset, w, h);
      ctx.restore();
    },
  },

  // ==========================================
  // 3. ZOOM TRANSITIONS
  // ==========================================
  'zoom-in': {
    id: 'zoom-in',
    name: 'Zoom In',
    category: 'Zoom',
    defaultDuration: 0.5,
    icon: 'ZoomIn',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      const inScale = 0.5 + 0.5 * p;
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      ctx.save();
      ctx.globalAlpha = p;
      ctx.translate(w / 2, h / 2);
      ctx.scale(inScale, inScale);
      ctx.translate(-w / 2, -h / 2);
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  'zoom-out': {
    id: 'zoom-out',
    name: 'Zoom Out',
    category: 'Zoom',
    defaultDuration: 0.5,
    icon: 'ZoomOut',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      const outScale = 1 + 0.5 * p;
      const inScale = 1.3 - 0.3 * p;
      ctx.save();
      ctx.globalAlpha = 1 - p;
      ctx.translate(w / 2, h / 2);
      ctx.scale(outScale, outScale);
      ctx.translate(-w / 2, -h / 2);
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = p;
      ctx.translate(w / 2, h / 2);
      ctx.scale(inScale, inScale);
      ctx.translate(-w / 2, -h / 2);
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  'zoom-blur': {
    id: 'zoom-blur',
    name: 'Zoom Blur',
    category: 'Zoom',
    defaultDuration: 0.6,
    icon: 'Maximize2',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      const peak = Math.sin(p * Math.PI);
      const blurPx = peak * 24;
      const scale = 1 + peak * 0.35;

      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(scale, scale);
      ctx.translate(-w / 2, -h / 2);
      if (blurPx > 0.5) ctx.filter = `blur(${blurPx.toFixed(1)}px)`;

      if (p < 0.5) {
        ctx.globalAlpha = 1 - p * 0.5;
        drawFrame(ctx, outCanvas, 0, 0, w, h);
      } else {
        ctx.globalAlpha = 0.5 + (p - 0.5);
        drawFrame(ctx, inCanvas, 0, 0, w, h);
      }
      ctx.restore();
    },
  },

  'punch-in': {
    id: 'punch-in',
    name: 'Punch In',
    category: 'Zoom',
    defaultDuration: 0.45,
    icon: 'Crosshair',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      if (p < 0.4) {
        const outP = p / 0.4;
        const scale = 1 + outP * 0.6;
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.scale(scale, scale);
        ctx.translate(-w / 2, -h / 2);
        drawFrame(ctx, outCanvas, 0, 0, w, h);
        ctx.restore();
      } else {
        const inP = (p - 0.4) / 0.6;
        const scale = 1.3 - 0.3 * inP;
        ctx.save();
        ctx.globalAlpha = Math.min(1, inP * 1.5);
        ctx.translate(w / 2, h / 2);
        ctx.scale(scale, scale);
        ctx.translate(-w / 2, -h / 2);
        drawFrame(ctx, inCanvas, 0, 0, w, h);
        ctx.restore();
      }
    },
  },

  'whip-zoom': {
    id: 'whip-zoom',
    name: 'Whip Zoom',
    category: 'Zoom',
    defaultDuration: 0.5,
    icon: 'Zap',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      const zoom = 1 + Math.sin(p * Math.PI) * 1.2;
      const angle = (Math.sin(p * Math.PI) * 15 * Math.PI) / 180;
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(angle);
      ctx.scale(zoom, zoom);
      ctx.translate(-w / 2, -h / 2);
      if (p < 0.5) {
        drawFrame(ctx, outCanvas, 0, 0, w, h);
      } else {
        drawFrame(ctx, inCanvas, 0, 0, w, h);
      }
      ctx.restore();
    },
  },

  'dolly-in': {
    id: 'dolly-in',
    name: 'Dolly In',
    category: 'Zoom',
    defaultDuration: 0.7,
    icon: 'Maximize',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      const outScale = 1 + p * 0.8;
      const inScale = 0.7 + 0.3 * p;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - p * 1.2);
      ctx.translate(w / 2, h / 2);
      ctx.scale(outScale, outScale);
      ctx.translate(-w / 2, -h / 2);
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = Math.min(1, p * 1.5);
      ctx.translate(w / 2, h / 2);
      ctx.scale(inScale, inScale);
      ctx.translate(-w / 2, -h / 2);
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  'dolly-out': {
    id: 'dolly-out',
    name: 'Dolly Out',
    category: 'Zoom',
    defaultDuration: 0.7,
    icon: 'Minimize',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      const outScale = 1 - p * 0.4;
      const inScale = 1.6 - 0.6 * p;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - p * 1.2);
      ctx.translate(w / 2, h / 2);
      ctx.scale(outScale, outScale);
      ctx.translate(-w / 2, -h / 2);
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = Math.min(1, p * 1.5);
      ctx.translate(w / 2, h / 2);
      ctx.scale(inScale, inScale);
      ctx.translate(-w / 2, -h / 2);
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  'cross-zoom': {
    id: 'cross-zoom',
    name: 'Cross Zoom',
    category: 'Zoom',
    defaultDuration: 0.6,
    icon: 'Maximize2',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      const scaleA = 1 + p * 1.0;
      const scaleB = 0.3 + p * 0.7;
      ctx.save();
      ctx.globalAlpha = 1 - p;
      ctx.translate(w / 2, h / 2);
      ctx.scale(scaleA, scaleA);
      ctx.translate(-w / 2, -h / 2);
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = p;
      ctx.translate(w / 2, h / 2);
      ctx.scale(scaleB, scaleB);
      ctx.translate(-w / 2, -h / 2);
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  'spin-zoom-in': {
    id: 'spin-zoom-in',
    name: 'Spin Zoom In',
    category: 'Zoom',
    defaultDuration: 0.65,
    icon: 'RotateCw',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      const angle = (1 - p) * Math.PI * 1.5;
      const scale = 0.3 + 0.7 * p;
      ctx.save();
      ctx.globalAlpha = p;
      ctx.translate(w / 2, h / 2);
      ctx.rotate(angle);
      ctx.scale(scale, scale);
      ctx.translate(-w / 2, -h / 2);
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  'spin-zoom-out': {
    id: 'spin-zoom-out',
    name: 'Spin Zoom Out',
    category: 'Zoom',
    defaultDuration: 0.65,
    icon: 'RotateCcw',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      const angle = p * Math.PI * 1.5;
      const scale = 1 - 0.7 * p;
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.save();
      ctx.globalAlpha = 1 - p;
      ctx.translate(w / 2, h / 2);
      ctx.rotate(angle);
      ctx.scale(scale, scale);
      ctx.translate(-w / 2, -h / 2);
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  // ==========================================
  // 4. WIPE TRANSITIONS
  // ==========================================
  'wipe-left': {
    id: 'wipe-left',
    name: 'Linear Wipe Left',
    category: 'Wipe',
    defaultDuration: 0.5,
    icon: 'ChevronsLeft',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w * p, h);
      ctx.clip();
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  'wipe-right': {
    id: 'wipe-right',
    name: 'Linear Wipe Right',
    category: 'Wipe',
    defaultDuration: 0.5,
    icon: 'ChevronsRight',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      ctx.save();
      ctx.beginPath();
      ctx.rect(w * (1 - p), 0, w * p, h);
      ctx.clip();
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  'wipe-up': {
    id: 'wipe-up',
    name: 'Linear Wipe Up',
    category: 'Wipe',
    defaultDuration: 0.5,
    icon: 'ChevronsUp',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, h * (1 - p), w, h * p);
      ctx.clip();
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  'wipe-down': {
    id: 'wipe-down',
    name: 'Linear Wipe Down',
    category: 'Wipe',
    defaultDuration: 0.5,
    icon: 'ChevronsDown',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, h * p);
      ctx.clip();
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  'diagonal-tl': {
    id: 'diagonal-tl',
    name: 'Diagonal Top-Left',
    category: 'Wipe',
    defaultDuration: 0.6,
    icon: 'ArrowUpLeft',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      ctx.save();
      ctx.beginPath();
      const extent = (w + h) * p;
      ctx.moveTo(0, 0);
      ctx.lineTo(extent, 0);
      ctx.lineTo(0, extent);
      ctx.closePath();
      ctx.clip();
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  'diagonal-br': {
    id: 'diagonal-br',
    name: 'Diagonal Bottom-Right',
    category: 'Wipe',
    defaultDuration: 0.6,
    icon: 'ArrowDownRight',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      ctx.save();
      ctx.beginPath();
      const extent = (w + h) * p;
      ctx.moveTo(w, h);
      ctx.lineTo(w - extent, h);
      ctx.lineTo(w, h - extent);
      ctx.closePath();
      ctx.clip();
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  'clock-wipe': {
    id: 'clock-wipe',
    name: 'Clock Wipe',
    category: 'Wipe',
    defaultDuration: 0.7,
    icon: 'Clock',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(w / 2, h / 2);
      ctx.arc(
        w / 2,
        h / 2,
        Math.hypot(w, h),
        -Math.PI / 2,
        -Math.PI / 2 + p * Math.PI * 2,
        false
      );
      ctx.closePath();
      ctx.clip();
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  'radial-wipe': {
    id: 'radial-wipe',
    name: 'Radial Wipe',
    category: 'Wipe',
    defaultDuration: 0.7,
    icon: 'PieChart',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(w / 2, h / 2);
      const halfAngle = p * Math.PI;
      ctx.arc(w / 2, h / 2, Math.hypot(w, h), -halfAngle, halfAngle, false);
      ctx.closePath();
      ctx.clip();
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  'barn-door-h': {
    id: 'barn-door-h',
    name: 'Barn Door Horizontal',
    category: 'Wipe',
    defaultDuration: 0.6,
    icon: 'Split',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      const openW = (w / 2) * p;
      ctx.save();
      ctx.beginPath();
      ctx.rect(w / 2 - openW, 0, openW * 2, h);
      ctx.clip();
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  'barn-door-v': {
    id: 'barn-door-v',
    name: 'Barn Door Vertical',
    category: 'Wipe',
    defaultDuration: 0.6,
    icon: 'Split',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      const openH = (h / 2) * p;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, h / 2 - openH, w, openH * 2);
      ctx.clip();
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  'iris-circle-in': {
    id: 'iris-circle-in',
    name: 'Iris Circle In',
    category: 'Wipe',
    defaultDuration: 0.65,
    icon: 'Circle',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      const maxR = Math.hypot(w, h) / 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, maxR * p, 0, Math.PI * 2);
      ctx.clip();
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  'iris-circle-out': {
    id: 'iris-circle-out',
    name: 'Iris Circle Out',
    category: 'Wipe',
    defaultDuration: 0.65,
    icon: 'CircleDot',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      const maxR = Math.hypot(w, h) / 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, maxR * (1 - p), 0, Math.PI * 2);
      ctx.clip();
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  'diamond-wipe': {
    id: 'diamond-wipe',
    name: 'Diamond Wipe',
    category: 'Wipe',
    defaultDuration: 0.65,
    icon: 'Square',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      const size = Math.hypot(w, h) * p;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(w / 2, h / 2 - size);
      ctx.lineTo(w / 2 + size, h / 2);
      ctx.lineTo(w / 2, h / 2 + size);
      ctx.lineTo(w / 2 - size, h / 2);
      ctx.closePath();
      ctx.clip();
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  'heart-wipe': {
    id: 'heart-wipe',
    name: 'Heart Wipe',
    category: 'Wipe',
    defaultDuration: 0.7,
    icon: 'Heart',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      const size = Math.hypot(w, h) * p * 1.5;
      ctx.save();
      drawHeartPath(ctx, w / 2, h / 2, size);
      ctx.clip();
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  'star-wipe': {
    id: 'star-wipe',
    name: 'Star Wipe',
    category: 'Wipe',
    defaultDuration: 0.7,
    icon: 'Star',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      const maxR = Math.hypot(w, h) * p;
      ctx.save();
      drawStarPath(ctx, w / 2, h / 2, 5, maxR, maxR * 0.45);
      ctx.clip();
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  'blinds-h': {
    id: 'blinds-h',
    name: 'Blinds Horizontal',
    category: 'Wipe',
    defaultDuration: 0.6,
    icon: 'Menu',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      const strips = 8;
      const stripH = h / strips;
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < strips; i++) {
        ctx.rect(0, i * stripH, w, stripH * p);
      }
      ctx.clip();
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  'blinds-v': {
    id: 'blinds-v',
    name: 'Blinds Vertical',
    category: 'Wipe',
    defaultDuration: 0.6,
    icon: 'Columns',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      const strips = 10;
      const stripW = w / strips;
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < strips; i++) {
        ctx.rect(i * stripW, 0, stripW * p, h);
      }
      ctx.clip();
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  'checkerboard': {
    id: 'checkerboard',
    name: 'Checkerboard',
    category: 'Wipe',
    defaultDuration: 0.7,
    icon: 'Grid',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      const cols = 8;
      const rows = 5;
      const cellW = w / cols;
      const cellH = h / rows;
      ctx.save();
      ctx.beginPath();
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const delay = (r + c) / (rows + cols);
          const cellP = Math.max(0, Math.min(1, (p - delay * 0.4) / 0.6));
          if (cellP > 0) {
            const curW = cellW * cellP;
            const curH = cellH * cellP;
            ctx.rect(c * cellW + (cellW - curW) / 2, r * cellH + (cellH - curH) / 2, curW, curH);
          }
        }
      }
      ctx.clip();
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  'zigzag-wipe': {
    id: 'zigzag-wipe',
    name: 'Zigzag Wipe',
    category: 'Wipe',
    defaultDuration: 0.65,
    icon: 'Activity',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      const toothCount = 8;
      const toothH = h / toothCount;
      const toothW = 40;
      const sweepX = (w + toothW) * p;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let i = 0; i <= toothCount; i++) {
        const y = i * toothH;
        const xOffset = i % 2 === 0 ? toothW : 0;
        ctx.lineTo(sweepX - xOffset, y);
      }
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.clip();
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  'curtain-open': {
    id: 'curtain-open',
    name: 'Curtain Open',
    category: 'Wipe',
    defaultDuration: 0.7,
    icon: 'Maximize2',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      const split = (w / 2) * p;
      // Left curtain
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w / 2 - split, h);
      ctx.clip();
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      ctx.restore();
      // Right curtain
      ctx.save();
      ctx.beginPath();
      ctx.rect(w / 2 + split, 0, w / 2 - split, h);
      ctx.clip();
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  'curtain-close': {
    id: 'curtain-close',
    name: 'Curtain Close',
    category: 'Wipe',
    defaultDuration: 0.7,
    icon: 'Minimize2',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      const inW = (w / 2) * p;
      // Left incoming curtain
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, inW, h);
      ctx.clip();
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();
      // Right incoming curtain
      ctx.save();
      ctx.beginPath();
      ctx.rect(w - inW, 0, inW, h);
      ctx.clip();
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  // ==========================================
  // 5. SPIN AND 3D
  // ==========================================
  'spin-cw': {
    id: 'spin-cw',
    name: 'Spin Clockwise',
    category: 'Spin and 3D',
    defaultDuration: 0.65,
    icon: 'RotateCw',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      const angle = p * Math.PI * 2;
      const scale = 1 - Math.sin(p * Math.PI) * 0.4;
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(angle);
      ctx.scale(scale, scale);
      ctx.translate(-w / 2, -h / 2);
      if (p < 0.5) {
        drawFrame(ctx, outCanvas, 0, 0, w, h);
      } else {
        drawFrame(ctx, inCanvas, 0, 0, w, h);
      }
      ctx.restore();
    },
  },

  'spin-ccw': {
    id: 'spin-ccw',
    name: 'Spin Counter-Clockwise',
    category: 'Spin and 3D',
    defaultDuration: 0.65,
    icon: 'RotateCcw',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      const angle = -p * Math.PI * 2;
      const scale = 1 - Math.sin(p * Math.PI) * 0.4;
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(angle);
      ctx.scale(scale, scale);
      ctx.translate(-w / 2, -h / 2);
      if (p < 0.5) {
        drawFrame(ctx, outCanvas, 0, 0, w, h);
      } else {
        drawFrame(ctx, inCanvas, 0, 0, w, h);
      }
      ctx.restore();
    },
  },

  'rotate-zoom': {
    id: 'rotate-zoom',
    name: 'Rotate Zoom',
    category: 'Spin and 3D',
    defaultDuration: 0.7,
    icon: 'Compass',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      const angle = (p - 0.5) * Math.PI * 0.6;
      const scale = 1 + Math.sin(p * Math.PI) * 0.7;
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(angle);
      ctx.scale(scale, scale);
      ctx.translate(-w / 2, -h / 2);
      if (p < 0.5) {
        drawFrame(ctx, outCanvas, 0, 0, w, h);
      } else {
        drawFrame(ctx, inCanvas, 0, 0, w, h);
      }
      ctx.restore();
    },
  },

  'cube-left': {
    id: 'cube-left',
    name: '3D Cube Left',
    category: 'Spin and 3D',
    defaultDuration: 0.7,
    icon: 'Box',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      // 3D Isometric projection approximation
      const outWidth = w * (1 - p);
      const inWidth = w * p;
      // Outgoing face
      ctx.save();
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.transform(1 - p, 0, 0, 1 - p * 0.2, 0, (h * p * 0.2) / 2);
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      ctx.fillStyle = `rgba(0,0,0,${p * 0.6})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
      // Incoming face
      ctx.save();
      ctx.transform(p, 0, 0, 1 - (1 - p) * 0.2, outWidth, (h * (1 - p) * 0.2) / 2);
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.fillStyle = `rgba(0,0,0,${(1 - p) * 0.6})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
      ctx.restore();
    },
  },

  'cube-right': {
    id: 'cube-right',
    name: '3D Cube Right',
    category: 'Spin and 3D',
    defaultDuration: 0.7,
    icon: 'Box',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      const inWidth = w * p;
      ctx.save();
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, w, h);
      // Incoming face from left
      ctx.save();
      ctx.transform(p, 0, 0, 1 - (1 - p) * 0.2, 0, (h * (1 - p) * 0.2) / 2);
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.fillStyle = `rgba(0,0,0,${(1 - p) * 0.6})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
      // Outgoing face to right
      ctx.save();
      ctx.transform(1 - p, 0, 0, 1 - p * 0.2, inWidth, (h * p * 0.2) / 2);
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      ctx.fillStyle = `rgba(0,0,0,${p * 0.6})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
      ctx.restore();
    },
  },

  'page-turn': {
    id: 'page-turn',
    name: 'Page Turn',
    category: 'Spin and 3D',
    defaultDuration: 0.75,
    icon: 'BookOpen',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      const curlX = w * (1 - p);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, curlX, h);
      ctx.clip();
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      ctx.restore();

      // Curl shadow & fold edge
      if (curlX > 0 && curlX < w) {
        ctx.save();
        const grad = ctx.createLinearGradient(curlX - 35, 0, curlX + 15, 0);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.7, 'rgba(0,0,0,0.5)');
        grad.addColorStop(1, 'rgba(255,255,255,0.7)');
        ctx.fillStyle = grad;
        ctx.fillRect(curlX - 35, 0, 50, h);
        ctx.restore();
      }
    },
  },

  'flip-h': {
    id: 'flip-h',
    name: 'Flip Horizontal',
    category: 'Spin and 3D',
    defaultDuration: 0.6,
    icon: 'FlipHorizontal',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      if (p < 0.5) {
        const scaleX = Math.cos(p * Math.PI);
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.scale(scaleX, 1);
        ctx.translate(-w / 2, -h / 2);
        drawFrame(ctx, outCanvas, 0, 0, w, h);
        ctx.restore();
      } else {
        const scaleX = Math.sin((p - 0.5) * Math.PI);
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.scale(scaleX, 1);
        ctx.translate(-w / 2, -h / 2);
        drawFrame(ctx, inCanvas, 0, 0, w, h);
        ctx.restore();
      }
    },
  },

  'flip-v': {
    id: 'flip-v',
    name: 'Flip Vertical',
    category: 'Spin and 3D',
    defaultDuration: 0.6,
    icon: 'FlipVertical',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      if (p < 0.5) {
        const scaleY = Math.cos(p * Math.PI);
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.scale(1, scaleY);
        ctx.translate(-w / 2, -h / 2);
        drawFrame(ctx, outCanvas, 0, 0, w, h);
        ctx.restore();
      } else {
        const scaleY = Math.sin((p - 0.5) * Math.PI);
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.scale(1, scaleY);
        ctx.translate(-w / 2, -h / 2);
        drawFrame(ctx, inCanvas, 0, 0, w, h);
        ctx.restore();
      }
    },
  },

  'fold-in': {
    id: 'fold-in',
    name: 'Paper Fold',
    category: 'Spin and 3D',
    defaultDuration: 0.65,
    icon: 'Folder',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      const halfH = h / 2;
      const foldScale = 1 - p;
      // Top fold
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, halfH);
      ctx.clip();
      ctx.translate(0, halfH);
      ctx.scale(1, foldScale);
      ctx.translate(0, -halfH);
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      ctx.fillStyle = `rgba(0,0,0,${p * 0.4})`;
      ctx.fillRect(0, 0, w, halfH);
      ctx.restore();

      // Bottom fold
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, halfH, w, halfH);
      ctx.clip();
      ctx.translate(0, halfH);
      ctx.scale(1, foldScale);
      ctx.translate(0, -halfH);
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      ctx.fillStyle = `rgba(0,0,0,${p * 0.4})`;
      ctx.fillRect(0, halfH, w, halfH);
      ctx.restore();
    },
  },

  'swing-door': {
    id: 'swing-door',
    name: 'Swing Door',
    category: 'Spin and 3D',
    defaultDuration: 0.65,
    icon: 'DoorClosed',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      const swingScale = Math.cos(p * (Math.PI / 2));
      ctx.save();
      ctx.transform(swingScale, 0, 0, 1 - p * 0.2, 0, (h * p * 0.2) / 2);
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      ctx.fillStyle = `rgba(0,0,0,${p * 0.5})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    },
  },

  // ==========================================
  // 6. BLUR AND MOTION
  // ==========================================
  'motion-blur-slide': {
    id: 'motion-blur-slide',
    name: 'Motion Blur Slide',
    category: 'Blur and motion',
    defaultDuration: 0.5,
    icon: 'Wind',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      const blurAmt = Math.sin(p * Math.PI) * 16;
      ctx.save();
      if (blurAmt > 0.5) ctx.filter = `blur(${blurAmt.toFixed(1)}px)`;
      drawFrame(ctx, outCanvas, -w * p, 0, w, h);
      drawFrame(ctx, inCanvas, w * (1 - p), 0, w, h);
      ctx.restore();
    },
  },

  'whip-pan-left': {
    id: 'whip-pan-left',
    name: 'Whip Pan Left',
    category: 'Blur and motion',
    defaultDuration: 0.45,
    icon: 'ChevronsLeft',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      const blurAmt = Math.sin(p * Math.PI) * 28;
      ctx.save();
      if (blurAmt > 0.5) ctx.filter = `blur(${blurAmt.toFixed(1)}px)`;
      drawFrame(ctx, outCanvas, -w * p * 1.2, 0, w, h);
      drawFrame(ctx, inCanvas, w * 1.2 * (1 - p), 0, w, h);
      ctx.restore();
    },
  },

  'whip-pan-right': {
    id: 'whip-pan-right',
    name: 'Whip Pan Right',
    category: 'Blur and motion',
    defaultDuration: 0.45,
    icon: 'ChevronsRight',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      const blurAmt = Math.sin(p * Math.PI) * 28;
      ctx.save();
      if (blurAmt > 0.5) ctx.filter = `blur(${blurAmt.toFixed(1)}px)`;
      drawFrame(ctx, outCanvas, w * p * 1.2, 0, w, h);
      drawFrame(ctx, inCanvas, -w * 1.2 * (1 - p), 0, w, h);
      ctx.restore();
    },
  },

  'directional-blur': {
    id: 'directional-blur',
    name: 'Directional Blur',
    category: 'Blur and motion',
    defaultDuration: 0.55,
    icon: 'Move',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      const blur = Math.sin(p * Math.PI) * 20;
      ctx.save();
      if (blur > 0.5) ctx.filter = `blur(${blur.toFixed(1)}px)`;
      ctx.globalAlpha = 1 - p;
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      ctx.restore();

      ctx.save();
      if (blur > 0.5) ctx.filter = `blur(${blur.toFixed(1)}px)`;
      ctx.globalAlpha = p;
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  'radial-blur': {
    id: 'radial-blur',
    name: 'Radial Spin Blur',
    category: 'Blur and motion',
    defaultDuration: 0.6,
    icon: 'RotateCw',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      const rot = Math.sin(p * Math.PI) * 25 * (Math.PI / 180);
      const blur = Math.sin(p * Math.PI) * 18;
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(rot);
      ctx.translate(-w / 2, -h / 2);
      if (blur > 0.5) ctx.filter = `blur(${blur.toFixed(1)}px)`;
      if (p < 0.5) {
        drawFrame(ctx, outCanvas, 0, 0, w, h);
      } else {
        drawFrame(ctx, inCanvas, 0, 0, w, h);
      }
      ctx.restore();
    },
  },

  'swirl': {
    id: 'swirl',
    name: 'Swirl Vortex',
    category: 'Blur and motion',
    defaultDuration: 0.7,
    icon: 'Disc',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      const rot = (p < 0.5 ? p * 2 : (1 - p) * 2) * Math.PI * 0.8;
      const scale = 1 - Math.sin(p * Math.PI) * 0.25;
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(rot);
      ctx.scale(scale, scale);
      ctx.translate(-w / 2, -h / 2);
      if (p < 0.5) {
        ctx.globalAlpha = 1 - p * 0.4;
        drawFrame(ctx, outCanvas, 0, 0, w, h);
      } else {
        ctx.globalAlpha = 0.6 + p * 0.4;
        drawFrame(ctx, inCanvas, 0, 0, w, h);
      }
      ctx.restore();
    },
  },

  'ripple': {
    id: 'ripple',
    name: 'Ripple Pond',
    category: 'Blur and motion',
    defaultDuration: 0.7,
    icon: 'Waves',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, p < 0.5 ? outCanvas : inCanvas, 0, 0, w, h);
      const rings = 4;
      const maxR = Math.hypot(w, h) / 2;
      ctx.save();
      ctx.strokeStyle = `rgba(255,255,255,${Math.sin(p * Math.PI) * 0.4})`;
      ctx.lineWidth = 14;
      for (let i = 0; i < rings; i++) {
        const ringP = (p + i / rings) % 1;
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, ringP * maxR, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      if (p >= 0.5) {
        ctx.save();
        ctx.globalAlpha = (p - 0.5) * 2;
        drawFrame(ctx, inCanvas, 0, 0, w, h);
        ctx.restore();
      }
    },
  },

  'water-wave': {
    id: 'water-wave',
    name: 'Water Wave',
    category: 'Blur and motion',
    defaultDuration: 0.7,
    icon: 'Droplets',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      const waveY = h * (1 - p);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, waveY);
      for (let x = 0; x <= w; x += 30) {
        const dy = Math.sin((x / 60) + p * 12) * 20;
        ctx.lineTo(x, waveY + dy);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.clip();
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  'shockwave': {
    id: 'shockwave',
    name: 'Shockwave Pulse',
    category: 'Blur and motion',
    defaultDuration: 0.6,
    icon: 'Zap',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      const radius = Math.hypot(w, h) * p;
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      ctx.save();
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, radius, 0, Math.PI * 2);
      ctx.clip();
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();

      // Glowing shockwave ring
      ctx.save();
      ctx.strokeStyle = `rgba(147, 197, 253, ${Math.sin(p * Math.PI) * 0.8})`;
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    },
  },

  // ==========================================
  // 7. GLITCH AND DIGITAL
  // ==========================================
  'glitch': {
    id: 'glitch',
    name: 'Digital Glitch',
    category: 'Glitch and digital',
    defaultDuration: 0.45,
    icon: 'Scissors',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      const current = p < 0.5 ? outCanvas : inCanvas;
      drawFrame(ctx, current, 0, 0, w, h);

      const slices = 8;
      const sliceH = h / slices;
      for (let i = 0; i < slices; i++) {
        if (Math.random() > 0.4) {
          const shift = (Math.random() - 0.5) * 50 * Math.sin(p * Math.PI);
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, i * sliceH, w, sliceH);
          ctx.clip();
          drawFrame(ctx, current, shift, 0, w, h);
          ctx.restore();
        }
      }
    },
  },

  'rgb-split': {
    id: 'rgb-split',
    name: 'RGB Split',
    category: 'Glitch and digital',
    defaultDuration: 0.5,
    icon: 'Zap',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      const offset = Math.sin(p * Math.PI) * 28;
      const target = p < 0.5 ? outCanvas : inCanvas;

      ctx.save();
      ctx.globalAlpha = 1;
      drawFrame(ctx, target, 0, 0, w, h);

      // Red offset
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = Math.sin(p * Math.PI) * 0.6;
      ctx.fillStyle = '#ff0055';
      drawFrame(ctx, target, offset, 0, w, h);

      // Cyan offset
      ctx.fillStyle = '#00ffff';
      drawFrame(ctx, target, -offset, 0, w, h);
      ctx.restore();
    },
  },

  'pixelate': {
    id: 'pixelate',
    name: 'Pixelate 8-Bit',
    category: 'Glitch and digital',
    defaultDuration: 0.6,
    icon: 'Grid',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      const maxBlock = 36;
      const block = Math.max(1, Math.round(Math.sin(p * Math.PI) * maxBlock));
      const source = p < 0.5 ? outCanvas : inCanvas;

      if (block <= 2) {
        drawFrame(ctx, source, 0, 0, w, h);
        return;
      }

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      const smallW = Math.max(1, Math.floor(w / block));
      const smallH = Math.max(1, Math.floor(h / block));
      ctx.drawImage(source, 0, 0, smallW, smallH);
      ctx.drawImage(ctx.canvas, 0, 0, smallW, smallH, 0, 0, w, h);
      ctx.restore();
    },
  },

  'mosaic': {
    id: 'mosaic',
    name: 'Mosaic Dissolve',
    category: 'Glitch and digital',
    defaultDuration: 0.6,
    icon: 'Grid',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      const cols = 12;
      const rows = 8;
      const cellW = w / cols;
      const cellH = h / rows;
      ctx.save();
      ctx.beginPath();
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const pseudoRand = (Math.sin(r * 99 + c * 33) * 0.5 + 0.5);
          if (p >= pseudoRand * 0.8) {
            ctx.rect(c * cellW, r * cellH, cellW, cellH);
          }
        }
      }
      ctx.clip();
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  'digital-noise': {
    id: 'digital-noise',
    name: 'Digital Noise',
    category: 'Glitch and digital',
    defaultDuration: 0.5,
    icon: 'Radio',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, p < 0.5 ? outCanvas : inCanvas, 0, 0, w, h);
      const noiseIntensity = Math.sin(p * Math.PI) * 0.45;
      if (noiseIntensity > 0.05) {
        ctx.save();
        ctx.fillStyle = `rgba(255,255,255,${noiseIntensity * 0.4})`;
        for (let i = 0; i < 40; i++) {
          const rx = Math.random() * w;
          const ry = Math.random() * h;
          const rw = Math.random() * 80 + 20;
          const rh = Math.random() * 4 + 1;
          ctx.fillRect(rx, ry, rw, rh);
        }
        ctx.restore();
      }
    },
  },

  'scanlines': {
    id: 'scanlines',
    name: 'CRT Scanlines',
    category: 'Glitch and digital',
    defaultDuration: 0.55,
    icon: 'Monitor',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, p < 0.5 ? outCanvas : inCanvas, 0, 0, w, h);
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      for (let y = 0; y < h; y += 4) {
        ctx.fillRect(0, y, w, 2);
      }
      ctx.globalAlpha = p;
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  'vhs-rewind': {
    id: 'vhs-rewind',
    name: 'VHS Rewind',
    category: 'Glitch and digital',
    defaultDuration: 0.5,
    icon: 'Rewind',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      const jitter = (Math.random() - 0.5) * 20 * Math.sin(p * Math.PI);
      drawFrame(ctx, p < 0.5 ? outCanvas : inCanvas, jitter, 0, w, h);
      // Rewind tracking band
      const barY = ((p * 3) % 1) * h;
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.fillRect(0, barY, w, 25);
      ctx.restore();
    },
  },

  'data-slice': {
    id: 'data-slice',
    name: 'Data Slice',
    category: 'Glitch and digital',
    defaultDuration: 0.45,
    icon: 'Columns',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      const strips = 6;
      const stripH = h / strips;
      for (let i = 0; i < strips; i++) {
        const dir = i % 2 === 0 ? 1 : -1;
        const offset = dir * (1 - p) * 120;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, i * stripH, w, stripH);
        ctx.clip();
        drawFrame(ctx, inCanvas, offset, 0, w, h);
        ctx.restore();
      }
    },
  },

  'camera-shake': {
    id: 'camera-shake',
    name: 'Impact Shake',
    category: 'Glitch and digital',
    defaultDuration: 0.45,
    icon: 'Activity',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      const shakeAmt = Math.sin(p * Math.PI) * 26;
      const dx = (Math.random() - 0.5) * shakeAmt;
      const dy = (Math.random() - 0.5) * shakeAmt;
      if (p < 0.5) {
        drawFrame(ctx, outCanvas, dx, dy, w, h);
      } else {
        drawFrame(ctx, inCanvas, dx, dy, w, h);
      }
    },
  },

  // ==========================================
  // 8. LIGHT AND FILM
  // ==========================================
  'flash': {
    id: 'flash',
    name: 'White Flash',
    category: 'Light and film',
    defaultDuration: 0.4,
    icon: 'Sun',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      if (p < 0.45) {
        drawFrame(ctx, outCanvas, 0, 0, w, h);
        ctx.save();
        ctx.fillStyle = `rgba(255,255,255,${(p / 0.45)})`;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      } else {
        drawFrame(ctx, inCanvas, 0, 0, w, h);
        ctx.save();
        ctx.fillStyle = `rgba(255,255,255,${(1 - p) / 0.55})`;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }
    },
  },

  'light-leak': {
    id: 'light-leak',
    name: 'Light Leak',
    category: 'Light and film',
    defaultDuration: 0.7,
    icon: 'SunMedium',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      ctx.save();
      ctx.globalAlpha = p;
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();

      // Atmospheric warm light burst
      const intensity = Math.sin(p * Math.PI);
      if (intensity > 0.05) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const grad = ctx.createRadialGradient(w * p, h * 0.3, 20, w * p, h * 0.3, w * 0.8);
        grad.addColorStop(0, `rgba(255, 170, 50, ${intensity * 0.9})`);
        grad.addColorStop(0.4, `rgba(255, 90, 90, ${intensity * 0.6})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }
    },
  },

  'lens-flare': {
    id: 'lens-flare',
    name: 'Lens Flare',
    category: 'Light and film',
    defaultDuration: 0.65,
    icon: 'Sparkles',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      ctx.save();
      ctx.globalAlpha = p;
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();

      // Anamorphic horizontal streak
      const flareP = Math.sin(p * Math.PI);
      if (flareP > 0.05) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const flareX = w * p;
        const flareY = h * 0.5;
        // Central orb
        const grad = ctx.createRadialGradient(flareX, flareY, 5, flareX, flareY, 140);
        grad.addColorStop(0, `rgba(255, 255, 255, ${flareP})`);
        grad.addColorStop(0.3, `rgba(59, 130, 246, ${flareP * 0.7})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        // Horizontal streak
        ctx.fillStyle = `rgba(147, 197, 253, ${flareP * 0.7})`;
        ctx.fillRect(0, flareY - 3, w, 6);
        ctx.restore();
      }
    },
  },

  'film-burn': {
    id: 'film-burn',
    name: 'Film Burn',
    category: 'Light and film',
    defaultDuration: 0.75,
    icon: 'Flame',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      ctx.save();
      ctx.globalAlpha = p;
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();

      const burnP = Math.sin(p * Math.PI);
      if (burnP > 0.05) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, `rgba(255, 60, 0, ${burnP * 0.85})`);
        grad.addColorStop(0.5, `rgba(255, 200, 0, ${burnP * 0.95})`);
        grad.addColorStop(1, `rgba(255, 0, 80, ${burnP * 0.85})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }
    },
  },

  'glow': {
    id: 'glow',
    name: 'Luminous Glow',
    category: 'Light and film',
    defaultDuration: 0.65,
    icon: 'Sun',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      const glowAmt = Math.sin(p * Math.PI) * 35;
      ctx.save();
      if (glowAmt > 0.5) ctx.filter = `brightness(${1 + p * 0.5}) blur(${glowAmt.toFixed(1)}px)`;
      drawFrame(ctx, p < 0.5 ? outCanvas : inCanvas, 0, 0, w, h);
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = p;
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  'bokeh-blur': {
    id: 'bokeh-blur',
    name: 'Bokeh Orbs',
    category: 'Light and film',
    defaultDuration: 0.7,
    icon: 'CircleDot',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      ctx.save();
      ctx.globalAlpha = p;
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();

      const orbP = Math.sin(p * Math.PI);
      if (orbP > 0.05) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        for (let i = 0; i < 15; i++) {
          const ox = ((i * 137.5) % w);
          const oy = ((i * 219.3) % h);
          const r = 25 + (i % 5) * 15;
          ctx.beginPath();
          ctx.arc(ox, oy, r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 230, 180, ${orbP * 0.35})`;
          ctx.fill();
        }
        ctx.restore();
      }
    },
  },

  'film-roll': {
    id: 'film-roll',
    name: 'Film Reel Roll',
    category: 'Light and film',
    defaultDuration: 0.6,
    icon: 'Film',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      const rollY = h * p;
      drawFrame(ctx, outCanvas, 0, -rollY, w, h);
      drawFrame(ctx, inCanvas, 0, h - rollY, w, h);
      // Film sprocket divider bar
      ctx.save();
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, h - rollY - 14, w, 28);
      // Sprocket holes
      ctx.fillStyle = '#ffffff';
      for (let x = 10; x < w; x += 35) {
        ctx.fillRect(x, h - rollY - 8, 16, 16);
      }
      ctx.restore();
    },
  },

  // ==========================================
  // 9. SHAPE AND CREATIVE
  // ==========================================
  'circle-reveal': {
    id: 'circle-reveal',
    name: 'Circle Reveal',
    category: 'Shape and creative',
    defaultDuration: 0.65,
    icon: 'Circle',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      const maxR = Math.hypot(w, h) / 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, maxR * p, 0, Math.PI * 2);
      ctx.clip();
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  'ink-drop': {
    id: 'ink-drop',
    name: 'Ink Splash',
    category: 'Shape and creative',
    defaultDuration: 0.7,
    icon: 'Droplet',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      const r = (Math.hypot(w, h) / 2) * p;
      ctx.save();
      ctx.beginPath();
      // Multi-lobed organic ink splash
      for (let theta = 0; theta < Math.PI * 2; theta += 0.2) {
        const distort = 1 + Math.sin(theta * 6) * 0.18 + Math.cos(theta * 3) * 0.12;
        const curR = r * distort;
        const x = w / 2 + Math.cos(theta) * curR;
        const y = h / 2 + Math.sin(theta) * curR;
        if (theta === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.clip();
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  'paint-stroke': {
    id: 'paint-stroke',
    name: 'Paint Brush Stroke',
    category: 'Shape and creative',
    defaultDuration: 0.65,
    icon: 'Paintbrush',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      const brushW = (w + 60) * p;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let y = 0; y <= h; y += 40) {
        const jitter = Math.sin(y * 0.1) * 20;
        ctx.lineTo(brushW + jitter, y);
      }
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.clip();
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  'ripped-paper': {
    id: 'ripped-paper',
    name: 'Ripped Paper',
    category: 'Shape and creative',
    defaultDuration: 0.65,
    icon: 'Scissors',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      const ripX = w * (1 - p);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let y = 0; y <= h; y += 25) {
        const ripJitter = Math.sin(y * 0.3) * 15;
        ctx.lineTo(ripX + ripJitter, y);
      }
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.clip();
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  'shatter': {
    id: 'shatter',
    name: 'Glass Shatter',
    category: 'Shape and creative',
    defaultDuration: 0.6,
    icon: 'Box',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      const shards = 6;
      const shardW = w / shards;
      for (let i = 0; i < shards; i++) {
        const rot = (i % 2 === 0 ? 1 : -1) * p * 0.4;
        const dropY = p * p * 150;
        ctx.save();
        ctx.beginPath();
        ctx.rect(i * shardW, 0, shardW, h);
        ctx.clip();
        ctx.translate((i + 0.5) * shardW, h / 2);
        ctx.rotate(rot);
        ctx.translate(-(i + 0.5) * shardW, -h / 2 + dropY);
        drawFrame(ctx, outCanvas, 0, 0, w, h);
        ctx.restore();
      }
    },
  },

  'split-screen': {
    id: 'split-screen',
    name: 'Split Screen Expand',
    category: 'Shape and creative',
    defaultDuration: 0.6,
    icon: 'Split',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      const boxW = w * p;
      const boxH = h * p;
      ctx.save();
      ctx.beginPath();
      ctx.rect((w - boxW) / 2, (h - boxH) / 2, boxW, boxH);
      ctx.clip();
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();
    },
  },

  'whirl': {
    id: 'whirl',
    name: 'Whirl Cyclone',
    category: 'Shape and creative',
    defaultDuration: 0.7,
    icon: 'RotateCw',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      const angle = p * Math.PI * 3;
      const scale = 1 - Math.sin(p * Math.PI) * 0.35;
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(angle);
      ctx.scale(scale, scale);
      ctx.translate(-w / 2, -h / 2);
      if (p < 0.5) {
        drawFrame(ctx, outCanvas, 0, 0, w, h);
      } else {
        drawFrame(ctx, inCanvas, 0, 0, w, h);
      }
      ctx.restore();
    },
  },

  'shine-sweep': {
    id: 'shine-sweep',
    name: 'Shine Sweep',
    category: 'Shape and creative',
    defaultDuration: 0.65,
    icon: 'Sparkle',
    render: (ctx, outCanvas, inCanvas, p, w, h) => {
      drawFrame(ctx, outCanvas, 0, 0, w, h);
      ctx.save();
      ctx.globalAlpha = p;
      drawFrame(ctx, inCanvas, 0, 0, w, h);
      ctx.restore();

      // Gleaming diagonal shine band
      const shinePos = (w + h) * p;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const grad = ctx.createLinearGradient(shinePos - 120, 0, shinePos + 60, 0);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0.85)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(shinePos - 100, 0);
      ctx.lineTo(shinePos + 100, 0);
      ctx.lineTo(shinePos + 100 - h * 0.5, h);
      ctx.lineTo(shinePos - 100 - h * 0.5, h);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },
  },
};

// Generate full searchable array of transitions
export const TRANSITIONS_LIST = Object.values(TRANSITIONS_REGISTRY);

// Unique categories
export const TRANSITION_CATEGORIES = [
  'All',
  'Favorites',
  'Basic',
  'Slide and push',
  'Zoom',
  'Wipe',
  'Spin and 3D',
  'Blur and motion',
  'Glitch and digital',
  'Light and film',
  'Shape and creative',
];

/**
 * Composite transition between two pre-rendered canvases
 */
export function renderTransition(
  ctx,
  transitionId,
  outgoingCanvas,
  incomingCanvas,
  rawProgress,
  width,
  height,
  options = {}
) {
  const trans = TRANSITIONS_REGISTRY[transitionId] || TRANSITIONS_REGISTRY['dissolve'];
  const eased = applyEasing(rawProgress, options.easing || 'easeInOut');
  trans.render(ctx, outgoingCanvas, incomingCanvas, eased, width, height, options);
}

let previewCanvasA = null;
let previewCanvasB = null;

function getPreviewTestCanvases(w = 120, h = 68) {
  if (typeof document === 'undefined') return { canvasA: null, canvasB: null };
  if (!previewCanvasA || previewCanvasA.width !== w || previewCanvasA.height !== h) {
    previewCanvasA = document.createElement('canvas');
    previewCanvasA.width = w;
    previewCanvasA.height = h;
    const ctxA = previewCanvasA.getContext('2d');
    const gradA = ctxA.createLinearGradient(0, 0, w, h);
    gradA.addColorStop(0, '#1E293B');
    gradA.addColorStop(1, '#0F172A');
    ctxA.fillStyle = gradA;
    ctxA.fillRect(0, 0, w, h);
    ctxA.fillStyle = '#3B82F6';
    ctxA.beginPath();
    ctxA.arc(w / 2, h / 2, 14, 0, Math.PI * 2);
    ctxA.fill();
    ctxA.fillStyle = '#FFFFFF';
    ctxA.font = 'bold 11px Inter, sans-serif';
    ctxA.textAlign = 'center';
    ctxA.textBaseline = 'middle';
    ctxA.fillText('A', w / 2, h / 2);

    previewCanvasB = document.createElement('canvas');
    previewCanvasB.width = w;
    previewCanvasB.height = h;
    const ctxB = previewCanvasB.getContext('2d');
    const gradB = ctxB.createLinearGradient(0, 0, w, h);
    gradB.addColorStop(0, '#F97316');
    gradB.addColorStop(1, '#EF4444');
    ctxB.fillStyle = gradB;
    ctxB.fillRect(0, 0, w, h);
    ctxB.fillStyle = '#FFFFFF';
    ctxB.beginPath();
    ctxB.arc(w / 2, h / 2, 14, 0, Math.PI * 2);
    ctxB.fill();
    ctxB.fillStyle = '#171717';
    ctxB.font = 'bold 11px Inter, sans-serif';
    ctxB.textAlign = 'center';
    ctxB.textBaseline = 'middle';
    ctxB.fillText('B', w / 2, h / 2);
  }
  return { canvasA: previewCanvasA, canvasB: previewCanvasB };
}

export function drawTransitionThumbnail(targetCanvas, transitionId, progress = 0.5) {
  if (!targetCanvas) return;
  const ctx = targetCanvas.getContext('2d');
  const w = targetCanvas.width;
  const h = targetCanvas.height;
  const { canvasA, canvasB } = getPreviewTestCanvases(w, h);
  if (!canvasA || !canvasB) return;
  ctx.clearRect(0, 0, w, h);
  renderTransition(ctx, transitionId, canvasA, canvasB, progress, w, h);
}

