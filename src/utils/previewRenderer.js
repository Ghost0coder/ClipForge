 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { ASPECT_RATIOS, } from '../types/editor';
import { FILTERS_LIST } from './sampleData';
import { toastError } from '../store/toastStore';
import { useEditorStore } from '../store/editorStore';
import { getSpeedCurveSourceTime, applyAdvancedColorGrading } from './colorGradingUtils';
import { renderTransition, TRANSITIONS_REGISTRY } from './transitions';
import { ANIMATIONS_REGISTRY, applyEasing } from './animations';











// Media element cache to prevent reloading during playback
const videoElementsCache = new Map();
const imageElementsCache = new Map();

export function getVideoElement(clipId, url) {
  let el = videoElementsCache.get(clipId);
  if (!el || el.src !== url) {
    el = document.createElement('video');
    if (url.startsWith('http://') || url.startsWith('https://')) {
      el.crossOrigin = 'anonymous';
    }
    el.src = url;
    el.playsInline = true;
    const currentEl = el;
    el.onerror = () => {
      console.error('[ClipForge:Play] Video element playback/decode error on clip:', clipId, currentEl.error);
      toastError(`Video error on clip (${clipId}): Failed to load or decode video media`, 'Media Playback Error');
    };
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

export function pauseAllVideos() {
  videoElementsCache.forEach((el) => {
    if (!el.paused) {
      el.pause();
    }
  });
}

export function getImageElement(clipId, url) {
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
export function getInterpolatedProperty(
  clip,
  prop,
  currentTime,
  defaultValue
) {
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

let scratchCanvasOut = null;
let scratchCanvasIn = null;

function getScratchCanvases(w, h) {
  if (typeof document === 'undefined') return { canvasOut: null, ctxOut: null, canvasIn: null, ctxIn: null };
  if (!scratchCanvasOut || scratchCanvasOut.width !== w || scratchCanvasOut.height !== h) {
    scratchCanvasOut = document.createElement('canvas');
    scratchCanvasOut.width = w;
    scratchCanvasOut.height = h;
  }
  if (!scratchCanvasIn || scratchCanvasIn.width !== w || scratchCanvasIn.height !== h) {
    scratchCanvasIn = document.createElement('canvas');
    scratchCanvasIn.width = w;
    scratchCanvasIn.height = h;
  }
  const ctxOut = scratchCanvasOut.getContext('2d');
  const ctxIn = scratchCanvasIn.getContext('2d');
  ctxOut.clearRect(0, 0, w, h);
  ctxIn.clearRect(0, 0, w, h);
  return { canvasOut: scratchCanvasOut, ctxOut, canvasIn: scratchCanvasIn, ctxIn };
}

export function renderFrame(
  ctx,
  project,
  currentTime,
  options = {}
) {
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
  const activeVideoClipIds = new Set();

  for (const track of visualTracks) {
    const sortedClips = [...track.clips].sort((a, b) => a.start - b.start);
    const handledClipIds = new Set();

    // 1. Check for cut transitions between adjacent clips
    for (let i = 0; i < sortedClips.length; i++) {
      const clipB = sortedClips[i];
      if (i > 0) {
        const clipA = sortedClips[i - 1];
        const gap = clipB.start - (clipA.start + clipA.duration);
        if (gap < 0.5 && gap > -0.5 && clipB.transitionIn && clipB.transitionIn.type) {
          const transDur = clipB.transitionIn.duration || 0.6;
          const cutTime = clipB.start;
          const transStart = cutTime - transDur / 2;
          const transEnd = cutTime + transDur / 2;

          if (currentTime >= transStart && currentTime < transEnd) {
            const rawProgress = (currentTime - transStart) / transDur;
            const { canvasOut, ctxOut, canvasIn, ctxIn } = getScratchCanvases(cw, ch);
            if (canvasOut && canvasIn) {
              if (clipA.type === 'video' && clipA.mediaUrl) activeVideoClipIds.add(clipA.id);
              if (clipB.type === 'video' && clipB.mediaUrl) activeVideoClipIds.add(clipB.id);

              renderClip(ctxOut, clipA, track, Math.min(clipA.start + clipA.duration - 0.001, currentTime), cw, ch, { ...options, isTransitionSubrender: true });
              renderClip(ctxIn, clipB, track, Math.max(clipB.start, currentTime), cw, ch, { ...options, isTransitionSubrender: true });

              renderTransition(ctx, clipB.transitionIn.type, canvasOut, canvasIn, rawProgress, cw, ch, clipB.transitionIn);
              handledClipIds.add(clipA.id);
              handledClipIds.add(clipB.id);
              continue;
            }
          }
        }
      }

      // 2. Check first clip In-Transition (Fade/wipe from black or transparent)
      if (i === 0 && clipB.transitionIn && clipB.transitionIn.type) {
        const transDur = clipB.transitionIn.duration || 0.6;
        if (currentTime >= clipB.start && currentTime < clipB.start + transDur) {
          const rawProgress = (currentTime - clipB.start) / transDur;
          const { canvasOut, ctxOut, canvasIn, ctxIn } = getScratchCanvases(cw, ch);
          if (canvasOut && canvasIn) {
            if (clipB.type === 'video' && clipB.mediaUrl) activeVideoClipIds.add(clipB.id);
            renderClip(ctxIn, clipB, track, currentTime, cw, ch, { ...options, isTransitionSubrender: true });
            renderTransition(ctx, clipB.transitionIn.type, canvasOut, canvasIn, rawProgress, cw, ch, clipB.transitionIn);
            handledClipIds.add(clipB.id);
            continue;
          }
        }
      }

      // 3. Check last clip Out-Transition (Fade/wipe to black or transparent)
      if (clipB.transitionOut && clipB.transitionOut.type) {
        const isLastOnTrack = (i === sortedClips.length - 1) || (sortedClips[i + 1].start - (clipB.start + clipB.duration) >= 0.5);
        if (isLastOnTrack) {
          const transDur = clipB.transitionOut.duration || 0.6;
          const transStart = clipB.start + clipB.duration - transDur;
          if (currentTime >= transStart && currentTime < clipB.start + clipB.duration) {
            const rawProgress = (currentTime - transStart) / transDur;
            const { canvasOut, ctxOut, canvasIn, ctxIn } = getScratchCanvases(cw, ch);
            if (canvasOut && canvasIn) {
              if (clipB.type === 'video' && clipB.mediaUrl) activeVideoClipIds.add(clipB.id);
              renderClip(ctxOut, clipB, track, currentTime, cw, ch, { ...options, isTransitionSubrender: true });
              renderTransition(ctx, clipB.transitionOut.type, canvasOut, canvasIn, rawProgress, cw, ch, clipB.transitionOut);
              handledClipIds.add(clipB.id);
              continue;
            }
          }
        }
      }

      // Default rendering if not inside a transition window
      if (!handledClipIds.has(clipB.id)) {
        const clipStart = clipB.start;
        const clipEnd = clipB.start + clipB.duration;
        if (currentTime >= clipStart && currentTime < clipEnd) {
          if (clipB.type === 'video' && clipB.mediaUrl) {
            activeVideoClipIds.add(clipB.id);
          }
          renderClip(ctx, clipB, track, currentTime, cw, ch, options);
        }
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
  ctx,
  clip,
  track,
  currentTime,
  canvasW,
  canvasH,
  options
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
  let transitionRotation = 0;

  const isTransitionSubrender = Boolean(options.isTransitionSubrender);

  if (!isTransitionSubrender && clip.transitionIn && clip.transitionIn.duration > 0 && clipElapsed < clip.transitionIn.duration) {
    const t = Math.max(0, Math.min(1, clipElapsed / clip.transitionIn.duration));
    const transType = clip.transitionIn.type;

    if (transType === 'fade' || transType === 'dissolve') {
      opacity *= t;
    } else if (transType === 'slide-left') {
      transitionTransformX = canvasW * (1 - t);
    } else if (transType === 'slide-right') {
      transitionTransformX = -canvasW * (1 - t);
    } else if (transType === 'slide-up') {
      transitionTransformY = canvasH * (1 - t);
    } else if (transType === 'slide-down') {
      transitionTransformY = -canvasH * (1 - t);
    } else if (transType === 'zoom-in') {
      transitionScale = 0.5 + 0.5 * t;
      opacity *= t;
    } else if (transType === 'zoom-out') {
      transitionScale = 1.4 - 0.4 * t;
      opacity *= t;
    } else if (transType === 'spin') {
      transitionRotation = (1 - t) * 360;
      transitionScale = 0.6 + 0.4 * t;
      opacity *= t;
    } else if (transType === 'wipe-left') {
      ctx.beginPath();
      ctx.rect(-canvasW / 2, -canvasH / 2, canvasW * t, canvasH);
      ctx.clip();
    } else if (transType === 'wipe-right') {
      ctx.beginPath();
      ctx.rect(canvasW / 2 - canvasW * t, -canvasH / 2, canvasW * t, canvasH);
      ctx.clip();
    } else if (transType === 'glitch') {
      if (Math.random() > 0.3) {
        transitionTransformX = (Math.random() - 0.5) * 35;
      }
      if (Math.random() > 0.6) {
        opacity *= 0.65;
      }
    } else if (transType === 'flash-white' || transType === 'flash') {
      opacity = Math.min(1, opacity + (1 - t) * 0.4);
    }
  }

  if (!isTransitionSubrender && clip.transitionOut && clip.transitionOut.duration > 0 && clipRemaining < clip.transitionOut.duration) {
    const t = Math.max(0, Math.min(1, clipRemaining / clip.transitionOut.duration));
    const transType = clip.transitionOut.type;

    if (transType === 'fade' || transType === 'dissolve') {
      opacity *= t;
    } else if (transType === 'slide-left') {
      transitionTransformX = -canvasW * (1 - t);
    } else if (transType === 'slide-right') {
      transitionTransformX = canvasW * (1 - t);
    } else if (transType === 'slide-up') {
      transitionTransformY = -canvasH * (1 - t);
    } else if (transType === 'slide-down') {
      transitionTransformY = canvasH * (1 - t);
    } else if (transType === 'zoom-out') {
      transitionScale = 1 - 0.4 * (1 - t);
      opacity *= t;
    } else if (transType === 'spin') {
      transitionRotation = -(1 - t) * 360;
      opacity *= t;
    }
  }

  // Data-driven 80+ Animations Engine (In, Out, Loop)
  let animTransformX = 0;
  let animTransformY = 0;
  let animScale = 1;
  let animRotation = 0;
  let animOpacity = 1;
  let animBlur = 0;

  // In Animation
  const inAnimId = clip.animationIn || (clip.textProps && clip.textProps.animation);
  const inDur = clip.animationInDuration || 0.6;
  if (inAnimId && inAnimId !== 'none' && clipElapsed < inDur) {
    const rawT = Math.max(0, Math.min(1, clipElapsed / inDur));
    const easing = clip.animationInEasing || 'easeInOut';
    const t = applyEasing(rawT, easing);
    const animObj = ANIMATIONS_REGISTRY[inAnimId];
    if (animObj && typeof animObj.compute === 'function') {
      const res = animObj.compute(t, 0, 1);
      if (res.opacity !== undefined) animOpacity *= res.opacity;
      if (res.scale !== undefined) animScale *= res.scale;
      if (res.x !== undefined) animTransformX += res.x;
      if (res.y !== undefined) animTransformY += res.y;
      if (res.rotation !== undefined) animRotation += res.rotation;
      if (res.blur !== undefined) animBlur += res.blur;
    }
  }

  // Out Animation
  const outAnimId = clip.animationOut;
  const outDur = clip.animationOutDuration || 0.6;
  if (outAnimId && outAnimId !== 'none' && clipRemaining < outDur) {
    const rawT = Math.max(0, Math.min(1, clipRemaining / outDur));
    const easing = clip.animationOutEasing || 'easeInOut';
    const t = applyEasing(rawT, easing);
    const animObj = ANIMATIONS_REGISTRY[outAnimId];
    if (animObj && typeof animObj.compute === 'function') {
      const res = animObj.compute(t, 0, 1);
      if (res.opacity !== undefined) animOpacity *= res.opacity;
      if (res.scale !== undefined) animScale *= res.scale;
      if (res.x !== undefined) animTransformX += res.x;
      if (res.y !== undefined) animTransformY += res.y;
      if (res.rotation !== undefined) animRotation += res.rotation;
      if (res.blur !== undefined) animBlur += res.blur;
    }
  }

  // Loop / Combo Animation
  const loopAnimId = clip.animationLoop;
  const loopSpeed = clip.animationLoopSpeed || 1.0;
  if (loopAnimId && loopAnimId !== 'none') {
    const loopTime = (currentTime * loopSpeed) % 5;
    const animObj = ANIMATIONS_REGISTRY[loopAnimId];
    if (animObj && typeof animObj.compute === 'function') {
      const res = animObj.compute(loopTime / 5, 0, 1);
      if (res.scale !== undefined) animScale *= res.scale;
      if (res.x !== undefined) animTransformX += res.x;
      if (res.y !== undefined) animTransformY += res.y;
      if (res.rotation !== undefined) animRotation += res.rotation;
      if (res.opacity !== undefined) animOpacity *= res.opacity;
    }
  }

  ctx.globalAlpha = Math.max(0, Math.min(1, opacity * animOpacity));
  ctx.globalCompositeOperation = (clip.blendMode || 'source-over') ;

  // Center coordinate space
  const centerX = canvasW / 2 + (posX / 100) * canvasW + transitionTransformX + animTransformX;
  const centerY = canvasH / 2 + (posY / 100) * canvasH + transitionTransformY + animTransformY;

  ctx.translate(centerX, centerY);
  ctx.rotate(((rotation + transitionRotation + animRotation) * Math.PI) / 180);
  ctx.scale(
    scale * transitionScale * animScale * (clip.flipH ? -1 : 1),
    scale * transitionScale * animScale * (clip.flipV ? -1 : 1)
  );

  // Apply Special Shakes & Pulses
  if (clip.effectType === 'camera-shake' || clip.effectType === 'shake') {
    const shakeAmount = (clip.effectIntensity || 50) * 0.18;
    const sx = (Math.sin(currentTime * 32) + Math.cos(currentTime * 19)) * shakeAmount;
    const sy = (Math.cos(currentTime * 24) + Math.sin(currentTime * 13)) * shakeAmount;
    ctx.translate(sx, sy);
  } else if (clip.effectType === 'zoom-pulse') {
    const pulseFactor = 1 + Math.sin(currentTime * 12) * 0.06 * ((clip.effectIntensity || 50) / 50);
    ctx.scale(pulseFactor, pulseFactor);
  }

  const isComparingOriginal = Boolean(options.compareOriginal || (typeof window !== 'undefined' && useEditorStore.getState().compareOriginal));

  // Combined CSS Filter: Preset + Brightness, Contrast, Saturation, Exposure, Highlights, Shadows, Temp, Tint, Sharpen, Blur
  let baseFilter = isComparingOriginal ? 'none' : buildClipFilterString(clip);
  if (animBlur > 0.5 && !isComparingOriginal) {
    baseFilter = baseFilter === 'none' ? `blur(${animBlur.toFixed(1)}px)` : `${baseFilter} blur(${animBlur.toFixed(1)}px)`;
  }
  ctx.filter = baseFilter;

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
    drawVideoClip(ctx, clip, currentTime, canvasW, canvasH, options.isPlaying, track, isComparingOriginal);
  } else if (clip.type === 'image' && clip.mediaUrl) {
    drawImageClip(ctx, clip, canvasW, canvasH, isComparingOriginal);
  } else if (clip.type === 'compound' && clip.compoundData) {
    drawCompoundClip(ctx, clip, currentTime, canvasW, canvasH, options);
  } else if (clip.type === 'text' && clip.textProps) {
    drawTextClip(ctx, clip.textProps, clipElapsed, canvasW, canvasH, clip);
  } else if (clip.type === 'sticker') {
    drawStickerClip(ctx, clip, canvasW, canvasH);
  } else if (clip.type === 'drawing') {
    drawDrawingClip(ctx, clip, canvasW, canvasH);
  }

  // Apply Vignette from adjustments
  if (!isComparingOriginal && clip.adjustments && clip.adjustments.vignette > 0) {
    applyVignette(ctx, clip.adjustments.vignette, canvasW, canvasH);
  }

  // Apply Grain from adjustments
  if (!isComparingOriginal && clip.adjustments && clip.adjustments.grain > 0) {
    applyGrain(ctx, clip.adjustments.grain, canvasW, canvasH, currentTime);
  }

  // Apply Glitch / RGB Split / VHS post-process overlays
  applyPostEffects(ctx, clip, canvasW, canvasH, currentTime);

  // Selected Clip Bounding Box (in Preview Mode)
  if (options.selectedClipId === clip.id && !options.isExporting) {
    ctx.filter = 'none';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    const boxW = canvasW * 0.4;
    const boxH = canvasH * 0.25;
    ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);

    // Corner transform handles
    ctx.setLineDash([]);
    ctx.fillStyle = '#3b82f6';
    const corners = [
      [-boxW / 2, -boxH / 2],
      [boxW / 2, -boxH / 2],
      [-boxW / 2, boxH / 2],
      [boxW / 2, boxH / 2],
    ];
    corners.forEach(([cx, cy]) => {
      ctx.fillRect(cx - 4, cy - 4, 8, 8);
    });
  }

  ctx.restore();
}

function drawColorClip(
  ctx,
  clip,
  canvasW,
  canvasH,
  currentTime
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

function drawCompoundClip(ctx, clip, currentTime, canvasW, canvasH, options) {
  if (!clip.compoundData || !clip.compoundData.tracks) return;
  const relTime = currentTime - clip.start + (clip.sourceStart || 0);
  const visualTracks = [...clip.compoundData.tracks].reverse().filter((t) => !t.hidden && t.type !== 'audio');
  for (const track of visualTracks) {
    for (const nestedClip of track.clips) {
      if (relTime >= nestedClip.start && relTime < nestedClip.start + nestedClip.duration) {
        renderClip(ctx, nestedClip, track, relTime, canvasW, canvasH, options);
      }
    }
  }
}

let gradingCanvas = null;
let gradingCtx = null;

function hasAdvancedGrading(clip) {
  if (!clip) return false;
  const hasCurves = clip.colorCurves && Object.values(clip.colorCurves).some((pts) => pts && pts.length > 2);
  const hasHsl = clip.hsl && Object.values(clip.hsl).some((r) => r && (r.hue !== 0 || r.sat !== 0 || r.light !== 0));
  const hasWheels = clip.colorWheels && Object.values(clip.colorWheels).some((w) => w && (w.r !== 0 || w.g !== 0 || w.b !== 0 || w.brightness !== 0));
  const hasLut = clip.lut && clip.lut.id;
  return Boolean(hasCurves || hasHsl || hasWheels || hasLut);
}

function drawWithGrading(ctx, sourceEl, clip, drawW, drawH, isComparingOriginal) {
  if (isComparingOriginal || !hasAdvancedGrading(clip)) {
    ctx.drawImage(sourceEl, -drawW / 2, -drawH / 2, drawW, drawH);
    return;
  }

  const maxW = 960;
  const scale = drawW > maxW ? maxW / drawW : 1;
  const procW = Math.max(64, Math.round(drawW * scale));
  const procH = Math.max(64, Math.round(drawH * scale));

  if (!gradingCanvas) {
    gradingCanvas = document.createElement('canvas');
    gradingCtx = gradingCanvas.getContext('2d', { willReadFrequently: true });
  }
  if (gradingCanvas.width !== procW || gradingCanvas.height !== procH) {
    gradingCanvas.width = procW;
    gradingCanvas.height = procH;
  }

  gradingCtx.clearRect(0, 0, procW, procH);
  gradingCtx.drawImage(sourceEl, 0, 0, procW, procH);

  try {
    const imgData = gradingCtx.getImageData(0, 0, procW, procH);
    applyAdvancedColorGrading(imgData, clip);
    gradingCtx.putImageData(imgData, 0, 0);
    ctx.drawImage(gradingCanvas, -drawW / 2, -drawH / 2, drawW, drawH);
  } catch (e) {
    ctx.drawImage(sourceEl, -drawW / 2, -drawH / 2, drawW, drawH);
  }
}

function drawVideoClip(
  ctx,
  clip,
  currentTime,
  canvasW,
  canvasH,
  isPlaying,
  track,
  isComparingOriginal = false
) {
  const videoEl = getVideoElement(clip.id, clip.mediaUrl);
  const speed = clip.speed || 1;
  const elapsed = currentTime - clip.start;
  const isReverse = Boolean(clip.reverse);
  let effectiveSpeed = speed;
  let targetTime = 0;

  if (clip.speedMode === 'curve' && clip.speedCurvePoints && clip.speedCurvePoints.length >= 2) {
    const curveOffset = isReverse
      ? getSpeedCurveSourceTime(clip, Math.max(0, clip.duration - elapsed))
      : getSpeedCurveSourceTime(clip, Math.max(0, elapsed));
    targetTime = clip.freezeFrame ? clip.sourceStart : Math.max(0, clip.sourceStart + curveOffset);

    // Instantaneous speed calculation for smooth video playback rate
    const normT = Math.max(0, Math.min(1, elapsed / Math.max(0.1, clip.duration)));
    const sortedPts = [...clip.speedCurvePoints].sort((a, b) => a.x - b.x);
    for (let i = 0; i < sortedPts.length - 1; i++) {
      if (normT >= sortedPts[i].x && normT <= sortedPts[i + 1].x) {
        const span = Math.max(0.001, sortedPts[i + 1].x - sortedPts[i].x);
        const segT = (normT - sortedPts[i].x) / span;
        effectiveSpeed = sortedPts[i].y + segT * (sortedPts[i + 1].y - sortedPts[i].y);
        break;
      }
    }
  } else {
    targetTime = clip.freezeFrame
      ? clip.sourceStart
      : isReverse
      ? Math.max(0, clip.sourceStart + (clip.duration - elapsed) * speed)
      : Math.max(0, clip.sourceStart + elapsed * speed);
  }

  // Sync Video Audio volume and Mute directly on the video element for native, perfectly synchronized AV playback
  const isMuted = Boolean(_optionalChain([track, 'optionalAccess', _ => _.muted]) || _optionalChain([clip, 'access', _2 => _2.audioProps, 'optionalAccess', _3 => _3.mute]));
  const trackVol = _nullishCoalesce(_optionalChain([track, 'optionalAccess', _4 => _4.volume]), () => ( 1));
  const baseClipVol = _nullishCoalesce(_optionalChain([clip, 'access', _5 => _5.audioProps, 'optionalAccess', _6 => _6.volume]), () => ( 1));
  const clipVol = getInterpolatedProperty(clip, 'volume', currentTime, baseClipVol);
  videoEl.muted = isMuted;
  videoEl.volume = isMuted ? 0 : Math.min(Math.max(trackVol * clipVol, 0), 1);

  if ('preservesPitch' in videoEl) videoEl.preservesPitch = true;
  if ('mozPreservesPitch' in videoEl) videoEl.mozPreservesPitch = true;
  if ('webkitPreservesPitch' in videoEl) videoEl.webkitPreservesPitch = true;

  if (isPlaying && !clip.freezeFrame) {
    videoEl.playbackRate = Math.max(0.2, Math.min(effectiveSpeed, 8.0));
    // Only seek if video drifted by more than 0.25s or is paused/unstarted
    if (videoEl.paused || Math.abs(videoEl.currentTime - targetTime) > 0.25) {
      videoEl.currentTime = targetTime;
    }
    if (videoEl.paused) {
      videoEl.play().catch((err) => {
        console.error('[ClipForge:Play] Failed to play video element for clip:', clip.id, err);
      });
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
      if ((clip.chromaKey && clip.chromaKey.enabled) || (clip.bgRemoval && clip.bgRemoval.enabled)) {
        drawChromaOrBgRemoved(ctx, videoEl, clip, drawW, drawH);
      } else {
        drawWithGrading(ctx, videoEl, clip, drawW, drawH, isComparingOriginal);
      }
      // Smooth slow motion (frame blending) when speed is under 0.5x
      if (clip.smoothSlowMo && effectiveSpeed < 0.5) {
        ctx.save();
        ctx.globalAlpha = 0.35 * (1 - effectiveSpeed * 2);
        ctx.drawImage(videoEl, -drawW / 2 + 1, -drawH / 2, drawW, drawH);
        ctx.restore();
      }
    } else {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
    }
  } catch (e) {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
  }
}

let chromaCanvas = null;
let chromaCtx = null;

function parseHexColor(hex) {
  if (!hex) return { r: 0, g: 255, b: 0 };
  let c = hex.replace('#', '');
  if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  const num = parseInt(c, 16);
  if (isNaN(num)) return { r: 0, g: 255, b: 0 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function drawChromaOrBgRemoved(ctx, sourceEl, clip, drawW, drawH) {
  const maxW = 960;
  const scale = drawW > maxW ? maxW / drawW : 1;
  const procW = Math.max(64, Math.round(drawW * scale));
  const procH = Math.max(64, Math.round(drawH * scale));

  if (!chromaCanvas) {
    chromaCanvas = document.createElement('canvas');
    chromaCtx = chromaCanvas.getContext('2d', { willReadFrequently: true });
  }
  if (chromaCanvas.width !== procW || chromaCanvas.height !== procH) {
    chromaCanvas.width = procW;
    chromaCanvas.height = procH;
  }

  chromaCtx.clearRect(0, 0, procW, procH);
  chromaCtx.drawImage(sourceEl, 0, 0, procW, procH);

  try {
    const imgData = chromaCtx.getImageData(0, 0, procW, procH);
    const data = imgData.data;
    const len = data.length;

    // 1. Chroma Key Processing (Green/Custom color screen removal)
    if (clip.chromaKey && clip.chromaKey.enabled) {
      const keyCol = parseHexColor(clip.chromaKey.keyColor || '#00FF00');
      const tolNorm = Math.max(0, Math.min(100, clip.chromaKey.tolerance ?? clip.chromaKey.similarity ?? 40)) / 100;
      const tol = tolNorm * 360;
      const softNorm = Math.max(0, Math.min(100, clip.chromaKey.softness ?? clip.chromaKey.smoothness ?? 15)) / 100;
      const soft = Math.max(2, softNorm * 120);
      const spillFactor = Math.max(0, Math.min(100, clip.chromaKey.spillRemoval ?? 50)) / 100;

      const kr = keyCol.r;
      const kg = keyCol.g;
      const kb = keyCol.b;
      const isGreenKey = kg > kr && kg > kb;
      const isBlueKey = kb > kr && kb > kg;

      for (let i = 0; i < len; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const dr = r - kr;
        const dg = g - kg;
        const db = b - kb;
        const dist = Math.sqrt(dr * dr + dg * dg + db * db);

        if (dist < tol) {
          data[i + 3] = 0;
        } else if (dist < tol + soft) {
          const alphaRatio = (dist - tol) / soft;
          data[i + 3] = Math.round(data[i + 3] * alphaRatio);
        }

        // Spill suppression: removes colored glow reflections from actors & foreground edges
        if (spillFactor > 0 && data[i + 3] > 0) {
          if (isGreenKey) {
            const maxAllowed = (r + b) / 2 + (1 - spillFactor) * 40;
            if (g > maxAllowed) {
              data[i + 1] = Math.round(maxAllowed);
            }
          } else if (isBlueKey) {
            const maxAllowed = (r + g) / 2 + (1 - spillFactor) * 40;
            if (b > maxAllowed) {
              data[i + 2] = Math.round(maxAllowed);
            }
          }
        }
      }
    }

    // 2. Browser Background Removal
    if (clip.bgRemoval && clip.bgRemoval.enabled) {
      const smoothing = Math.max(0, Math.min(100, clip.bgRemoval.smoothing || 10)) / 100;
      const cornerR = (data[0] + data[procW * 4 - 4] + data[(procH - 1) * procW * 4]) / 3;
      const cornerG = (data[1] + data[procW * 4 - 3] + data[(procH - 1) * procW * 4 + 1]) / 3;
      const cornerB = (data[2] + data[procW * 4 - 2] + data[(procH - 1) * procW * 4 + 2]) / 3;
      const bgThresh = 40 + (1 - smoothing) * 35;
      const smoothWindow = 15 + smoothing * 60;

      for (let i = 0; i < len; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const diff = Math.sqrt((r - cornerR) ** 2 + (g - cornerG) ** 2 + (b - cornerB) ** 2);
        if (diff < bgThresh) {
          data[i + 3] = 0;
        } else if (diff < bgThresh + smoothWindow) {
          const a = (diff - bgThresh) / smoothWindow;
          data[i + 3] = Math.round(data[i + 3] * a);
        }
      }
    }

    chromaCtx.putImageData(imgData, 0, 0);
    ctx.drawImage(chromaCanvas, -drawW / 2, -drawH / 2, drawW, drawH);
  } catch (err) {
    ctx.drawImage(sourceEl, -drawW / 2, -drawH / 2, drawW, drawH);
  }
}

function drawImageClip(
  ctx,
  clip,
  canvasW,
  canvasH,
  isComparingOriginal = false
) {
  const imgEl = getImageElement(clip.id, clip.mediaUrl);
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

  if ((clip.chromaKey && clip.chromaKey.enabled) || (clip.bgRemoval && clip.bgRemoval.enabled)) {
    drawChromaOrBgRemoved(ctx, imgEl, clip, drawW, drawH);
  } else {
    drawWithGrading(ctx, imgEl, clip, drawW, drawH, isComparingOriginal);
  }
}

function drawTextClip(
  ctx,
  props,
  clipElapsed,
  canvasW,
  canvasH,
  clip
) {
  const fontSize = props.fontSize || 48;
  const fontFam = props.fontFamily || 'Outfit';
  const weight = props.fontWeight || (props.bold ? '700' : '400');
  const italic = props.italic ? 'italic ' : '';

  ctx.font = `${italic}${weight} ${fontSize}px "${fontFam}", sans-serif`;
  ctx.textAlign = props.align || 'center';
  ctx.textBaseline = 'middle';

  if (props.letterSpacing !== undefined && 'letterSpacing' in ctx) {
    ctx.letterSpacing = `${props.letterSpacing}px`;
  }

  let rawText = props.text || '';

  // Typewriter animation
  const isTypewriter = (clip && (clip.animationIn === 'typewriter' || clip.animation === 'typewriter')) || props.animation === 'typewriter';
  if (isTypewriter) {
    const inDur = (clip && clip.animationInDuration) || 1.2;
    const progress = Math.max(0, Math.min(1, clipElapsed / inDur));
    const charsToShow = Math.floor(progress * rawText.length);
    rawText = rawText.slice(0, Math.max(1, charsToShow));
  }

  const lines = rawText.split('\n');
  const lineHeight = fontSize * (props.lineHeight || 1.2);
  const totalHeight = lines.length * lineHeight;

  // Measure widest line
  let maxLineWidth = 0;
  lines.forEach((line) => {
    const m = ctx.measureText(line);
    if (m.width > maxLineWidth) maxLineWidth = m.width;
  });

  // Background Box
  if (props.bgColor && props.bgColor !== 'transparent') {
    ctx.save();
    ctx.fillStyle = props.bgColor;
    const pad = props.bgPadding !== undefined ? props.bgPadding : 16;
    const rad = props.bgRadius !== undefined ? props.bgRadius : 8;

    let bx = -maxLineWidth / 2 - pad;
    if (props.align === 'left') {
      bx = -pad;
    } else if (props.align === 'right') {
      bx = -maxLineWidth - pad;
    }
    const by = -totalHeight / 2 - pad;
    const bw = maxLineWidth + pad * 2;
    const bh = totalHeight + pad * 2;

    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, rad);
    ctx.fill();
    ctx.restore();
  }

  // Shadow
  if (props.shadowColor && props.shadowColor !== 'transparent') {
    ctx.shadowColor = props.shadowColor;
    ctx.shadowBlur = props.shadowBlur !== undefined ? props.shadowBlur : 15;
    ctx.shadowOffsetX = props.shadowOffsetX !== undefined ? props.shadowOffsetX : 2;
    ctx.shadowOffsetY = props.shadowOffsetY !== undefined ? props.shadowOffsetY : 4;
  }

  // Stroke Outline
  const hasStroke = Boolean(props.strokeColor && props.strokeWidth && props.strokeWidth > 0);

  // Fill Style (Gradient or Solid)
  let fillStyle = props.color || '#FFFFFF';
  if (props.gradient && props.gradient.enabled) {
    const dir = props.gradient.direction || 'horizontal';
    let grad;
    if (dir === 'vertical') {
      grad = ctx.createLinearGradient(0, -totalHeight / 2, 0, totalHeight / 2);
    } else if (dir === 'diagonal') {
      grad = ctx.createLinearGradient(-maxLineWidth / 2, -totalHeight / 2, maxLineWidth / 2, totalHeight / 2);
    } else {
      grad = ctx.createLinearGradient(-maxLineWidth / 2, 0, maxLineWidth / 2, 0);
    }
    grad.addColorStop(0, props.gradient.from || '#FFFFFF');
    grad.addColorStop(1, props.gradient.to || '#3B82F6');
    fillStyle = grad;
  }

  // Draw each line
  const startY = -totalHeight / 2 + lineHeight / 2;
  lines.forEach((line, idx) => {
    const lineY = startY + idx * lineHeight;
    let lineX = 0;
    if (props.align === 'left') {
      lineX = 0;
    } else if (props.align === 'right') {
      lineX = 0;
    }

    if (hasStroke) {
      ctx.save();
      ctx.strokeStyle = props.strokeColor;
      ctx.lineWidth = props.strokeWidth;
      ctx.strokeText(line, lineX, lineY);
      ctx.restore();
    }

    ctx.fillStyle = fillStyle;
    ctx.fillText(line, lineX, lineY);
  });
}

function drawStickerClip(
  ctx,
  clip,
  canvasW,
  canvasH
) {
  // Shape Sticker
  if (clip.stickerShape) {
    const shape = clip.stickerShape;
    const fill = clip.fillColor || '#3B82F6';
    const stroke = clip.strokeColor || '#FFFFFF';
    const strokeW = clip.strokeWidth !== undefined ? clip.strokeWidth : 2;

    ctx.save();
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeW;

    if (shape === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, 60, 0, Math.PI * 2);
      ctx.fill();
      if (strokeW > 0) ctx.stroke();
    } else if (shape === 'square') {
      ctx.beginPath();
      ctx.roundRect(-60, -60, 120, 120, 16);
      ctx.fill();
      if (strokeW > 0) ctx.stroke();
    } else if (shape === 'star') {
      ctx.beginPath();
      const rOuter = 70;
      const rInner = 32;
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? rOuter : rInner;
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      if (strokeW > 0) ctx.stroke();
    } else if (shape === 'heart') {
      ctx.beginPath();
      const s = 45;
      ctx.moveTo(0, s * 0.4);
      ctx.bezierCurveTo(-s, -s * 0.8, -s * 1.5, s * 0.5, 0, s * 1.6);
      ctx.bezierCurveTo(s * 1.5, s * 0.5, s, -s * 0.8, 0, s * 0.4);
      ctx.fill();
      if (strokeW > 0) ctx.stroke();
    } else if (shape === 'arrow') {
      ctx.beginPath();
      ctx.moveTo(-60, -18);
      ctx.lineTo(20, -18);
      ctx.lineTo(20, -40);
      ctx.lineTo(70, 0);
      ctx.lineTo(20, 40);
      ctx.lineTo(20, 18);
      ctx.lineTo(-60, 18);
      ctx.closePath();
      ctx.fill();
      if (strokeW > 0) ctx.stroke();
    } else if (shape === 'line') {
      ctx.beginPath();
      ctx.moveTo(-120, 0);
      ctx.lineTo(120, 0);
      ctx.lineWidth = Math.max(strokeW, 4);
      ctx.strokeStyle = fill;
      ctx.stroke();
    } else if (shape === 'triangle') {
      ctx.beginPath();
      ctx.moveTo(0, -60);
      ctx.lineTo(65, 50);
      ctx.lineTo(-65, 50);
      ctx.closePath();
      ctx.fill();
      if (strokeW > 0) ctx.stroke();
    }
    ctx.restore();
    return;
  }

  // Frame Overlay
  if (clip.stickerFrame) {
    const frame = clip.stickerFrame;
    const color = clip.borderColor || '#FFFFFF';
    ctx.save();

    if (frame === 'polaroid') {
      const pw = canvasW * 0.65;
      const ph = canvasH * 0.75;
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 24;
      ctx.fillRect(-pw / 2, -ph / 2, pw, ph);

      // Inner cutout area
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fillRect(-pw / 2 + 18, -ph / 2 + 18, pw - 36, ph - 80);
    } else if (frame === 'minimal-border') {
      const bw = canvasW * 0.85;
      const bh = canvasH * 0.85;
      ctx.strokeStyle = color;
      ctx.lineWidth = clip.borderWidth || 4;
      ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);
    } else if (frame === 'cinema-bars') {
      const barH = canvasH * 0.12;
      ctx.fillStyle = '#000000';
      ctx.fillRect(-canvasW / 2, -canvasH / 2, canvasW, barH);
      ctx.fillRect(-canvasW / 2, canvasH / 2 - barH, canvasW, barH);
    } else if (frame === 'phone-frame') {
      const pw = canvasW * 0.45;
      const ph = canvasH * 0.85;
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.roundRect(-pw / 2, -ph / 2, pw, ph, 32);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  // Emoji or Social Pill
  if (clip.stickerEmoji) {
    const isSocialText = clip.stickerEmoji.length > 2;
    if (isSocialText) {
      ctx.save();
      ctx.font = 'bold 24px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const m = ctx.measureText(clip.stickerEmoji);
      const padX = 20;
      const padY = 12;

      ctx.fillStyle = clip.stickerEmoji.includes('Subscribe') ? '#EF4444' : '#171717';
      ctx.beginPath();
      ctx.roundRect(-m.width / 2 - padX, -18 - padY, m.width + padX * 2, 36 + padY * 2, 24);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(clip.stickerEmoji, 0, 0);
      ctx.restore();
    } else {
      const size = 110 * (clip.scale || 1);
      ctx.font = `${size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(clip.stickerEmoji, 0, 0);
    }
    return;
  }

  // Image or uploaded GIF/PNG
  if (clip.stickerUrl || clip.mediaUrl) {
    const url = clip.stickerUrl || clip.mediaUrl;
    const img = getImageElement(clip.id, url);
    if (img.complete && img.naturalWidth > 0) {
      const targetW = 200;
      const targetH = (img.naturalHeight / img.naturalWidth) * targetW;
      ctx.drawImage(img, -targetW / 2, -targetH / 2, targetW, targetH);
    }
  }
}

function drawDrawingClip(ctx, clip, canvasW, canvasH) {
  if (clip.mediaUrl) {
    const img = getImageElement(clip.id, clip.mediaUrl);
    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, -canvasW / 2, -canvasH / 2, canvasW, canvasH);
      return;
    }
  }

  if (clip.strokes && clip.strokes.length > 0) {
    ctx.save();
    clip.strokes.forEach((stroke) => {
      if (!stroke.points || stroke.points.length === 0) return;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = stroke.size || 20;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color || '#3B82F6';
        ctx.lineWidth = stroke.size || 6;
        ctx.globalAlpha = stroke.opacity !== undefined ? stroke.opacity : 1;
      }

      ctx.beginPath();
      const p0 = stroke.points[0];
      ctx.moveTo(p0.x, p0.y);
      if (stroke.points.length === 1) {
        ctx.lineTo(p0.x + 0.5, p0.y + 0.5);
      } else {
        for (let i = 1; i < stroke.points.length; i++) {
          const pt = stroke.points[i];
          ctx.lineTo(pt.x, pt.y);
        }
      }
      ctx.stroke();
      ctx.restore();
    });
    ctx.restore();
  }
}

function applyClipMask(ctx, mask, w, h) {
  if (!mask || mask.type === 'none') return;

  const size = (mask.size || 50) * 0.01 * Math.min(w, h);
  const mx = (mask.x || 0) * 0.01 * w;
  const my = (mask.y || 0) * 0.01 * h;
  const rotRad = ((mask.rotation || 0) * Math.PI) / 180;
  const isInvert = Boolean(mask.invert);

  ctx.beginPath();
  if (isInvert) {
    // Outer bounding path for evenodd invert clipping
    ctx.rect(-w * 3, -h * 3, w * 6, h * 6);
  }

  ctx.save();
  ctx.translate(mx, my);
  if (rotRad !== 0) {
    ctx.rotate(rotRad);
  }

  if (mask.type === 'circle') {
    ctx.arc(0, 0, Math.max(1, size), 0, Math.PI * 2);
  } else if (mask.type === 'rectangle') {
    ctx.rect(-size, -size * 0.6, size * 2, size * 1.2);
  } else if (mask.type === 'heart') {
    const s = size * 0.8;
    ctx.moveTo(0, s * 0.3);
    ctx.bezierCurveTo(-s, -s * 0.8, -s * 1.5, s * 0.5, 0, s * 1.5);
    ctx.bezierCurveTo(s * 1.5, s * 0.5, s, -s * 0.8, 0, s * 0.3);
  } else if (mask.type === 'star') {
    const rOuter = size;
    const rInner = size * 0.45;
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? rOuter : rInner;
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
  } else if (mask.type === 'linear') {
    // Linear split: half-plane mask rotated across clip
    ctx.rect(-w * 3, 0, w * 6, h * 3);
  } else if (mask.type === 'mirror') {
    // Mirror mask: two-way parallel band extending across clip
    const bandH = Math.max(2, size * 1.2);
    ctx.rect(-w * 3, -bandH / 2, w * 6, bandH);
  }

  ctx.closePath();
  ctx.restore();

  if (isInvert) {
    ctx.clip('evenodd');
  } else {
    ctx.clip();
  }
}

function applyPostEffects(
  ctx,
  clip,
  canvasW,
  canvasH,
  currentTime
) {
  const intensity = (_nullishCoalesce(clip.effectIntensity, () => ( 50))) / 100;
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
  } else if (fx === 'strobe-flash' || fx === 'flash') {
    const flashCycle = Math.sin(currentTime * 18);
    if (flashCycle > 0.3) {
      ctx.fillStyle = `rgba(255, 255, 255, ${(0.3 + 0.6 * intensity) * (flashCycle - 0.3) / 0.7})`;
      ctx.fillRect(-canvasW / 2, -canvasH / 2, canvasW, canvasH);
    }
  } else if (fx === 'mirror' || fx === 'mirror-kaleido') {
    ctx.save();
    ctx.globalAlpha = 0.65 * intensity;
    ctx.scale(-1, 1);
    ctx.drawImage(ctx.canvas, -canvasW / 2, -canvasH / 2, canvasW, canvasH);
    ctx.restore();
  } else if (fx === 'pixelate' || fx === 'pixelate-8bit') {
    const blockSize = Math.max(6, Math.floor(18 * intensity));
    ctx.save();
    ctx.globalAlpha = 0.35 * intensity;
    for (let x = -canvasW / 2; x < canvasW / 2; x += blockSize) {
      for (let y = -canvasH / 2; y < canvasH / 2; y += blockSize) {
        if ((Math.floor(x / blockSize) + Math.floor(y / blockSize)) % 2 === 0) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
          ctx.fillRect(x, y, blockSize, blockSize);
        }
      }
    }
    ctx.restore();
  } else if (fx === 'blur' || fx === 'lens-blur') {
    ctx.save();
    ctx.filter = `blur(${Math.max(2, 16 * intensity)}px)`;
    ctx.drawImage(ctx.canvas, -canvasW / 2, -canvasH / 2, canvasW, canvasH);
    ctx.restore();
  } else if (fx === 'invert-flash' || fx === 'flash-invert') {
    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = `rgba(255, 255, 255, ${0.85 * intensity})`;
    ctx.fillRect(-canvasW / 2, -canvasH / 2, canvasW, canvasH);
  }

  ctx.restore();
}

export function buildClipFilterString(clip) {
  let filterParts = [];

  // 1. Preset filter if applied
  const filterPreset = FILTERS_LIST.find((f) => f.id === clip.filter);
  if (filterPreset && filterPreset.id !== 'none') {
    const intensity = (_nullishCoalesce(clip.filterIntensity, () => 80)) / 100;
    const presetCss = filterPreset.cssFilter(intensity);
    if (presetCss && presetCss !== 'none') {
      filterParts.push(presetCss);
    }
  }

  // 2. Adjustments
  const adj = clip.adjustments;
  if (adj) {
    // Brightness + Exposure
    const exposureFactor = Math.pow(2, (adj.exposure || 0) / 50);
    const b = Math.max(0, (100 + (adj.brightness || 0)) * exposureFactor);

    // Contrast
    let c = Math.max(0, 100 + (adj.contrast || 0));
    // Sharpen boosts local contrast definition
    if (adj.sharpen) {
      c += (adj.sharpen || 0) * 0.35;
    }

    // Saturation
    const s = Math.max(0, 100 + (adj.saturation || 0));

    // Temperature & Tint
    const temp = adj.temperature || 0;
    const tint = adj.tint || 0;
    const hue = (temp < 0 ? temp * 0.4 : 0) + tint * 0.35;
    const sepia = temp > 0 ? (temp / 100) * 0.45 : 0;

    filterParts.push(`brightness(${b}%) contrast(${c}%) saturate(${s}%) hue-rotate(${hue}deg) sepia(${sepia})`);

    if (adj.highlights) {
      filterParts.push(`contrast(${100 + adj.highlights * 0.15}%)`);
    }
    if (adj.shadows) {
      filterParts.push(`brightness(${100 + adj.shadows * 0.12}%)`);
    }
  }

  // Effect Blur on clip
  if (clip.effectType === 'blur' || clip.effectType === 'lens-blur') {
    const blurPx = Math.max(1, ((clip.effectIntensity || 50) / 100) * 16);
    filterParts.push(`blur(${blurPx}px)`);
  }

  return filterParts.join(' ').trim() || 'none';
}

export function applyVignette(ctx, intensity, canvasW, canvasH) {
  const norm = Math.max(0, Math.min(100, intensity)) / 100;
  if (norm <= 0) return;
  ctx.save();
  const radius = Math.max(canvasW, canvasH) * 0.65;
  const grad = ctx.createRadialGradient(0, 0, radius * 0.25, 0, 0, radius);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.6, `rgba(0,0,0,${norm * 0.25})`);
  grad.addColorStop(1, `rgba(0,0,0,${norm * 0.85})`);
  ctx.fillStyle = grad;
  ctx.fillRect(-canvasW / 2, -canvasH / 2, canvasW, canvasH);
  ctx.restore();
}

export function applyGrain(ctx, intensity, canvasW, canvasH, currentTime) {
  const norm = Math.max(0, Math.min(100, intensity)) / 100;
  if (norm <= 0) return;
  ctx.save();
  ctx.globalAlpha = 0.05 + norm * 0.25;
  ctx.fillStyle = '#ffffff';
  const count = Math.floor(150 + norm * 350);
  const seed = Math.floor((currentTime * 1000) % 10000);
  for (let i = 0; i < count; i++) {
    const x = (((i * 9301 + seed * 49297) % 233280) / 233280 - 0.5) * canvasW;
    const y = (((i * 49297 + seed * 9301) % 233280) / 233280 - 0.5) * canvasH;
    ctx.fillRect(x, y, 1.5, 1.5);
  }
  ctx.restore();
}

function renderSafeGuides(ctx, ratio, w, h) {
  ctx.save();
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  if (ratio === '9:16') {
    // TikTok/Shorts UI safe areas (top 15%, bottom 20%, right 15%)
    ctx.strokeRect(w * 0.05, h * 0.12, w * 0.78, h * 0.68);
    ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
    ctx.font = '11px sans-serif';
    ctx.fillText('TikTok / Shorts Safe Zone', w * 0.08, h * 0.15);
  } else {
    // 90% action safe & 80% title safe
    ctx.strokeRect(w * 0.05, h * 0.05, w * 0.9, h * 0.9);
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
    ctx.strokeRect(w * 0.1, h * 0.1, w * 0.8, h * 0.8);
  }

  ctx.restore();
}

function renderGridGuides(ctx, w, h) {
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

function adjustBrightness(hex, percent) {
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
