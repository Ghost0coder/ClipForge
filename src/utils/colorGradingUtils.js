/**
 * Color Grading & Speed Curve Utilities for ClipForge
 * Provides:
 * 1. Speed Curve Presets & Interpolation
 * 2. 1D/3D .cube LUT Parser and Application
 * 3. Color Curves (RGB, R, G, B) Table Generator
 * 4. 8-Color HSL Segment Color Adjuster
 * 5. 3-Way Color Wheels (Shadows/Lift, Midtones/Gamma, Highlights/Gain)
 */

// ---------------- SPEED CURVES ----------------

export const SPEED_CURVE_PRESETS = {
  montage: {
    id: 'montage',
    name: 'Montage',
    points: [
      { time: 0, speed: 2.2 },
      { time: 0.3, speed: 0.6 },
      { time: 0.7, speed: 0.6 },
      { time: 1.0, speed: 2.2 },
    ],
  },
  hero: {
    id: 'hero',
    name: 'Hero Time',
    points: [
      { time: 0, speed: 1.2 },
      { time: 0.35, speed: 0.3 },
      { time: 0.7, speed: 0.3 },
      { time: 1.0, speed: 3.0 },
    ],
  },
  bullet: {
    id: 'bullet',
    name: 'Bullet',
    points: [
      { time: 0, speed: 2.5 },
      { time: 0.25, speed: 0.2 },
      { time: 0.75, speed: 0.2 },
      { time: 1.0, speed: 2.5 },
    ],
  },
  jump: {
    id: 'jump',
    name: 'Jump Cut',
    points: [
      { time: 0, speed: 3.5 },
      { time: 0.25, speed: 1.0 },
      { time: 0.5, speed: 3.5 },
      { time: 0.75, speed: 1.0 },
      { time: 1.0, speed: 3.5 },
    ],
  },
  'flash-in': {
    id: 'flash-in',
    name: 'Flash In',
    points: [
      { time: 0, speed: 4.5 },
      { time: 0.25, speed: 1.8 },
      { time: 0.6, speed: 1.0 },
      { time: 1.0, speed: 1.0 },
    ],
  },
  'flash-out': {
    id: 'flash-out',
    name: 'Flash Out',
    points: [
      { time: 0, speed: 1.0 },
      { time: 0.4, speed: 1.0 },
      { time: 0.75, speed: 2.2 },
      { time: 1.0, speed: 5.0 },
    ],
  },
};

/**
 * Calculates current source time for a clip using speed curves.
 * Uses piecewise trapezoidal numerical integration over normalized timeline progress.
 */
export function getSpeedCurveSourceTime(clip, clipElapsed) {
  const points = clip.speedCurvePoints;
  if (!points || !Array.isArray(points) || points.length < 2) {
    return clipElapsed * (clip.speed || 1);
  }

  const sorted = [...points].sort((a, b) => a.time - b.time);
  const dur = Math.max(0.01, clip.duration);
  const targetT = Math.max(0, Math.min(1, clipElapsed / dur));

  let sourceTimeAccum = 0;
  const numSteps = Math.max(30, Math.min(120, Math.round(targetT * 100)));
  const dt = targetT / numSteps;

  for (let i = 0; i < numSteps; i++) {
    const tCurrent = i * dt;
    const tNext = (i + 1) * dt;
    const sCurrent = sampleSpeedCurve(sorted, tCurrent);
    const sNext = sampleSpeedCurve(sorted, tNext);
    const avgSpeed = (sCurrent + sNext) / 2;
    sourceTimeAccum += avgSpeed * (dt * dur);
  }

  return sourceTimeAccum;
}

function sampleSpeedCurve(points, t) {
  if (t <= points[0].time) return points[0].speed;
  if (t >= points[points.length - 1].time) return points[points.length - 1].speed;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    if (t >= p1.time && t <= p2.time) {
      const span = p2.time - p1.time;
      if (span <= 0) return p1.speed;
      const ratio = (t - p1.time) / span;
      return p1.speed + ratio * (p2.speed - p1.speed);
    }
  }
  return 1.0;
}

