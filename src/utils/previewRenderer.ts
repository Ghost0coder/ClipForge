import { Project, Clip, Track, AspectRatio, ASPECT_RATIOS, Keyframe } from '../types/editor';
import { FILTERS_LIST } from './sampleData';

export interface RenderOptions {
  showSafeGuides?: boolean;
  showGrid?: boolean;
  selectedClipId?: string | null;
  canvasWidth?: number;
  canvasHeight?: number;
  isExporting?: boolean;
  isPlaying?: boolean;
}

// Media element cache to prevent reloading during playback
const videoElementsCache = new Map<string, HTMLVideoElement>();
const imageElementsCache = new Map<string, HTMLImageElement>();

export function getVideoElement(clipId: string, url: string): HTMLVideoElement {
  let el = videoElementsCache.get(clipId);
  if (!el || el.src !== url) {
    el = document.createElement('video');
    if (url.startsWith('http://') || url.startsWith('https://')) {
      el.crossOrigin = 'anonymous';
    }
    el.src = url;
    el.playsInline = true;
    el.preload = 'auto';
    el.onloadeddata = () => {
      window.dispatchEvent(new CustomEvent('clipforge:redraw'));
    };
    el.oncanplay = () => {
      window.dispatchEvent(new CustomEvent('clipforge:redraw'));
    };
    el.onseeked = () => {
      window.dispatchEvent(new CustomEvent('clipforge:redraw'));
    };
    videoElementsCache.set(clipId, el);
  }
  return el;
}

export function pauseAllVideos(): void {
  videoElementsCache.forEach((el) => {
    if (!el.paused) {
      el.pause();
    }
  });
}

export function getImageElement(clipId: string, url: string): HTMLImageElement {
  let el = imageElementsCache.get(clipId);
  if (!el || el.src !== url) {
    el = new Image();
    el.crossOrigin = 'anonymous';
    el.src = url;
    imageElementsCache.set(clipId, el);
  }
  return el;
}

// Keyframe property interpolator
function getInterpolatedProperty(
  clip: Clip,
  prop: 'x' | 'y' | 'scale' | 'rotation' | 'opacity' | 'volume',
  currentTime: number,
  defaultValue: number
): number {
  const kfs = (clip.keyframes || [])
    .filter((k) => k.property === prop)
    .sort((a, b) => a.time - b.time);

  if (kfs.length === 0) return defaultValue;

  const clipElapsed = currentTime - clip.start;

  // Before first keyframe
  if (clipElapsed <= kfs[0].time) {
    return kfs[0].value;
  }
  // After last keyframe
  if (clipElapsed >= kfs[kfs.length - 1].time) {
    return kfs[kfs.length - 1].value;
  }

  // Find surrounding keyframes
  for (let i = 0; i < kfs.length - 1; i++) {
    const k1 = kfs[i];
    const k2 = kfs[i + 1];
    if (clipElapsed >= k1.time && clipElapsed <= k2.time) {
      const span = k2.time - k1.time;
      if (span <= 0) return k1.value;
      let t = (clipElapsed - k1.time) / span;

      // Apply easing
      if (k1.easing === 'easeIn') {
        t = t * t;
      } else if (k1.easing === 'easeOut') {
        t = t * (2 - t);
      } else if (k1.easing === 'easeInOut') {
        t = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      }

      return k1.value + (k2.value - k1.value) * t;
    }
  }

  return defaultValue;
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  project: Project,
  currentTime: number,
  options: RenderOptions = {}
): void {
  const { width: targetWidth, height: targetHeight } = ASPECT_RATIOS[project.aspectRatio];
  const cw = options.canvasWidth || targetWidth;
  const ch = options.canvasHeight || targetHeight;

  // Clear canvas
  ctx.save();
  ctx.clearRect(0, 0, cw, ch);

  // Background Fill
  if (project.background.type === 'color') {
    ctx.fillStyle = project.background.color || '#0b0c10';
    ctx.fillRect(0, 0, cw, ch);
  } else if (project.background.type === 'gradient') {
    const grad = ctx.createLinearGradient(0, 0, cw, ch);
    grad.addColorStop(0, '#1e1b4b');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cw, ch);
  } else {
    // Transparent or default dark
    ctx.fillStyle = '#0b0c10';
    ctx.fillRect(0, 0, cw, ch);
  }

  // Active clips in visual tracks, sorted by layer order:
  // Tracks array bottom to top: video (base), stickers, text (top)
  const visualTracks = [...project.tracks].reverse().filter((t) => !t.hidden && t.type !== 'audio');
  const activeVideoClipIds = new Set<string>();

  for (const track of visualTracks) {
    for (const clip of track.clips) {
      const clipStart = clip.start;
      const clipEnd = clip.start + clip.duration;

      if (currentTime >= clipStart && currentTime < clipEnd) {
        if (clip.type === 'video' && clip.mediaUrl) {
          activeVideoClipIds.add(clip.id);
        }
        renderClip(ctx, clip, track, currentTime, cw, ch, options);
      }
    }
  }

  // Ensure any cached video elements outside the current playhead are paused
  videoElementsCache.forEach((el, id) => {
    if (!activeVideoClipIds.has(id)) {
      if (!el.paused) {
        el.pause();
      }
    }
  });

  // Render Safe-Area Guides & Grid (if enabled in UI preview)
  if (options.showSafeGuides && !options.isExporting) {
    renderSafeGuides(ctx, project.aspectRatio, cw, ch);
  }

  if (options.showGrid && !options.isExporting) {
    renderGridGuides(ctx, cw, ch);
  }

  ctx.restore();
}

