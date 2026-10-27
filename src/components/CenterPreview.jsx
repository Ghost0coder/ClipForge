function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize2,
  Minimize2,
  Camera,
  ShieldCheck,
  Grid,
  RotateCw,
  Paintbrush,
  Eraser,
  Undo2,
  Trash2,
  Check,
  X,
  Pipette,
} from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { renderFrame } from '../utils/previewRenderer';
import { ASPECT_RATIOS } from '../types/editor';
import { useResponsive } from '../utils/useResponsive';
import { audioEngine } from '../utils/audioEngine';
import { toastSuccess } from '../store/toastStore';

export const CenterPreview = () => {
  const {
    project,
    currentTime,
    isPlaying,
    togglePlay,
    seek,
    stepForward,
    stepBackward,
    selectedClipIds,
    getSelectedClip,
    updateClip,
    showSafeGuides,
    toggleSafeGuides,
    showGrid,
    toggleGrid,
    isDrawingMode,
    setIsDrawingMode,
    toggleDrawingMode,
    eyedropperActive,
    setEyedropperActive,
    addClipToTrack,
    selectClip,
    mobilePreviewCollapsed,
    toggleMobilePreviewCollapsed,
  } = useEditorStore();

  const { isMobile } = useResponsive();

  const canvasRef = useRef(null);
  const drawingCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const previewWrapperRef = useRef(null);

  const [previewZoom, setPreviewZoom] = useState('fit');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Snapping guides states
  const [snapGuideX, setSnapGuideX] = useState(false);
  const [snapGuideY, setSnapGuideY] = useState(false);

  // Direct Manipulation Dragging / Resizing / Rotating state
  const [interactionMode, setInteractionMode] = useState(null); // 'move' | 'scale' | 'rotate'
  const dragContext = useRef({
    startX: 0,
    startY: 0,
    initialClipX: 0,
    initialClipY: 0,
    initialScale: 1,
    initialRotation: 0,
    centerBoxX: 0,
    centerBoxY: 0,
    corner: null,
  });

  // Drawing Tool States
  const [brushColor, setBrushColor] = useState('#FFFFFF');
  const [brushSize, setBrushSize] = useState(8);
  const [brushOpacity, setBrushOpacity] = useState(1);
  const [isEraser, setIsEraser] = useState(false);
  const [strokes, setStrokes] = useState([]);
  const [isDrawingPointerDown, setIsDrawingPointerDown] = useState(false);
  const currentStrokeRef = useRef(null);

  const selectedClip = getSelectedClip();
  const ratioConfig = ASPECT_RATIOS[project.aspectRatio];

  // Mobile proxy resolution
  const renderWidth = isMobile ? Math.round(ratioConfig.width / 2) : ratioConfig.width;
  const renderHeight = isMobile ? Math.round(ratioConfig.height / 2) : ratioConfig.height;

  // Tap preview handler (supports eyedropper sampling for Chroma Key)
  const handlePlayerTap = (e) => {
    if (eyedropperActive && canvasRef.current && selectedClip) {
      e.stopPropagation();
      try {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        const canvasX = Math.floor(((clientX - rect.left) / rect.width) * canvas.width);
        const canvasY = Math.floor(((clientY - rect.top) / rect.height) * canvas.height);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          const pixel = ctx.getImageData(
            Math.max(0, Math.min(canvas.width - 1, canvasX)),
            Math.max(0, Math.min(canvas.height - 1, canvasY)),
            1,
            1
          ).data;
          const hex =
            '#' +
            ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2])
              .toString(16)
              .slice(1)
              .toUpperCase();
          updateClip(selectedClip.id, {
            chromaKey: {
              ...(selectedClip.chromaKey || { enabled: true, tolerance: 30, softness: 10, spill: 20 }),
              enabled: true,
              color: hex,
            },
          });
          toastSuccess(`Chroma Key color sampled: ${hex}`);
          setEyedropperActive(false);
          return;
        }
      } catch (err) {
        console.warn('[Eyedropper] Sampling warning:', err);
      }
      setEyedropperActive(false);
      return;
    }
    if (interactionMode || isDrawingMode) return;
    audioEngine.getContext();
    togglePlay();
  };

  // Continuous animation frame loop during playback
  useEffect(() => {
    if (!isPlaying) return;

    let animId;
    let lastTime = performance.now();

    const loop = (now) => {
      const delta = Math.max(0, (now - lastTime) / 1000);
      lastTime = now;

      const store = useEditorStore.getState();
      if (!store.isPlaying) return;

      const nextTime = store.currentTime + delta;
      if (nextTime >= store.project.duration) {
        store.seek(store.project.duration);
        store.pause();
        return;
      }

      store.seek(nextTime);

      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          try {
            const state = useEditorStore.getState();
            const rConfig = ASPECT_RATIOS[state.project.aspectRatio];
            const w = isMobile ? Math.round(rConfig.width / 2) : rConfig.width;
            const h = isMobile ? Math.round(rConfig.height / 2) : rConfig.height;

            renderFrame(ctx, state.project, nextTime, {
              canvasWidth: w,
              canvasHeight: h,
              selectedClipId: state.selectedClipIds[0] || null,
              showSafeGuides: state.showSafeGuides,
              showGrid: state.showGrid,
              isExporting: false,
              isPlaying: true,
            });
          } catch (renderErr) {
            console.error('[ClipForge:Play] Error rendering frame:', renderErr);
          }
        }
      }

      animId = requestAnimationFrame(loop);
    };

    lastTime = performance.now();
    animId = requestAnimationFrame(loop);

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isPlaying, isMobile]);

  // Canvas drawing effect when paused/scrubbing
  useEffect(() => {
    if (isPlaying) return;
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        renderFrame(ctx, project, currentTime, {
          canvasWidth: renderWidth,
          canvasHeight: renderHeight,
          selectedClipId: _optionalChain([selectedClip, 'optionalAccess', _ => _.id]),
          showSafeGuides,
          showGrid,
          isExporting: false,
          isPlaying: false,
        });
      }
    }
  }, [project, currentTime, renderWidth, renderHeight, selectedClip, showSafeGuides, showGrid, isPlaying]);

  // Redraw when custom redraw event fires
  useEffect(() => {
    const handleRedraw = () => {
      if (!useEditorStore.getState().isPlaying && canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          const state = useEditorStore.getState();
          const rConfig = ASPECT_RATIOS[state.project.aspectRatio];
          const w = isMobile ? Math.round(rConfig.width / 2) : rConfig.width;
          const h = isMobile ? Math.round(rConfig.height / 2) : rConfig.height;

          renderFrame(ctx, state.project, state.currentTime, {
            canvasWidth: w,
            canvasHeight: h,
            selectedClipId: state.selectedClipIds[0] || null,
            showSafeGuides: state.showSafeGuides,
            showGrid: state.showGrid,
            isExporting: false,
            isPlaying: false,
          });
        }
      }
    };

    window.addEventListener('clipforge:redraw', handleRedraw);
    return () => window.removeEventListener('clipforge:redraw', handleRedraw);
  }, [isMobile]);

  // Helper format timecode
  const formatTimecode = (sec) => {
    if (isNaN(sec) || sec < 0) sec = 0;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const f = Math.floor((sec % 1) * 30);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${f.toString().padStart(2, '0')}`;
  };

  // Snapshot PNG frame
  const handleSnapshotFrame = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `frame_${formatTimecode(currentTime).replace(/[:.]/g, '_')}.png`;
    a.click();
    toastSuccess('Snapshot downloaded');
  };

  // Fullscreen toggle
  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // ---------------- DIRECT MANIPULATION HANDLERS ----------------
  const handleStartMove = (e, clientX, clientY) => {
    e.stopPropagation();
    if (!selectedClip || isDrawingMode) return;
    useEditorStore.getState().pushHistory();

    setInteractionMode('move');
    dragContext.current = {
      startX: clientX,
      startY: clientY,
      initialClipX: selectedClip.x || 0,
      initialClipY: selectedClip.y || 0,
    };
  };

  const handleStartScale = (e, corner, clientX, clientY) => {
    e.stopPropagation();
    if (!selectedClip || isDrawingMode) return;
    useEditorStore.getState().pushHistory();

    setInteractionMode('scale');
    dragContext.current = {
      startX: clientX,
      startY: clientY,
      initialScale: selectedClip.scale || 1,
      corner,
    };
  };

  const handleStartRotate = (e, clientX, clientY) => {
    e.stopPropagation();
    if (!selectedClip || !previewWrapperRef.current || isDrawingMode) return;
    useEditorStore.getState().pushHistory();

    const rect = previewWrapperRef.current.getBoundingClientRect();
    const clipCenterX = rect.left + rect.width * (0.5 + (selectedClip.x || 0) / 100);
    const clipCenterY = rect.top + rect.height * (0.5 + (selectedClip.y || 0) / 100);

    setInteractionMode('rotate');
    dragContext.current = {
      centerBoxX: clipCenterX,
      centerBoxY: clipCenterY,
      initialRotation: selectedClip.rotation || 0,
      startAngle: Math.atan2(clientY - clipCenterY, clientX - clipCenterX) * (180 / Math.PI),
    };
  };

  const handleGlobalPointerMove = useCallback((e) => {
    if (!interactionMode || !selectedClip || !previewWrapperRef.current) return;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    if (clientX === undefined || clientY === undefined) return;

    const rect = previewWrapperRef.current.getBoundingClientRect();

    if (interactionMode === 'move') {
      const dx = ((clientX - dragContext.current.startX) / rect.width) * 100;
      const dy = ((clientY - dragContext.current.startY) / rect.height) * 100;

      let newX = dragContext.current.initialClipX + dx;
      let newY = dragContext.current.initialClipY + dy;

      // Snapping to Center X and Center Y (threshold 1.5%)
      let isSnappedX = false;
      let isSnappedY = false;

      if (Math.abs(newX) < 1.6) {
        newX = 0;
        isSnappedX = true;
      }
      if (Math.abs(newY) < 1.6) {
        newY = 0;
        isSnappedY = true;
      }

      setSnapGuideX(isSnappedX);
      setSnapGuideY(isSnappedY);

      updateClip(selectedClip.id, {
        x: Math.round(newX * 10) / 10,
        y: Math.round(newY * 10) / 10,
      });
    } else if (interactionMode === 'scale') {
      const distStart = Math.hypot(dragContext.current.startX, dragContext.current.startY);
      const distCurrent = Math.hypot(clientX, clientY);
      const delta = (distCurrent - distStart) * 0.008;

      let newScale = Math.max(0.15, Math.min(4.0, dragContext.current.initialScale + delta));
      updateClip(selectedClip.id, {
        scale: Math.round(newScale * 100) / 100,
      });
    } else if (interactionMode === 'rotate') {
      const currentAngle = Math.atan2(
        clientY - dragContext.current.centerBoxY,
        clientX - dragContext.current.centerBoxX
      ) * (180 / Math.PI);

      let deltaAngle = currentAngle - dragContext.current.startAngle;
      let newRot = (dragContext.current.initialRotation + deltaAngle) % 360;

      // Snap to 0, 90, 180, 270 degrees
      const snapThreshold = 3;
      [0, 90, -90, 180, -180].forEach((snapTarget) => {
        if (Math.abs(newRot - snapTarget) < snapThreshold) {
          newRot = snapTarget;
        }
      });

      updateClip(selectedClip.id, {
        rotation: Math.round(newRot),
      });
    }
  }, [interactionMode, selectedClip, updateClip]);

  const handleGlobalPointerUp = useCallback(() => {
    if (interactionMode) {
      setInteractionMode(null);
      setSnapGuideX(false);
      setSnapGuideY(false);
    }
  }, [interactionMode]);

  useEffect(() => {
    if (interactionMode) {
      window.addEventListener('mousemove', handleGlobalPointerMove);
      window.addEventListener('mouseup', handleGlobalPointerUp);
      window.addEventListener('touchmove', handleGlobalPointerMove, { passive: false });
      window.addEventListener('touchend', handleGlobalPointerUp);
      return () => {
        window.removeEventListener('mousemove', handleGlobalPointerMove);
        window.removeEventListener('mouseup', handleGlobalPointerUp);
        window.removeEventListener('touchmove', handleGlobalPointerMove);
        window.removeEventListener('touchend', handleGlobalPointerUp);
      };
    }
  }, [interactionMode, handleGlobalPointerMove, handleGlobalPointerUp]);

  // ---------------- DRAWING TOOL HANDLERS ----------------
  const redrawDrawingCanvas = useCallback(() => {
    if (!drawingCanvasRef.current) return;
    const canvas = drawingCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const allStrokes = [...strokes];
    if (currentStrokeRef.current) {
      allStrokes.push(currentStrokeRef.current);
    }

    allStrokes.forEach((stroke) => {
      if (!stroke.points || stroke.points.length === 0) return;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = stroke.size * 2;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size;
        ctx.globalAlpha = stroke.opacity;
      }

      ctx.beginPath();
      const p0 = stroke.points[0];
      ctx.moveTo(p0.x, p0.y);
      if (stroke.points.length === 1) {
        ctx.lineTo(p0.x + 0.5, p0.y + 0.5);
      } else {
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
      }
      ctx.stroke();
      ctx.restore();
    });
  }, [strokes]);

  useEffect(() => {
    if (isDrawingMode) {
      redrawDrawingCanvas();
    }
  }, [isDrawingMode, strokes, redrawDrawingCanvas]);

  const handleDrawingPointerDown = (e) => {
    if (!isDrawingMode || !drawingCanvasRef.current) return;
    const rect = drawingCanvasRef.current.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    const x = ((clientX - rect.left) / rect.width) * renderWidth;
    const y = ((clientY - rect.top) / rect.height) * renderHeight;

    setIsDrawingPointerDown(true);
    currentStrokeRef.current = {
      points: [{ x, y }],
      color: brushColor,
      size: brushSize,
      opacity: brushOpacity,
      isEraser,
    };
    redrawDrawingCanvas();
  };

  const handleDrawingPointerMove = (e) => {
    if (!isDrawingPointerDown || !currentStrokeRef.current || !drawingCanvasRef.current) return;
    const rect = drawingCanvasRef.current.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    const x = ((clientX - rect.left) / rect.width) * renderWidth;
    const y = ((clientY - rect.top) / rect.height) * renderHeight;

    currentStrokeRef.current.points.push({ x, y });
    redrawDrawingCanvas();
  };

  const handleDrawingPointerUp = () => {
    if (!isDrawingPointerDown) return;
    setIsDrawingPointerDown(false);
    if (currentStrokeRef.current && currentStrokeRef.current.points.length > 0) {
      setStrokes((prev) => [...prev, currentStrokeRef.current]);
    }
    currentStrokeRef.current = null;
  };

  const handleSaveDrawing = () => {
    if (strokes.length === 0) {
      setIsDrawingMode(false);
      return;
    }

    useEditorStore.getState().pushHistory();

    // Map stroke points to center coordinate space (-renderWidth/2 to +renderWidth/2)
    const centeredStrokes = strokes.map((s) => ({
      ...s,
      points: s.points.map((p) => ({
        x: Math.round(p.x - renderWidth / 2),
        y: Math.round(p.y - renderHeight / 2),
      })),
    }));

    const overlayTrack = project.tracks.find((t) => t.type === 'sticker') || project.tracks[0];
    const newClip = {
      id: 'clip_drawing_' + Date.now(),
      trackId: overlayTrack.id,
      type: 'drawing',
      name: 'Brush Drawing',
      start: currentTime,
      duration: 4,
      sourceStart: 0,
      sourceDuration: 4,
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
      flipH: false,
      flipV: false,
      blendMode: 'normal',
      speed: 1,
      filterIntensity: 0,
      adjustments: {
        brightness: 0, contrast: 0, saturation: 0, exposure: 0,
        highlights: 0, shadows: 0, temperature: 0, tint: 0,
        vignette: 0, sharpen: 0, grain: 0,
      },
      strokes: centeredStrokes,
      keyframes: [],
    };

    addClipToTrack(overlayTrack.id, newClip);
    selectClip(newClip.id);
    setStrokes([]);
    setIsDrawingMode(false);
    toastSuccess('Drawing saved to timeline');
  };

  const handleCancelDrawing = () => {
    setStrokes([]);
    setIsDrawingMode(false);
  };

  const isVisualClipSelected = selectedClip && selectedClip.type !== 'audio';

  // Compact mini-player bar on mobile when user chooses to collapse preview to focus on multi-track timeline
  if (isMobile && mobilePreviewCollapsed) {
    return (
      <div className="h-14 w-full px-3 flex items-center justify-between gap-2 bg-white dark:bg-[#1A1A1A] shrink-0 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={togglePlay}
            className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#171717] active:scale-95 cursor-pointer shrink-0 transition-transform"
            title={isPlaying ? 'Pause' : 'Play'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4" strokeWidth={1.5} /> : <Play className="w-4 h-4 ml-0.5" strokeWidth={1.5} />}
          </button>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium tabular-nums text-[#171717] dark:text-[#EDEDED] truncate">
              {formatTimecode(currentTime)} / {formatTimecode(project.duration)}
            </span>
            <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1] truncate">
              {project.aspectRatio} • {project.name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={toggleMobilePreviewCollapsed}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#3B82F6] hover:bg-[#2563EB] text-white font-medium text-xs min-h-[44px] shadow-sm active:scale-95 transition-all cursor-pointer"
            title="Expand Video Preview"
            aria-label="Expand Video Preview"
          >
            <Maximize2 className="w-3.5 h-3.5" strokeWidth={2} />
            <span>Show Preview</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <main
      ref={containerRef}
      className={`flex flex-col bg-[#F0F0F0] dark:bg-[#0D0D0D] select-none relative z-10 transition-colors ${
        isMobile
          ? 'h-full w-full flex-1 min-h-0'
          : 'flex-1 h-full min-h-0'
      }`}
    >
      {/* Desktop Header Bar */}
      {!isMobile && (
        <div className="h-9 border-b border-[#E5E5E5] dark:border-[#2A2A2A] px-4 flex items-center justify-between text-xs text-[#737373] dark:text-[#A1A1A1] bg-white dark:bg-[#1A1A1A] shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-normal text-[#171717] dark:text-[#EDEDED]">Preview</span>
            <span className="text-[10px] text-[#A3A3A3] dark:text-[#737373] tabular-nums font-normal">
              {ratioConfig.width}x{ratioConfig.height} ({project.aspectRatio})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Drawing Mode Toggle Button */}
            <button
              onClick={toggleDrawingMode}
              className={`px-2 py-0.5 rounded-[6px] border text-xs font-normal flex items-center gap-1 transition-colors cursor-pointer ${
                isDrawingMode
                  ? 'bg-blue-50 dark:bg-blue-950/40 border-[#3B82F6] text-[#3B82F6]'
                  : 'border-[#E5E5E5] dark:border-[#2A2A2A] text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED]'
              }`}
              title="Toggle Drawing Tool"
            >
              <Paintbrush className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Draw</span>
            </button>

            <div className="flex items-center gap-1 bg-white dark:bg-[#1A1A1A] px-2 py-0.5 rounded-[6px] border border-[#E5E5E5] dark:border-[#2A2A2A]">
              <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1]">Scale:</span>
              <select
                value={previewZoom}
                onChange={(e) => setPreviewZoom(e.target.value)}
                className="bg-transparent text-[11px] text-[#171717] dark:text-[#EDEDED] outline-none cursor-pointer"
              >
                <option value="fit" className="bg-white dark:bg-[#1A1A1A] text-[#171717] dark:text-[#EDEDED]">Fit</option>
                <option value="50%" className="bg-white dark:bg-[#1A1A1A] text-[#171717] dark:text-[#EDEDED]">50%</option>
                <option value="100%" className="bg-white dark:bg-[#1A1A1A] text-[#171717] dark:text-[#EDEDED]">100%</option>
                <option value="200%" className="bg-white dark:bg-[#1A1A1A] text-[#171717] dark:text-[#EDEDED]">200%</option>
              </select>
            </div>

            <button
              onClick={handleSnapshotFrame}
              className="p-1 hover:text-[#171717] dark:hover:text-[#EDEDED] text-[#737373] dark:text-[#A1A1A1] transition-colors cursor-pointer"
              title="Snapshot PNG Frame"
            >
              <Camera className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
            <button
              onClick={handleToggleFullscreen}
              className="p-1 hover:text-[#171717] dark:hover:text-[#EDEDED] text-[#737373] dark:text-[#A1A1A1] transition-colors cursor-pointer"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" strokeWidth={1.5} /> : <Maximize2 className="w-3.5 h-3.5" strokeWidth={1.5} />}
            </button>
          </div>
        </div>
      )}

      {/* Main Canvas Viewport Container */}
      <div
        className={`flex-1 flex items-center justify-center relative overflow-hidden canvas-checkerboard ${
          isMobile ? 'p-1.5' : 'p-3'
        }`}
      >
        {/* Mobile Quick Collapse Button to focus on timeline */}
        {isMobile && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleMobilePreviewCollapsed();
            }}
            className="absolute top-2 right-2 z-35 flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-black/60 hover:bg-black/80 text-white backdrop-blur-md text-[10px] border border-white/20 shadow-md cursor-pointer active:scale-95 transition-all"
            title="Focus Timeline (gives timeline maximum space)"
            aria-label="Focus Timeline"
          >
            <Minimize2 className="w-3 h-3 text-[#3B82F6]" strokeWidth={2} />
            <span className="font-medium">Focus Timeline</span>
          </button>
        )}

        <div
          ref={previewWrapperRef}
          className="relative rounded-[6px] overflow-hidden border border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center justify-center transition-all bg-black shadow-sm"
          style={{
            aspectRatio: `${ratioConfig.width} / ${ratioConfig.height}`,
            maxWidth: previewZoom === 'fit' ? '100%' : previewZoom === '50%' ? '50%' : '100%',
            maxHeight: previewZoom === 'fit' ? '100%' : previewZoom === '50%' ? '50%' : '100%',
            width: isMobile ? '100%' : previewZoom === '100%' ? `${ratioConfig.width / 2}px` : previewZoom === '200%' ? `${ratioConfig.width}px` : 'auto',
            height: previewZoom === 'fit' ? '100%' : 'auto',
          }}
          onClick={handlePlayerTap}
        >
          {/* Eyedropper sampling active notification badge */}
          {eyedropperActive && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-[#171717] dark:bg-white text-white dark:text-[#171717] px-3.5 py-1.5 rounded-full text-xs flex items-center gap-2 shadow-lg animate-pulse pointer-events-none">
              <Pipette className="w-3.5 h-3.5 text-[#3B82F6]" strokeWidth={2} />
              <span className="font-medium">Tap preview to sample chroma color</span>
            </div>
          )}

          {/* Main Video/Frame Canvas */}
          <canvas
            ref={canvasRef}
            width={renderWidth}
            height={renderHeight}
            className={`w-full h-full object-contain ${eyedropperActive ? 'cursor-crosshair' : 'cursor-pointer'}`}
          />

          {/* Center Snapping Guidelines */}
          {snapGuideX && (
            <div className="absolute top-0 bottom-0 left-1/2 w-[1.5px] bg-[#3B82F6] z-30 pointer-events-none shadow-sm" />
          )}
          {snapGuideY && (
            <div className="absolute left-0 right-0 top-1/2 h-[1.5px] bg-[#3B82F6] z-30 pointer-events-none shadow-sm" />
          )}

          {/* DIRECT MANIPULATION OVERLAY (Corner handles, rotation, drag box) */}
          {isVisualClipSelected && !isDrawingMode && !isPlaying && (
            <div
              className="absolute z-20 pointer-events-auto"
              style={{
                left: `${50 + (selectedClip.x || 0)}%`,
                top: `${50 + (selectedClip.y || 0)}%`,
                width: `${(selectedClip.type === 'text' ? 44 : 36) * (selectedClip.scale || 1)}%`,
                height: `${(selectedClip.type === 'text' ? 20 : 36) * (selectedClip.scale || 1)}%`,
                transform: `translate(-50%, -50%) rotate(${selectedClip.rotation || 0}deg)`,
                cursor: interactionMode === 'move' ? 'grabbing' : 'grab',
                touchAction: 'none',
              }}
              onMouseDown={(e) => handleStartMove(e, e.clientX, e.clientY)}
              onTouchStart={(e) => {
                if (e.touches.length === 1) {
                  handleStartMove(e, e.touches[0].clientX, e.touches[0].clientY);
                }
              }}
            >
              {/* Bounding box outline */}
              <div className="absolute inset-0 border border-[#3B82F6] border-dashed rounded-[2px] pointer-events-none" />

              {/* Top Rotation Stem & Handle */}
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <button
                  type="button"
                  aria-label="Rotate clip"
                  className="w-6 h-6 rounded-full bg-white dark:bg-[#171717] border border-[#3B82F6] text-[#3B82F6] flex items-center justify-center shadow-md cursor-grab active:cursor-grabbing hover:scale-110 transition-transform p-0"
                  style={{ touchAction: 'none' }}
                  onMouseDown={(e) => handleStartRotate(e, e.clientX, e.clientY)}
                  onTouchStart={(e) => {
                    if (e.touches.length === 1) {
                      handleStartRotate(e, e.touches[0].clientX, e.touches[0].clientY);
                    }
                  }}
                >
                  <RotateCw className="w-3 h-3" strokeWidth={2} />
                </button>
                <div className="w-[1px] h-2 bg-[#3B82F6]" />
              </div>

              {/* 4 Corner Scale Handles (with min 44px touch target) */}
              {/* Top-Left */}
              <div
                className="absolute -top-2.5 -left-2.5 w-6 h-6 flex items-center justify-center cursor-nwse-resize"
                style={{ touchAction: 'none' }}
                onMouseDown={(e) => handleStartScale(e, 'tl', e.clientX, e.clientY)}
                onTouchStart={(e) => {
                  if (e.touches.length === 1) {
                    handleStartScale(e, 'tl', e.touches[0].clientX, e.touches[0].clientY);
                  }
                }}
              >
                <div className="w-2.5 h-2.5 bg-white dark:bg-[#171717] border-2 border-[#3B82F6] rounded-[2px] shadow-xs" />
              </div>

              {/* Top-Right */}
              <div
                className="absolute -top-2.5 -right-2.5 w-6 h-6 flex items-center justify-center cursor-nesw-resize"
                style={{ touchAction: 'none' }}
                onMouseDown={(e) => handleStartScale(e, 'tr', e.clientX, e.clientY)}
                onTouchStart={(e) => {
                  if (e.touches.length === 1) {
                    handleStartScale(e, 'tr', e.touches[0].clientX, e.touches[0].clientY);
                  }
                }}
              >
                <div className="w-2.5 h-2.5 bg-white dark:bg-[#171717] border-2 border-[#3B82F6] rounded-[2px] shadow-xs" />
              </div>

              {/* Bottom-Left */}
              <div
                className="absolute -bottom-2.5 -left-2.5 w-6 h-6 flex items-center justify-center cursor-nesw-resize"
                style={{ touchAction: 'none' }}
                onMouseDown={(e) => handleStartScale(e, 'bl', e.clientX, e.clientY)}
                onTouchStart={(e) => {
                  if (e.touches.length === 1) {
                    handleStartScale(e, 'bl', e.touches[0].clientX, e.touches[0].clientY);
                  }
                }}
              >
                <div className="w-2.5 h-2.5 bg-white dark:bg-[#171717] border-2 border-[#3B82F6] rounded-[2px] shadow-xs" />
              </div>

              {/* Bottom-Right */}
              <div
                className="absolute -bottom-2.5 -right-2.5 w-6 h-6 flex items-center justify-center cursor-nwse-resize"
                style={{ touchAction: 'none' }}
                onMouseDown={(e) => handleStartScale(e, 'br', e.clientX, e.clientY)}
                onTouchStart={(e) => {
                  if (e.touches.length === 1) {
                    handleStartScale(e, 'br', e.touches[0].clientX, e.touches[0].clientY);
                  }
                }}
              >
                <div className="w-2.5 h-2.5 bg-white dark:bg-[#171717] border-2 border-[#3B82F6] rounded-[2px] shadow-xs" />
              </div>
            </div>
          )}

          {/* DRAWING TOOL ACTIVE OVERLAY CANVAS */}
          {isDrawingMode && (
            <div className="absolute inset-0 z-40 bg-black/20 cursor-crosshair touch-none">
              <canvas
                ref={drawingCanvasRef}
                width={renderWidth}
                height={renderHeight}
                className="w-full h-full object-contain"
                onMouseDown={handleDrawingPointerDown}
                onMouseMove={handleDrawingPointerMove}
                onMouseUp={handleDrawingPointerUp}
                onTouchStart={handleDrawingPointerDown}
                onTouchMove={handleDrawingPointerMove}
                onTouchEnd={handleDrawingPointerUp}
              />

              {/* Minimalist Floating Brush Toolbar */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 bg-white/95 dark:bg-[#1A1A1A]/95 backdrop-blur-md border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[8px] p-1.5 shadow-xl flex items-center gap-2 max-w-[95vw] overflow-x-auto no-scrollbar">
                {/* Brush / Eraser Mode */}
                <div className="flex items-center gap-1 bg-[#F5F5F5] dark:bg-[#222222] p-0.5 rounded-[6px] border border-[#E5E5E5] dark:border-[#2A2A2A]">
                  <button
                    type="button"
                    onClick={() => setIsEraser(false)}
                    className={`p-1.5 rounded-[4px] transition-colors cursor-pointer ${
                      !isEraser
                        ? 'bg-white dark:bg-[#171717] text-[#3B82F6] shadow-xs'
                        : 'text-[#737373] dark:text-[#A1A1A1]'
                    }`}
                    title="Brush"
                  >
                    <Paintbrush className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEraser(true)}
                    className={`p-1.5 rounded-[4px] transition-colors cursor-pointer ${
                      isEraser
                        ? 'bg-white dark:bg-[#171717] text-[#3B82F6] shadow-xs'
                        : 'text-[#737373] dark:text-[#A1A1A1]'
                    }`}
                    title="Eraser"
                  >
                    <Eraser className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                </div>

                {/* Color Palette (When in Brush mode) */}
                {!isEraser && (
                  <div className="flex items-center gap-1">
                    {['#FFFFFF', '#171717', '#3B82F6', '#EF4444', '#FACC15', '#10B981'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setBrushColor(c)}
                        className={`w-5 h-5 rounded-full border transition-transform cursor-pointer ${
                          brushColor === c ? 'scale-125 ring-2 ring-[#3B82F6]' : 'border-black/20'
                        }`}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                    <input
                      type="color"
                      value={brushColor}
                      onChange={(e) => setBrushColor(e.target.value)}
                      className="w-5 h-5 rounded-full border border-black/20 cursor-pointer p-0 bg-transparent"
                      title="Custom color"
                    />
                  </div>
                )}

                {/* Brush Size Slider */}
                <div className="flex items-center gap-1 text-[11px] text-[#737373] dark:text-[#A1A1A1] border-l border-[#E5E5E5] dark:border-[#2A2A2A] pl-2">
                  <span className="tabular-nums font-mono w-4">{brushSize}</span>
                  <input
                    type="range"
                    min="2"
                    max="40"
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value) || 6)}
                    className="w-16 h-3 cursor-pointer accent-[#3B82F6]"
                  />
                </div>

                {/* Undo & Clear */}
                <div className="flex items-center gap-0.5 border-l border-[#E5E5E5] dark:border-[#2A2A2A] pl-1.5">
                  <button
                    type="button"
                    onClick={() => setStrokes((prev) => prev.slice(0, -1))}
                    disabled={strokes.length === 0}
                    className="p-1.5 rounded-[4px] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] disabled:opacity-30 cursor-pointer text-[#737373] dark:text-[#A1A1A1]"
                    title="Undo stroke"
                  >
                    <Undo2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setStrokes([])}
                    disabled={strokes.length === 0}
                    className="p-1.5 rounded-[4px] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] disabled:opacity-30 cursor-pointer text-[#737373] dark:text-[#A1A1A1]"
                    title="Clear drawing"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                </div>

                {/* Actions: Cancel & Done */}
                <div className="flex items-center gap-1 border-l border-[#E5E5E5] dark:border-[#2A2A2A] pl-1.5">
                  <button
                    type="button"
                    onClick={handleCancelDrawing}
                    className="p-1.5 rounded-[4px] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-[#737373] dark:text-[#A1A1A1] cursor-pointer"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDrawing}
                    className="px-2.5 py-1 rounded-[6px] bg-[#171717] hover:bg-[#262626] text-white dark:bg-[#EDEDED] dark:hover:bg-white dark:text-[#171717] text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" strokeWidth={1.5} /> Done
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quick Play overlay icon when paused and not drawing */}
          {!isPlaying && !isDrawingMode && !isVisualClipSelected && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/15 pointer-events-none transition-all">
              <div className="w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center shadow-sm">
                <Play className="w-4 h-4 ml-0.5 text-white" strokeWidth={1.5} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE SCRUB BAR & CONTROLS (< 768px) */}
      {isMobile ? (
        <div className="h-12 border-t border-[#E5E5E5] dark:border-[#2A2A2A] px-3 flex items-center gap-2.5 bg-white dark:bg-[#1A1A1A] shrink-0 transition-colors">
          {/* Play/Pause Button (44x44px touch target) */}
          <button
            onClick={() => {
              audioEngine.getContext();
              togglePlay();
            }}
            className="flex items-center justify-center min-w-[40px] min-h-[40px] rounded-full bg-[#171717] hover:bg-[#262626] text-white dark:bg-[#EDEDED] dark:hover:bg-white dark:text-[#171717] active:scale-95 cursor-pointer shrink-0 transition-colors"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4" strokeWidth={1.5} /> : <Play className="w-4 h-4 ml-0.5" strokeWidth={1.5} />}
          </button>

          {/* Large Touch Scrub Bar */}
          <div className="flex-1 flex flex-col justify-center min-w-0">
            <input
              type="range"
              min={0}
              max={Math.max(project.duration, 0.1)}
              step={0.01}
              value={currentTime}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                seek(val);
              }}
              className="w-full h-5 cursor-pointer"
              style={{ touchAction: 'none' }}
              title="Scrub preview playhead"
            />
          </div>

          {/* Timecode display in Inter font with tabular numbers */}
          <div className="flex items-center tabular-nums text-xs text-[#737373] dark:text-[#A1A1A1] font-normal shrink-0">
            <span className="font-normal text-[#171717] dark:text-[#EDEDED]">{formatTimecode(currentTime)}</span>
            <span className="text-[#A3A3A3] mx-1">/</span>
            <span>{formatTimecode(project.duration)}</span>
          </div>
        </div>
      ) : (
        /* DESKTOP Playback Controls Bar */
        <div className="h-10 border-t border-[#E5E5E5] dark:border-[#2A2A2A] px-4 flex items-center justify-between bg-white dark:bg-[#1A1A1A] shrink-0 transition-colors">
          {/* Left: Timecode Display */}
          <div className="flex items-center gap-1.5 tabular-nums text-xs text-[#737373] dark:text-[#A1A1A1] font-normal">
            <span className="font-normal text-[#171717] dark:text-[#EDEDED] bg-[#F5F5F5] dark:bg-[#222222] px-2 py-0.5 rounded-[6px] border border-[#E5E5E5] dark:border-[#2A2A2A]">
              {formatTimecode(currentTime)}
            </span>
            <span className="text-[#A3A3A3]">/</span>
            <span>{formatTimecode(project.duration)}</span>
          </div>

          {/* Center: Play/Pause and Step Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => stepBackward(1)}
              className="p-1.5 rounded-[6px] text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] transition-colors cursor-pointer"
              title="Step Back 1 Frame (Left Arrow)"
            >
              <SkipBack className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>

            <button
              onClick={togglePlay}
              className="w-8 h-8 rounded-full bg-[#171717] hover:bg-[#262626] text-white dark:bg-[#EDEDED] dark:hover:bg-white dark:text-[#171717] flex items-center justify-center transition-colors cursor-pointer"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" strokeWidth={1.5} /> : <Play className="w-3.5 h-3.5 ml-0.5" strokeWidth={1.5} />}
            </button>

            <button
              onClick={() => stepForward(1)}
              className="p-1.5 rounded-[6px] text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] transition-colors cursor-pointer"
              title="Step Forward 1 Frame (Right Arrow)"
            >
              <SkipForward className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>

          {/* Right: Quick Guides Toggles */}
          <div className="flex items-center gap-1">
            <button
              onClick={toggleSafeGuides}
              className={`px-2 py-0.5 rounded-[6px] border text-xs font-normal flex items-center gap-1 transition-colors cursor-pointer ${
                showSafeGuides
                  ? 'bg-blue-50 dark:bg-blue-950/40 border-[#3B82F6] text-[#3B82F6]'
                  : 'border-[#E5E5E5] dark:border-[#2A2A2A] text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED]'
              }`}
              title="Safe-area guide box"
            >
              <ShieldCheck className="w-3 h-3" strokeWidth={1.5} />
              <span className="hidden sm:inline">Safe Zone</span>
            </button>

            <button
              onClick={toggleGrid}
              className={`px-2 py-0.5 rounded-[6px] border text-xs font-normal flex items-center gap-1 transition-colors cursor-pointer ${
                showGrid
                  ? 'bg-blue-50 dark:bg-blue-950/40 border-[#3B82F6] text-[#3B82F6]'
                  : 'border-[#E5E5E5] dark:border-[#2A2A2A] text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED]'
              }`}
              title="Rule of thirds grid"
            >
              <Grid className="w-3 h-3" strokeWidth={1.5} />
              <span className="hidden sm:inline">Grid</span>
            </button>
          </div>
        </div>
      )}
    </main>
  );
};