// ---------------- COLOR CURVES ----------------

export function generateCurveLUT(points) {
  const lut = new Uint8Array(256);
  if (!points || !Array.isArray(points) || points.length < 2) {
    for (let i = 0; i < 256; i++) lut[i] = i;
    return lut;
  }

  const sorted = [...points].sort((a, b) => a.x - b.x);

  for (let i = 0; i < 256; i++) {
    const xNorm = (i / 255) * 100;
    if (xNorm <= sorted[0].x) {
      lut[i] = Math.max(0, Math.min(255, Math.round((sorted[0].y / 100) * 255)));
      continue;
    }
    if (xNorm >= sorted[sorted.length - 1].x) {
      lut[i] = Math.max(0, Math.min(255, Math.round((sorted[sorted.length - 1].y / 100) * 255)));
      continue;
    }

    for (let j = 0; j < sorted.length - 1; j++) {
      const p1 = sorted[j];
      const p2 = sorted[j + 1];
      if (xNorm >= p1.x && xNorm <= p2.x) {
        const span = p2.x - p1.x;
        const ratio = span > 0 ? (xNorm - p1.x) / span : 0;
        const yNorm = p1.y + ratio * (p2.y - p1.y);
        lut[i] = Math.max(0, Math.min(255, Math.round((yNorm / 100) * 255)));
        break;
      }
    }
  }

  return lut;
}

// ---------------- HSL COLOR SEGMENTS ----------------

export const HSL_COLOR_RANGES = [
  { id: 'red', name: 'Red', hex: '#EF4444', minHue: 345, maxHue: 15 },
  { id: 'orange', name: 'Orange', hex: '#F97316', minHue: 15, maxHue: 45 },
  { id: 'yellow', name: 'Yellow', hex: '#EAB308', minHue: 45, maxHue: 75 },
  { id: 'green', name: 'Green', hex: '#22C55E', minHue: 75, maxHue: 165 },
  { id: 'cyan', name: 'Cyan', hex: '#06B6D4', minHue: 165, maxHue: 195 },
  { id: 'blue', name: 'Blue', hex: '#3B82F6', minHue: 195, maxHue: 255 },
  { id: 'purple', name: 'Purple', hex: '#A855F7', minHue: 255, maxHue: 285 },
  { id: 'magenta', name: 'Magenta', hex: '#EC4899', minHue: 285, maxHue: 345 },
];

function isHueInRange(hue, min, max) {
  if (min > max) {
    return hue >= min || hue <= max;
  }
  return hue >= min && hue <= max;
}

export function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: h = 0;
    }
    h *= 60;
  }
  return [h, s, l];
}

export function hslToRgb(h, s, l) {
  let r, g, b;
  h = (h % 360 + 360) % 360;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h / 360 + 1 / 3);
    g = hue2rgb(p, q, h / 360);
    b = hue2rgb(p, q, h / 360 - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// ---------------- 3D / 1D .CUBE LUT PARSER ----------------

export function parseCubeLUT(text) {
  const lines = text.split(/\r?\n/);
  let size = 0;
  let is3D = true;
  const data = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    if (line.startsWith('LUT_3D_SIZE')) {
      size = parseInt(line.split(/\s+/)[1], 10);
      is3D = true;
    } else if (line.startsWith('LUT_1D_SIZE')) {
      size = parseInt(line.split(/\s+/)[1], 10);
      is3D = false;
    } else {
      const parts = line.split(/\s+/).map(Number);
      if (parts.length === 3 && !isNaN(parts[0])) {
        data.push(parts[0], parts[1], parts[2]);
      }
    }
  }

  if (size === 0 || data.length === 0) {
    throw new Error('Invalid .cube LUT file: Missing LUT dimensions or data.');
  }

  return { size, is3D, data: new Float32Array(data) };
}