function renderClip(
  ctx: CanvasRenderingContext2D,
  clip: Clip,
  track: Track,
  currentTime: number,
  canvasW: number,
  canvasH: number,
  options: RenderOptions
) {
  ctx.save();

  // Interpolated properties with Keyframes
  const posX = getInterpolatedProperty(clip, 'x', currentTime, clip.x);
  const posY = getInterpolatedProperty(clip, 'y', currentTime, clip.y);
  const scale = getInterpolatedProperty(clip, 'scale', currentTime, clip.scale);
  const rotation = getInterpolatedProperty(clip, 'rotation', currentTime, clip.rotation);
  let opacity = getInterpolatedProperty(clip, 'opacity', currentTime, clip.opacity);

  // Calculate Transition In / Transition Out
  const clipElapsed = currentTime - clip.start;
  const clipRemaining = clip.duration - clipElapsed;

  let transitionTransformX = 0;
  let transitionTransformY = 0;
  let transitionScale = 1;

  if (clip.transitionIn && clip.transitionIn.duration > 0 && clipElapsed < clip.transitionIn.duration) {
    const t = clipElapsed / clip.transitionIn.duration;
    if (clip.transitionIn.type === 'fade' || clip.transitionIn.type === 'dissolve') {
      opacity *= t;
    } else if (clip.transitionIn.type === 'slide-left') {
      transitionTransformX = canvasW * (1 - t);
    } else if (clip.transitionIn.type === 'slide-right') {
      transitionTransformX = -canvasW * (1 - t);
    } else if (clip.transitionIn.type === 'zoom-in') {
      transitionScale = 0.5 + 0.5 * t;
      opacity *= t;
    } else if (clip.transitionIn.type === 'glitch') {
      if (Math.random() > 0.4) {
        transitionTransformX = (Math.random() - 0.5) * 30;
      }
    }
  }

  if (clip.transitionOut && clip.transitionOut.duration > 0 && clipRemaining < clip.transitionOut.duration) {
    const t = clipRemaining / clip.transitionOut.duration;
    if (clip.transitionOut.type === 'fade' || clip.transitionOut.type === 'dissolve') {
      opacity *= t;
    } else if (clip.transitionOut.type === 'slide-left') {
      transitionTransformX = -canvasW * (1 - t);
    } else if (clip.transitionOut.type === 'slide-right') {
      transitionTransformX = canvasW * (1 - t);
    } else if (clip.transitionOut.type === 'zoom-out') {
      transitionScale = 1 - 0.5 * (1 - t);
      opacity *= t;
    }
  }

  ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
  ctx.globalCompositeOperation = (clip.blendMode || 'source-over') as GlobalCompositeOperation;

  // Center coordinate space
  const centerX = canvasW / 2 + (posX / 100) * canvasW + transitionTransformX;
  const centerY = canvasH / 2 + (posY / 100) * canvasH + transitionTransformY;

  ctx.translate(centerX, centerY);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(
    scale * transitionScale * (clip.flipH ? -1 : 1),
    scale * transitionScale * (clip.flipV ? -1 : 1)
  );

  // Apply Special Shakes & Pulses
  if (clip.effectType === 'camera-shake') {
    const shakeAmount = (clip.effectIntensity || 50) * 0.15;
    const sx = (Math.sin(currentTime * 30) + Math.cos(currentTime * 17)) * shakeAmount;
    const sy = (Math.cos(currentTime * 23) + Math.sin(currentTime * 11)) * shakeAmount;
    ctx.translate(sx, sy);
  } else if (clip.effectType === 'zoom-pulse') {
    const pulseFactor = 1 + Math.sin(currentTime * 12) * 0.05 * ((clip.effectIntensity || 50) / 50);
    ctx.scale(pulseFactor, pulseFactor);
  }

  // Apply Filter CSS
  const filterPreset = FILTERS_LIST.find((f) => f.id === clip.filter);
  if (filterPreset && filterPreset.id !== 'none') {
    const intensity = (clip.filterIntensity ?? 80) / 100;
    ctx.filter = filterPreset.cssFilter(intensity);
  } else {
    // Build filter string from adjustments
    const adj = clip.adjustments;
    if (adj) {
      const b = 100 + adj.brightness;
      const c = 100 + adj.contrast;
      const s = 100 + adj.saturation;
      const h = adj.temperature * 0.5;
      ctx.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%) hue-rotate(${h}deg)`;
    }
  }

  // Apply Shape Mask
  if (clip.mask && clip.mask.type !== 'none') {
    applyClipMask(ctx, clip.mask, canvasW, canvasH);
  }

  // Apply Crop
  if (clip.crop) {
    const { top = 0, bottom = 0, left = 0, right = 0 } = clip.crop;
    if (top > 0 || bottom > 0 || left > 0 || right > 0) {
      const cropW = canvasW * (1 - (left + right) / 100);
      const cropH = canvasH * (1 - (top + bottom) / 100);
      const cropX = -canvasW / 2 + (left / 100) * canvasW;
      const cropY = -canvasH / 2 + (top / 100) * canvasH;
      ctx.beginPath();
      ctx.rect(cropX, cropY, cropW, cropH);
      ctx.clip();
    }
  }

  // Draw Specific Clip Type
  if (clip.type === 'color') {
    drawColorClip(ctx, clip, canvasW, canvasH, currentTime);
  } else if (clip.type === 'video' && clip.mediaUrl) {
    drawVideoClip(ctx, clip, currentTime, canvasW, canvasH, options.isPlaying, track);
  } else if (clip.type === 'image' && clip.mediaUrl) {
    drawImageClip(ctx, clip, canvasW, canvasH);
  } else if (clip.type === 'text' && clip.textProps) {
    drawTextClip(ctx, clip.textProps, clipElapsed, canvasW, canvasH);
  } else if (clip.type === 'sticker') {
    drawStickerClip(ctx, clip, canvasW, canvasH);
  }

  // Apply Glitch / RGB Split / VHS post-process overlays
  applyPostEffects(ctx, clip, canvasW, canvasH, currentTime);

  // Selected Clip Bounding Box (in Preview Mode)
  if (options.selectedClipId === clip.id && !options.isExporting) {
    ctx.filter = 'none';
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    const boxW = canvasW * 0.4;
    const boxH = canvasH * 0.25;
    ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);

    // Corner transform handles
    ctx.setLineDash([]);
    ctx.fillStyle = '#06b6d4';
    const corners = [
      [-boxW / 2, -boxH / 2],
      [boxW / 2, -boxH / 2],
      [-boxW / 2, boxH / 2],
      [boxW / 2, boxH / 2],
    ];
    corners.forEach(([cx, cy]) => {
      ctx.fillRect(cx - 5, cy - 5, 10, 10);
    });
  }

  ctx.restore();
}

function drawColorClip(
  ctx: CanvasRenderingContext2D,
  clip: Clip,
  canvasW: number,
  canvasH: number,
  currentTime: number
) {
  // Rich procedural dynamic visual for color/demo clips
  const baseColor = clip.color || '#1e1b4b';
  const w = canvasW;
  const h = canvasH;

  const grad = ctx.createRadialGradient(0, 0, 50, 0, 0, Math.max(w, h));
  grad.addColorStop(0, adjustBrightness(baseColor, 30));
  grad.addColorStop(1, baseColor);

  ctx.fillStyle = grad;
  ctx.fillRect(-w / 2, -h / 2, w, h);

  // Dynamic aesthetic lines & geometric motion
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;

  const t = currentTime * 0.8;
  for (let i = -3; i <= 3; i++) {
    const yOff = i * 80 + Math.sin(t + i) * 30;
    ctx.beginPath();
    ctx.moveTo(-w / 2, yOff);
    ctx.bezierCurveTo(-w / 4, yOff + 40, w / 4, yOff - 40, w / 2, yOff);
    ctx.stroke();
  }
  ctx.restore();
}

function drawVideoClip(
  ctx: CanvasRenderingContext2D,
  clip: Clip,
  currentTime: number,
  canvasW: number,
  canvasH: number,
  isPlaying?: boolean,
  track?: Track
) {
  const videoEl = getVideoElement(clip.id, clip.mediaUrl!);
  const targetTime = clip.freezeFrame
    ? clip.sourceStart
    : Math.max(0, (currentTime - clip.start) * clip.speed + clip.sourceStart);

  // Sync Video Audio volume and Mute directly on the video element for native, perfectly synchronized AV playback
  const isMuted = Boolean(track?.muted || clip.audioProps?.mute);
  const trackVol = track?.volume ?? 1;
  const clipVol = clip.audioProps?.volume ?? 1;
  videoEl.muted = isMuted;
  videoEl.volume = isMuted ? 0 : Math.min(Math.max(trackVol * clipVol, 0), 1);

  if (isPlaying && !clip.freezeFrame) {
    videoEl.playbackRate = clip.speed || 1;
    // Only seek if video drifted by more than 0.25s or is paused/unstarted
    if (videoEl.paused || Math.abs(videoEl.currentTime - targetTime) > 0.25) {
      videoEl.currentTime = targetTime;
    }
    if (videoEl.paused) {
      videoEl.play().catch(() => {});
    }
  } else {
    if (!videoEl.paused) {
      videoEl.pause();
    }
    if (Math.abs(videoEl.currentTime - targetTime) > 0.05) {
      videoEl.currentTime = targetTime;
    }
  }

  const vw = videoEl.videoWidth || canvasW;
  const vh = videoEl.videoHeight || canvasH;

  const aspect = vw / vh;
  let drawW = canvasW;
  let drawH = canvasW / aspect;
  if (drawH < canvasH) {
    drawH = canvasH;
    drawW = canvasH * aspect;
  }

  try {
    if (videoEl.readyState >= 1) {
      ctx.drawImage(videoEl, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
    }
  } catch {
    // If not ready yet, draw placeholder
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
  }
}

function drawImageClip(
  ctx: CanvasRenderingContext2D,
  clip: Clip,
  canvasW: number,
  canvasH: number
) {
  const imgEl = getImageElement(clip.id, clip.mediaUrl!);
  if (!imgEl.complete) {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-canvasW / 2, -canvasH / 2, canvasW, canvasH);
    return;
  }

  const iw = imgEl.naturalWidth || canvasW;
  const ih = imgEl.naturalHeight || canvasH;
  const aspect = iw / ih;

  let drawW = canvasW;
  let drawH = canvasW / aspect;
  if (drawH < canvasH) {
    drawH = canvasH;
    drawW = canvasH * aspect;
  }

  ctx.drawImage(imgEl, -drawW / 2, -drawH / 2, drawW, drawH);
}

function drawTextClip(
  ctx: CanvasRenderingContext2D,
  props: import('../types/editor').TextClipProperties,
  clipElapsed: number,
  canvasW: number,
  canvasH: number
) {
  const fontSize = props.fontSize || 48;
  const fontFam = props.fontFamily || 'Outfit';
  const weight = props.fontWeight || '700';

  ctx.font = `${weight} ${fontSize}px "${fontFam}", sans-serif`;
  ctx.textAlign = (props.align || 'center') as CanvasTextAlign;
  ctx.textBaseline = 'middle';

  let displayText = props.text;

  // Typewriter animation
  if (props.animation === 'typewriter') {
    const charsToShow = Math.floor(clipElapsed * 15);
    displayText = props.text.slice(0, Math.max(1, charsToShow));
  }

  const metrics = ctx.measureText(displayText);
  const textWidth = metrics.width;
  const textHeight = fontSize * 1.2;

  // Optional Background Badge
  if (props.bgColor) {
    ctx.save();
    ctx.fillStyle = props.bgColor;
    const pad = props.bgPadding || 16;
    const rad = props.bgRadius || 8;
    const bx = -textWidth / 2 - pad;
    const by = -textHeight / 2 - pad / 2;
    const bw = textWidth + pad * 2;
    const bh = textHeight + pad;

    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, rad);
    ctx.fill();
    ctx.restore();
  }

  // Shadow
  if (props.shadowColor) {
    ctx.shadowColor = props.shadowColor;
    ctx.shadowBlur = props.shadowBlur || 15;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 4;
  }

  // Stroke Outline
  if (props.strokeColor && props.strokeWidth) {
    ctx.strokeStyle = props.strokeColor;
    ctx.lineWidth = props.strokeWidth;
    ctx.strokeText(displayText, 0, 0);
  }

  // Fill (Gradient or Solid)
  if (props.gradient?.enabled) {
    const grad = ctx.createLinearGradient(
      -textWidth / 2,
      0,
      textWidth / 2,
      props.gradient.direction === 'vertical' ? textHeight : 0
    );
    grad.addColorStop(0, props.gradient.from);
    grad.addColorStop(1, props.gradient.to);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = props.color || '#ffffff';
  }

  // Karaoke Animation: Word Highlighting
  if (props.animation === 'karaoke' && props.isCaption) {
    const words = displayText.split(' ');
    const activeIndex = Math.min(
      words.length - 1,
      Math.floor((clipElapsed / 3) * words.length)
    );

    // Render non-highlighted then highlighted word
    ctx.fillText(displayText, 0, 0);

    // Overlay highlighted karaoke word with glowing color
    ctx.save();
    ctx.fillStyle = props.karaokeColor || '#06b6d4';
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 20;
    // Draw active highlight text
    ctx.restore();
  } else {
    ctx.fillText(displayText, 0, 0);
  }
}

function drawStickerClip(
  ctx: CanvasRenderingContext2D,
  clip: Clip,
  canvasW: number,
  canvasH: number
) {
  if (clip.stickerEmoji) {
    const size = 100 * (clip.scale || 1);
    ctx.font = `${size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(clip.stickerEmoji, 0, 0);
  } else if (clip.stickerUrl) {
    const img = getImageElement(clip.id, clip.stickerUrl);
    if (img.complete) {
      const sw = 160;
      const sh = 160;
      ctx.drawImage(img, -sw / 2, -sh / 2, sw, sh);
    }
  }
}

function applyClipMask(ctx: CanvasRenderingContext2D, mask: import('../types/editor').MaskConfig, w: number, h: number) {
  const size = (mask.size || 50) * 0.01 * Math.min(w, h);
  const mx = (mask.x || 0) * 0.01 * w;
  const my = (mask.y || 0) * 0.01 * h;

  ctx.beginPath();
  if (mask.type === 'circle') {
    ctx.arc(mx, my, size, 0, Math.PI * 2);
  } else if (mask.type === 'rectangle') {
    ctx.rect(mx - size, my - size * 0.6, size * 2, size * 1.2);
  } else if (mask.type === 'heart') {
    const s = size * 0.8;
    ctx.moveTo(mx, my + s * 0.3);
    ctx.bezierCurveTo(mx - s, my - s * 0.8, mx - s * 1.5, my + s * 0.5, mx, my + s * 1.5);
    ctx.bezierCurveTo(mx + s * 1.5, my + s * 0.5, mx + s, my - s * 0.8, mx, my + s * 0.3);
  } else if (mask.type === 'star') {
    const rOuter = size;
    const rInner = size * 0.45;
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? rOuter : rInner;
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      const px = mx + Math.cos(angle) * r;
      const py = my + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
  ctx.clip();
}

function applyPostEffects(
  ctx: CanvasRenderingContext2D,
  clip: Clip,
  canvasW: number,
  canvasH: number,
  currentTime: number
) {
  const intensity = (clip.effectIntensity ?? 50) / 100;
  const fx = clip.effectType;
  if (!fx) return;

  ctx.save();

  if (fx === 'vhs-scanlines') {
    ctx.fillStyle = `rgba(0, 0, 0, ${0.15 + 0.25 * intensity})`;
    for (let y = -canvasH / 2; y < canvasH / 2; y += 5) {
      ctx.fillRect(-canvasW / 2, y, canvasW, 2);
    }
  } else if (fx === 'vhs-tracking') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    const trackY = (canvasH / 2) - 40 + Math.sin(currentTime * 15) * 20;
    for (let i = 0; i < 20; i++) {
      const rx = (Math.random() - 0.5) * canvasW;
      const rw = Math.random() * 80 + 20;
      ctx.fillRect(rx, trackY + (Math.random() * 15), rw, 2);
    }
  } else if (fx === 'glitch-rgb') {
    ctx.globalCompositeOperation = 'screen';
    const shift = 8 * intensity;
    ctx.fillStyle = 'rgba(255, 0, 60, 0.2)';
    ctx.fillRect(-canvasW / 2 + shift, -canvasH / 2, canvasW, canvasH);
    ctx.fillStyle = 'rgba(0, 220, 255, 0.2)';
    ctx.fillRect(-canvasW / 2 - shift, -canvasH / 2, canvasW, canvasH);
  } else if (fx === 'glitch-slice') {
    ctx.globalCompositeOperation = 'difference';
    for (let i = 0; i < 4; i++) {
      const sliceY = -canvasH / 2 + ((currentTime * 130 + i * 180) % canvasH);
      const sliceH = 15 * intensity;
      const shiftX = (Math.sin(currentTime * 40 + i) * 25) * intensity;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fillRect(-canvasW / 2 + shiftX, sliceY, canvasW, sliceH);
    }
  } else if (fx === 'film-grain') {
    ctx.globalAlpha = 0.06 + 0.1 * intensity;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 350; i++) {
      const gx = (Math.random() - 0.5) * canvasW;
      const gy = (Math.random() - 0.5) * canvasH;
      ctx.fillRect(gx, gy, 2, 2);
    }
  } else if (fx === 'film-scratches') {
    ctx.globalAlpha = 0.25 * intensity;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const sx = (Math.sin(currentTime * 50 + i * 2) * canvasW * 0.4);
      ctx.beginPath();
      ctx.moveTo(sx, -canvasH / 2);
      ctx.lineTo(sx + (Math.random() - 0.5) * 4, canvasH / 2);
      ctx.stroke();
    }
  } else if (fx === 'tv-static') {
    ctx.globalAlpha = 0.12 * intensity;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 600; i++) {
      const sx = (Math.random() - 0.5) * canvasW;
      const sy = (Math.random() - 0.5) * canvasH;
      ctx.fillRect(sx, sy, 3, 3);
    }
  } else if (fx === 'light-leak') {
    const leakGrad = ctx.createRadialGradient(-canvasW * 0.3, -canvasH * 0.3, 10, -canvasW * 0.3, -canvasH * 0.3, canvasW * 0.6);
    leakGrad.addColorStop(0, `rgba(251, 146, 60, ${0.4 * intensity})`);
    leakGrad.addColorStop(0.5, `rgba(244, 63, 94, ${0.2 * intensity})`);
    leakGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = leakGrad;
    ctx.fillRect(-canvasW / 2, -canvasH / 2, canvasW, canvasH);
  } else if (fx === 'lens-flare-sun') {
    const fxCenter = canvasW * 0.25;
    const fyCenter = -canvasH * 0.25;
    const flareGrad = ctx.createRadialGradient(fxCenter, fyCenter, 5, fxCenter, fyCenter, canvasW * 0.4);
    flareGrad.addColorStop(0, `rgba(255, 255, 255, ${0.8 * intensity})`);
    flareGrad.addColorStop(0.2, `rgba(253, 224, 71, ${0.4 * intensity})`);
    flareGrad.addColorStop(0.6, `rgba(244, 63, 94, ${0.15 * intensity})`);
    flareGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = flareGrad;
    ctx.fillRect(-canvasW / 2, -canvasH / 2, canvasW, canvasH);
  } else if (fx === 'edge-glow') {
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
    ctx.lineWidth = 12 * intensity;
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 25 * intensity;
    ctx.strokeRect(-canvasW / 2, -canvasH / 2, canvasW, canvasH);
  } else if (fx === 'vignette-cinematic') {
    const vigGrad = ctx.createRadialGradient(0, 0, canvasW * 0.25, 0, 0, Math.max(canvasW, canvasH) * 0.65);
    vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vigGrad.addColorStop(1, `rgba(0, 0, 0, ${0.65 * intensity})`);
    ctx.fillStyle = vigGrad;
    ctx.fillRect(-canvasW / 2, -canvasH / 2, canvasW, canvasH);
  } else if (fx === 'cinema-bars') {
    ctx.fillStyle = '#000000';
    const barH = canvasH * 0.12;
    ctx.fillRect(-canvasW / 2, -canvasH / 2, canvasW, barH);
    ctx.fillRect(-canvasW / 2, canvasH / 2 - barH, canvasW, barH);
  } else if (fx === 'rain-drops') {
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.4)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 40; i++) {
      const rx = ((i * 47 + currentTime * 800) % canvasW) - canvasW / 2;
      const ry = ((i * 89 + currentTime * 1200) % canvasH) - canvasH / 2;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 8, ry + 24);
      ctx.stroke();
    }
  } else if (fx === 'snow-particles') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    for (let i = 0; i < 50; i++) {
      const sx = ((i * 61 + Math.sin(currentTime + i) * 60) % canvasW) - canvasW / 2;
      const sy = ((i * 43 + currentTime * 90) % canvasH) - canvasH / 2;
      const size = 1.5 + (i % 3);
      ctx.beginPath();
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (fx === 'fireflies-sparkles' || fx === 'sparkle-stars') {
    ctx.fillStyle = '#fde047';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 10;
    for (let i = 0; i < 20; i++) {
      const fx = Math.sin(currentTime * 0.8 + i) * canvasW * 0.4;
      const fy = Math.cos(currentTime * 0.6 + i * 2) * canvasH * 0.4;
      const s = (Math.sin(currentTime * 3 + i) * 0.5 + 0.5) * 3 + 1;
      ctx.beginPath();
      ctx.arc(fx, fy, s, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (fx === 'heart-sparkles') {
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < 8; i++) {
      const hx = ((i * 120 + currentTime * 40) % canvasW) - canvasW / 2;
      const hy = ((i * 150 - currentTime * 80) % canvasH);
      ctx.globalAlpha = (Math.sin(currentTime * 2 + i) * 0.3 + 0.5) * intensity;
      ctx.fillText('💖', hx, hy);
    }
  } else if (fx === 'night-vision') {
    ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
    ctx.fillRect(-canvasW / 2, -canvasH / 2, canvasW, canvasH);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    for (let y = -canvasH / 2; y < canvasH / 2; y += 4) {
      ctx.fillRect(-canvasW / 2, y, canvasW, 1);
    }
  } else if (fx === 'cyber-grid') {
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.35)';
    ctx.lineWidth = 1.5;
    const startY = canvasH * 0.15;
    for (let y = startY; y < canvasH / 2; y += 15) {
      ctx.beginPath();
      ctx.moveTo(-canvasW / 2, y);
      ctx.lineTo(canvasW / 2, y);
      ctx.stroke();
    }
    for (let x = -canvasW / 2; x < canvasW / 2; x += 35) {
      ctx.beginPath();
      ctx.moveTo(0, startY);
      ctx.lineTo(x * 1.5, canvasH / 2);
      ctx.stroke();
    }
  } else if (fx === 'duotone-magenta') {
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = `rgba(236, 72, 153, ${0.25 * intensity})`;
    ctx.fillRect(-canvasW / 2, -canvasH / 2, canvasW, canvasH);
  } else if (fx === 'strobe-flash') {
    if (Math.sin(currentTime * 20) > 0.7) {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.45 * intensity})`;
      ctx.fillRect(-canvasW / 2, -canvasH / 2, canvasW, canvasH);
    }
  }

  ctx.restore();
}

function renderSafeGuides(ctx: CanvasRenderingContext2D, ratio: AspectRatio, w: number, h: number) {
  ctx.save();
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.7)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  if (ratio === '9:16') {
    // TikTok/Shorts UI safe areas (top 15%, bottom 20%, right 15%)
    ctx.strokeRect(w * 0.05, h * 0.12, w * 0.78, h * 0.68);
    ctx.fillStyle = 'rgba(6, 182, 212, 0.8)';
    ctx.font = '12px sans-serif';
    ctx.fillText('TikTok / Shorts Safe Zone', w * 0.08, h * 0.15);
  } else {
    // 90% action safe & 80% title safe
    ctx.strokeRect(w * 0.05, h * 0.05, w * 0.9, h * 0.9);
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.6)';
    ctx.strokeRect(w * 0.1, h * 0.1, w * 0.8, h * 0.8);
  }

  ctx.restore();
}

function renderGridGuides(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 4]);

  // Rule of thirds
  ctx.beginPath();
  ctx.moveTo(w / 3, 0);
  ctx.lineTo(w / 3, h);
  ctx.moveTo((2 * w) / 3, 0);
  ctx.lineTo((2 * w) / 3, h);
  ctx.moveTo(0, h / 3);
  ctx.lineTo(w, h / 3);
  ctx.moveTo(0, (2 * h) / 3);
  ctx.lineTo(w, (2 * h) / 3);
  ctx.stroke();

  ctx.restore();
}

function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;
  return `#${(
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  )
    .toString(16)
    .slice(1)}`;
}
