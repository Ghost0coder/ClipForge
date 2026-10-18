 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import React, { useRef, useEffect, useState, } from 'react';
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
} from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { renderFrame } from '../utils/previewRenderer';
import { ASPECT_RATIOS } from '../types/editor';
import { useResponsive } from '../utils/useResponsive';
import { audioEngine } from '../utils/audioEngine';

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
  } = useEditorStore();

  const { isMobile } = useResponsive();

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [previewZoom, setPreviewZoom] = useState('fit');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDraggingClip, setIsDraggingClip] = useState(false);
  const dragStartPos = useRef({
    x: 0,
    y: 0,
    initialClipX: 0,
    initialClipY: 0,
  });

  const selectedClip = getSelectedClip();
  const ratioConfig = ASPECT_RATIOS[project.aspectRatio];

  // Mobile proxy resolution: half resolution for smooth 60fps playback & low memory
  const renderWidth = isMobile ? Math.round(ratioConfig.width / 2) : ratioConfig.width;
  const renderHeight = isMobile ? Math.round(ratioConfig.height / 2) : ratioConfig.height;

  // Tap preview handler (also unlocks AudioContext for iOS/Android)
  const handlePlayerTap = (e) => {
    // If user was dragging clip, don't toggle play
    if (isDraggingClip) return;
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
        console.log('[ClipForge:Play] Playback reached end of timeline duration:', store.project.duration);
        store.seek(store.project.duration);
        store.pause();
        return;
      }

      store.seek(nextTime);

      // Draw active frame to canvas during playback
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
            console.error('[ClipForge:Play] Error rendering frame during playback:', renderErr);
          }
        }
      }

      animId = requestAnimationFrame(loop);
    };

    lastTime = performance.now();
    animId = requestAnimationFrame(loop);

    return () => {
      if (animId) {
        cancelAnimationFrame(animId);
      }
    };
  }, [isPlaying, isMobile]);

  // Canvas drawing effect when paused/scrubbing or when project properties change
  useEffect(() => {
    if (isPlaying) return; // Handled at 60fps in requestAnimationFrame loop
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

  // Listen to media ready / seek events to redraw when uploaded video loads
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

  // Format timecode (00:00:00.00)
  const formatTimecode = (seconds) => {
    const totalMs = Math.floor(seconds * 100);
    const ms = (totalMs % 100).toString().padStart(2, '0');
    const totalSec = Math.floor(seconds);
    const s = (totalSec % 60).toString().padStart(2, '0');
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    return `${m}:${s}.${ms}`;
  };

  // Quick Snapshot Frame to PNG
  const handleSnapshotFrame = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `frame_${formatTimecode(currentTime).replace(/[:.]/g, '_')}.png`;
    a.click();
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

  // Direct canvas drag to move clip (mouse + touch)
  const handleStartDrag = (clientX, clientY) => {
    if (!selectedClip || !canvasRef.current) return;
    setIsDraggingClip(true);
    dragStartPos.current = {
      x: clientX,
      y: clientY,
      initialClipX: selectedClip.x,
      initialClipY: selectedClip.y,
    };
  };

  const handleMoveDrag = (clientX, clientY) => {
    if (!isDraggingClip || !selectedClip || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const deltaX = ((clientX - dragStartPos.current.x) / rect.width) * 100;
    const deltaY = ((clientY - dragStartPos.current.y) / rect.height) * 100;

    updateClip(selectedClip.id, {
      x: Math.round((dragStartPos.current.initialClipX + deltaX) * 10) / 10,
      y: Math.round((dragStartPos.current.initialClipY + deltaY) * 10) / 10,
    });
  };

  const handleEndDrag = () => {
    setIsDraggingClip(false);
  };



  return (
    <main
      ref={containerRef}
      className={`flex flex-col bg-[#0f1118] select-none relative z-10 ${
        isMobile
          ? 'h-[36vh] max-h-[38vh] min-h-[220px] w-full shrink-0 border-b border-[#1c202e]'
          : 'flex-1 h-full min-h-0'
      }`}
    >
      {/* Desktop Header Bar (hidden on mobile to maximize viewport) */}
      {!isMobile && (
        <div className="h-9 border-b border-[#1c202e] px-4 flex items-center justify-between text-xs text-slate-400 bg-[#12141c] shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">Preview</span>
            <span className="text-[10px] text-slate-500 font-mono">
              {ratioConfig.width}x{ratioConfig.height} ({project.aspectRatio})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-[#181b26] px-2 py-0.5 rounded border border-[#232738]">
              <span className="text-[10px] text-slate-400">Scale:</span>
              <select
                value={previewZoom}
                onChange={(e) => setPreviewZoom(e.target.value )}
                className="bg-transparent text-[11px] text-slate-200 outline-none cursor-pointer"
              >
                <option value="fit">Fit</option>
                <option value="50%">50%</option>
                <option value="100%">100%</option>
                <option value="200%">200%</option>
              </select>
            </div>

            <button
              onClick={handleSnapshotFrame}
              className="p-1 hover:text-cyan-400 text-slate-400 transition-colors"
              title="Snapshot PNG Frame"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleToggleFullscreen}
              className="p-1 hover:text-violet-400 text-slate-400 transition-colors"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
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
        <div
          className="relative shadow-2xl rounded-lg overflow-hidden border border-[#232738] flex items-center justify-center transition-all"
          style={{
            aspectRatio: `${ratioConfig.width} / ${ratioConfig.height}`,
            maxWidth: previewZoom === 'fit' ? '100%' : previewZoom === '50%' ? '50%' : '100%',
            maxHeight: previewZoom === 'fit' ? '100%' : previewZoom === '50%' ? '50%' : '100%',
            width: isMobile ? '100%' : previewZoom === '100%' ? `${ratioConfig.width / 2}px` : previewZoom === '200%' ? `${ratioConfig.width}px` : 'auto',
            height: previewZoom === 'fit' ? '100%' : 'auto',
          }}
          onClick={handlePlayerTap}
        >
          <canvas
            ref={canvasRef}
            width={renderWidth}
            height={renderHeight}
            onMouseDown={(e) => handleStartDrag(e.clientX, e.clientY)}
            onMouseMove={(e) => handleMoveDrag(e.clientX, e.clientY)}
            onMouseUp={handleEndDrag}
            onMouseLeave={handleEndDrag}
            onTouchStart={(e) => {
              if (e.touches.length === 1) {
                handleStartDrag(e.touches[0].clientX, e.touches[0].clientY);
              }
            }}
            onTouchMove={(e) => {
              if (e.touches.length === 1) {
                handleMoveDrag(e.touches[0].clientX, e.touches[0].clientY);
              }
            }}
            onTouchEnd={handleEndDrag}
            className="w-full h-full object-contain cursor-pointer"
          />

          {/* Quick Play overlay badge when paused */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none transition-all">
              <div className="w-12 h-12 rounded-full bg-black/65 text-white flex items-center justify-center backdrop-blur-md border border-white/20 shadow-xl">
                <Play className="w-5 h-5 ml-0.5 text-white" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE SCRUB BAR & CONTROLS (< 768px) */}
      {isMobile ? (
        <div className="h-12 border-t border-[#1c202e] px-3 flex items-center gap-2.5 bg-[#12141c] shrink-0">
          {/* Play/Pause Button (44x44px target) */}
          <button
            onClick={() => {
              audioEngine.getContext();
              togglePlay();
            }}
            className="flex items-center justify-center min-w-[40px] min-h-[40px] rounded-full bg-gradient-to-tr from-violet-600 to-cyan-500 text-white shadow-md shadow-violet-500/25 active:scale-95 cursor-pointer shrink-0"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
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
              className="w-full h-5 cursor-pointer accent-violet-500"
              style={{ touchAction: 'none' }}
              title="Scrub preview playhead"
            />
          </div>

          {/* Timecode display */}
          <div className="flex items-center font-mono tabular-nums text-[11px] text-slate-300 shrink-0">
            <span className="font-bold text-white">{formatTimecode(currentTime)}</span>
            <span className="text-slate-500 mx-1">/</span>
            <span className="text-slate-400">{formatTimecode(project.duration)}</span>
          </div>
        </div>
      ) : (
        /* DESKTOP Playback Controls Bar */
        <div className="h-11 border-t border-[#1c202e] px-4 flex items-center justify-between bg-[#12141c] shrink-0">
          {/* Left: Timecode Display */}
          <div className="flex items-center gap-2 font-mono tabular-nums text-xs">
            <span className="font-bold text-white text-sm bg-[#181b26] px-2 py-0.5 rounded border border-[#272b3c]">
              {formatTimecode(currentTime)}
            </span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-400">{formatTimecode(project.duration)}</span>
          </div>

          {/* Center: Play/Pause and Step Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => stepBackward(1)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1f2334] transition-colors"
              title="Step Back 1 Frame (Left Arrow)"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white flex items-center justify-center shadow-md shadow-violet-500/25 transition-all transform active:scale-95"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <button
              onClick={() => stepForward(1)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1f2334] transition-colors"
              title="Step Forward 1 Frame (Right Arrow)"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Right: Quick Guides Toggles */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleSafeGuides}
              className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                showSafeGuides ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'
              }`}
              title="Safe-area guide box"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Safe Zone</span>
            </button>

            <button
              onClick={toggleGrid}
              className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                showGrid ? 'bg-violet-500/20 text-violet-300' : 'text-slate-400 hover:text-white'
              }`}
              title="Rule of thirds grid"
            >
              <Grid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </button>
          </div>
        </div>
      )}
    </main>
  );
};