// Built-in pro cinematic LUT presets
export const PRESET_LUTS = [
  {
    id: 'teal-orange',
    name: 'Teal & Orange',
    category: 'Cinematic',
    apply: (r, g, b) => {
      const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      const nr = r * (0.8 + 0.4 * luma) + luma * 25;
      const ng = g * 0.95;
      const nb = b * (1.2 - 0.4 * luma) + (1 - luma) * 35;
      return [nr, ng, nb];
    },
  },
  {
    id: 'film-noir',
    name: 'Film Noir',
    category: 'Monochrome',
    apply: (r, g, b) => {
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      const contrast = Math.pow(luma / 255, 1.35) * 255;
      return [contrast, contrast, contrast];
    },
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    category: 'Stylized',
    apply: (r, g, b) => {
      const nr = r * 1.25 + 10;
      const ng = g * 0.8;
      const nb = b * 1.35 + 20;
      return [nr, ng, nb];
    },
  },
  {
    id: 'vintage-70s',
    name: 'Vintage 70s',
    category: 'Retro',
    apply: (r, g, b) => {
      const nr = r * 1.1 + 18;
      const ng = g * 1.05 + 8;
      const nb = b * 0.85 - 10;
      return [nr, ng, nb];
    },
  },
  {
    id: 'warm-golden',
    name: 'Warm Golden Hour',
    category: 'Mood',
    apply: (r, g, b) => {
      const nr = r * 1.18 + 12;
      const ng = g * 1.05 + 5;
      const nb = b * 0.9 - 8;
      return [nr, ng, nb];
    },
  },
];

/**
 * Applies full advanced color grading (Curves, HSL, Wheels, LUT) to an ImageData buffer.
 */
