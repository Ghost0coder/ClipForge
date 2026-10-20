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
      className={`flex flex-col bg-[#F0F0F0] dark:bg-[#0D0D0D] select-none relative z-10 transition-colors ${
        isMobile
          ? 'h-[36vh] max-h-[38vh] min-h-[220px] w-full shrink-0 border-b border-[#E5E5E5] dark:border-[#2A2A2A]'
          : 'flex-1 h-full min-h-0'
      }`}
    >
      {/* Desktop Header Bar (hidden on mobile to maximize viewport) */}
      {!isMobile && (
        <div className="h-9 border-b border-[#E5E5E5] dark:border-[#2A2A2A] px-4 flex items-center justify-between text-xs text-[#737373] dark:text-[#A1A1A1] bg-white dark:bg-[#1A1A1A] shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-normal text-[#171717] dark:text-[#EDEDED]">Preview</span>
            <span className="text-[10px] text-[#A3A3A3] dark:text-[#737373] tabular-nums font-normal">
              {ratioConfig.width}x{ratioConfig.height} ({project.aspectRatio})
            </span>
          </div>

          <div className="flex items-center gap-2">
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

      {/* Main Canvas Viewport Container - Neutral checkerboard for accurate colors */}
      <div
        className={`flex-1 flex items-center justify-center relative overflow-hidden canvas-checkerboard ${
          isMobile ? 'p-1.5' : 'p-3'
        }`}
      >
        <div
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

          {/* Quick Play overlay icon when paused */}
          {!isPlaying && (
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
          {/* Play/Pause Button (44x44px target) */}
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
