import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize2,
  Minimize2,
  Camera,
  ZoomIn,
  ShieldCheck,
  Grid,
} from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { renderFrame } from '../utils/previewRenderer';
import { ASPECT_RATIOS } from '../types/editor';

export const CenterPreview: React.FC = () => {
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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  const [previewZoom, setPreviewZoom] = useState<'fit' | '50%' | '100%' | '200%'>('fit');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDraggingClip, setIsDraggingClip] = useState(false);
  const dragStartPos = useRef<{ x: number; y: number; initialClipX: number; initialClipY: number }>({
    x: 0,
    y: 0,
    initialClipX: 0,
    initialClipY: 0,
  });

  const selectedClip = getSelectedClip();
  const ratioConfig = ASPECT_RATIOS[project.aspectRatio];

  // Continuous animation frame loop during playback
  useEffect(() => {
    const loop = (now: number) => {
      if (isPlaying) {
        const delta = (now - lastTimeRef.current) / 1000;
        lastTimeRef.current = now;

        const nextTime = currentTime + delta;
        if (nextTime >= project.duration) {
          seek(project.duration);
          useEditorStore.getState().pause();
        } else {
          seek(nextTime);
        }
      } else {
        lastTimeRef.current = now;
      }

      // Draw active frame to canvas
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          renderFrame(ctx, project, currentTime, {
            canvasWidth: ratioConfig.width,
            canvasHeight: ratioConfig.height,
            selectedClipId: selectedClip?.id,
            showSafeGuides,
            showGrid,
            isExporting: false,
          });
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, currentTime, project, ratioConfig, selectedClip, showSafeGuides, showGrid, seek]);

  // Format timecode (00:00:00.00)
  const formatTimecode = (seconds: number) => {
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

  // Direct canvas drag to move clip
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedClip || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setIsDraggingClip(true);
    dragStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      initialClipX: selectedClip.x,
      initialClipY: selectedClip.y,
    };
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingClip || !selectedClip || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const deltaX = ((e.clientX - dragStartPos.current.x) / rect.width) * 100;
    const deltaY = ((e.clientY - dragStartPos.current.y) / rect.height) * 100;

    updateClip(selectedClip.id, {
      x: Math.round((dragStartPos.current.initialClipX + deltaX) * 10) / 10,
      y: Math.round((dragStartPos.current.initialClipY + deltaY) * 10) / 10,
    });
  };

  const handleCanvasMouseUp = () => {
    setIsDraggingClip(false);
  };

  // Keyboard controls (Space = play/pause, Left/Right = frame step)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)
      ) {
        return; // Don't intercept typing in inputs
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        stepBackward(e.shiftKey ? 5 : 1);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        stepForward(e.shiftKey ? 5 : 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, stepBackward, stepForward]);

  return (
    <main
      ref={containerRef}
      className="flex-1 flex flex-col h-full bg-[#0b0c10] overflow-hidden select-none relative"
    >
      {/* Top Preview Status Bar */}
      <div className="h-8 border-b border-[#1c202e] px-4 flex items-center justify-between text-xs text-slate-400 bg-[#10121a] shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-mono text-slate-300 font-bold">
            {ratioConfig.label.split(' ')[0]}
          </span>
          <span className="text-[11px] text-slate-500">
            {ratioConfig.width} × {ratioConfig.height}
          </span>
          <span className="text-[11px] text-slate-500">{project.fps} FPS</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom view dropdown */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500">Zoom:</span>
            <select
              value={previewZoom}
              onChange={(e) => setPreviewZoom(e.target.value as any)}
              className="bg-[#181b26] text-[11px] text-slate-300 border border-[#232738] rounded px-1.5 py-0.5 outline-none cursor-pointer"
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

      {/* Main Canvas Viewport Container */}
      <div className="flex-1 flex items-center justify-center p-3 relative overflow-hidden canvas-checkerboard">
        <div
          className="relative shadow-2xl rounded-lg overflow-hidden border border-[#232738] flex items-center justify-center transition-all"
          style={{
            aspectRatio: `${ratioConfig.width} / ${ratioConfig.height}`,
            maxWidth: previewZoom === 'fit' ? '100%' : previewZoom === '50%' ? '50%' : '100%',
            maxHeight: previewZoom === 'fit' ? '100%' : previewZoom === '50%' ? '50%' : '100%',
            width: previewZoom === '100%' ? `${ratioConfig.width / 2}px` : previewZoom === '200%' ? `${ratioConfig.width}px` : 'auto',
            height: previewZoom === 'fit' ? '100%' : 'auto',
          }}
        >
          <canvas
            ref={canvasRef}
            width={ratioConfig.width}
            height={ratioConfig.height}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            className="w-full h-full object-contain cursor-crosshair"
          />

          {/* Quick Play overlay when paused */}
          {!isPlaying && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/15 hover:bg-black/25 transition-all group"
            >
              <div className="w-14 h-14 rounded-full bg-black/60 group-hover:bg-violet-600/90 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all shadow-xl group-hover:scale-110">
                <Play className="w-6 h-6 ml-1" />
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Center Playback Controls Bar */}
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
    </main>
  );
};