export function applyAdvancedColorGrading(imageData, clip) {
  if (!clip) return;
  const data = imageData.data;
  const len = data.length;

  const hasCurves = clip.colorCurves && (
    clip.colorCurves.rgb?.length > 2 ||
    clip.colorCurves.r?.length > 2 ||
    clip.colorCurves.g?.length > 2 ||
    clip.colorCurves.b?.length > 2
  );
  const rgbLut = hasCurves ? generateCurveLUT(clip.colorCurves.rgb) : null;
  const rLut = hasCurves ? generateCurveLUT(clip.colorCurves.r) : null;
  const gLut = hasCurves ? generateCurveLUT(clip.colorCurves.g) : null;
  const bLut = hasCurves ? generateCurveLUT(clip.colorCurves.b) : null;

  const hasHsl = clip.hsl && Object.keys(clip.hsl).some((k) => {
    const v = clip.hsl[k];
    return v && (v.h !== 0 || v.s !== 0 || v.l !== 0);
  });

  const wheels = clip.colorWheels;
  const hasWheels = wheels && (
    (wheels.shadows && (wheels.shadows.brightness !== 0 || wheels.shadows.x !== 0 || wheels.shadows.y !== 0)) ||
    (wheels.midtones && (wheels.midtones.brightness !== 0 || wheels.midtones.x !== 0 || wheels.midtones.y !== 0)) ||
    (wheels.highlights && (wheels.highlights.brightness !== 0 || wheels.highlights.x !== 0 || wheels.highlights.y !== 0))
  );

  const lut = clip.lut;
  const hasLut = lut && lut.enabled !== false && lut.intensity > 0;
  const presetLut = hasLut ? PRESET_LUTS.find((p) => p.id === lut.id) : null;
  const lutWeight = hasLut ? Math.max(0, Math.min(100, lut.intensity || 100)) / 100 : 0;

  if (!hasCurves && !hasHsl && !hasWheels && !hasLut) return;

  for (let i = 0; i < len; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // 1. Color Curves
    if (hasCurves) {
      if (rgbLut) {
        r = rgbLut[r];
        g = rgbLut[g];
        b = rgbLut[b];
      }
      if (rLut) r = rLut[r];
      if (gLut) g = gLut[g];
      if (bLut) b = bLut[b];
    }

    // 2. 3-Way Color Wheels (Lift, Gamma, Gain)
    if (hasWheels) {
      const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      const shWeight = Math.max(0, 1 - luma * 1.8);
      const hiWeight = Math.max(0, (luma - 0.45) * 1.8);
      const midWeight = Math.max(0, 1 - shWeight - hiWeight);

      if (wheels.shadows) {
        const { x = 0, y = 0, brightness = 0 } = wheels.shadows;
        r += (x * 0.75 + brightness * 0.5) * shWeight;
        g += (-y * 0.75 + brightness * 0.5) * shWeight;
        b += (-x * 0.75 + brightness * 0.5) * shWeight;
      }
      if (wheels.midtones) {
        const { x = 0, y = 0, brightness = 0 } = wheels.midtones;
        r += (x * 0.75 + brightness * 0.5) * midWeight;
        g += (-y * 0.75 + brightness * 0.5) * midWeight;
        b += (-x * 0.75 + brightness * 0.5) * midWeight;
      }
      if (wheels.highlights) {
        const { x = 0, y = 0, brightness = 0 } = wheels.highlights;
        r += (x * 0.75 + brightness * 0.5) * hiWeight;
        g += (-y * 0.75 + brightness * 0.5) * hiWeight;
        b += (-x * 0.75 + brightness * 0.5) * hiWeight;
      }
    }

    // 3. HSL Segment adjustments
    if (hasHsl) {
      const [h, s, l] = rgbToHsl(Math.max(0, Math.min(255, r)), Math.max(0, Math.min(255, g)), Math.max(0, Math.min(255, b)));
      let newH = h;
      let newS = s;
      let newL = l;

      for (const range of HSL_COLOR_RANGES) {
        const mod = clip.hsl[range.id];
        if (mod && (mod.h !== 0 || mod.s !== 0 || mod.l !== 0)) {
          if (isHueInRange(h, range.minHue, range.maxHue)) {
            newH = (newH + (mod.h || 0) * 0.5 + 360) % 360;
            newS = Math.max(0, Math.min(1, newS * (1 + (mod.s || 0) / 100)));
            newL = Math.max(0, Math.min(1, newL + (mod.l || 0) / 250));
            break;
          }
        }
      }

      const [adjR, adjG, adjB] = hslToRgb(newH, newS, newL);
      r = adjR;
      g = adjG;
      b = adjB;
    }

    // 4. LUT Application
    if (hasLut) {
      let lutR = r;
      let lutG = g;
      let lutB = b;

      if (presetLut) {
        [lutR, lutG, lutB] = presetLut.apply(r, g, b);
      } else if (lut.customTable) {
        // Custom 3D .cube LUT table lookup
        const size = lut.customTable.size || 33;
        const dataTable = lut.customTable.data;
        const scale = (size - 1) / 255;
        const ri = Math.min(size - 1, Math.max(0, Math.round(r * scale)));
        const gi = Math.min(size - 1, Math.max(0, Math.round(g * scale)));
        const bi = Math.min(size - 1, Math.max(0, Math.round(b * scale)));
        const index = (bi * size * size + gi * size + ri) * 3;
        if (index + 2 < dataTable.length) {
          lutR = dataTable[index] * 255;
          lutG = dataTable[index + 1] * 255;
          lutB = dataTable[index + 2] * 255;
        }
      }

      r = r * (1 - lutWeight) + lutR * lutWeight;
      g = g * (1 - lutWeight) + lutG * lutWeight;
      b = b * (1 - lutWeight) + lutB * lutWeight;
    }

    data[i] = Math.max(0, Math.min(255, Math.round(r)));
    data[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
    data[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
  }
}
