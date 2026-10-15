import React, { useRef, useState, useEffect } from 'react';
import {
  Scissors,
  Trash2,
  Copy,
  Plus,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
  Magnet,
  Bookmark,
  ArrowLeftRight,
  Snowflake,
  Film,
  Music,
  Type,
  Smile,
  Layers,
} from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { TrackType, Clip, Track } from '../types/editor';
import { useResponsive } from '../utils/useResponsive';
import { MobileFloatingClipBar } from './MobileFloatingClipBar';

export const Timeline: React.FC = () => {
  const {
    project,
    currentTime,
    seek,
    zoom,
    setZoom,
    snapping,
    toggleSnapping,
    magneticTimeline,
    toggleMagnetic,
    selectedClipIds,
    selectClip,
    splitClipAtPlayhead,
    deleteClip,
    duplicateClip,
    freezeFrame,
    moveClip,
    trimClip,
    addTrack,
    removeTrack,
    toggleTrackLock,
    toggleTrackHide,
    toggleTrackMute,
    setTrackVolume,
    addMarker,
    copySelected,
    pasteClips,
    autoCutSilence,
  } = useEditorStore();

  const { isMobile } = useResponsive();

  const rulerRef = useRef<HTMLDivElement>(null);
  const timelineTracksRef = useRef<HTMLDivElement>(null);
  const trackHeadersRef = useRef<HTMLDivElement>(null);

  // Dragging & Scrubbing states
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [draggingClipId, setDraggingClipId] = useState<string | null>(null);
  const [trimmingClip, setTrimmingClip] = useState<{ id: string; side: 'left' | 'right'; startX: number; origStart: number; origDuration: number } | null>(null);
  const dragClipStartPos = useRef<{ clipId: string; startX: number; origStart: number; origTrackId: string }>({
    clipId: '',
    startX: 0,
    origStart: 0,
    origTrackId: '',
  });

  // Long press timer for mobile clip drag
  const longPressTimerRef = useRef<any>(null);
  const [isLongPressDragging, setIsLongPressDragging] = useState(false);

  // Pinch-to-zoom tracking
  const lastPinchDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(zoom);

  const totalWidth = Math.max(project.duration * zoom + 500, 1400);

  // Time format helper
  const formatRulerTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Playhead scrubber interactions (mouse + touch)
  const handleRulerScrubStart = (clientX: number) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const targetTime = Math.max(0, clickX / zoom);
    seek(targetTime);
    setIsScrubbing(true);
  };

  const handleRulerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    handleRulerScrubStart(e.clientX);
  };

  const handleRulerTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      handleRulerScrubStart(e.touches[0].clientX);
    }
  };

  // Global pointer move & up (supports mouse & touch)
  useEffect(() => {
    const handlePointerMove = (clientX: number) => {
      if (isScrubbing && rulerRef.current) {
        const rect = rulerRef.current.getBoundingClientRect();
        const clickX = clientX - rect.left;
        const targetTime = Math.max(0, Math.min(clickX / zoom, project.duration));
        seek(targetTime);
      }

      if (trimmingClip) {
        const deltaPx = clientX - trimmingClip.startX;
        const deltaSec = deltaPx / zoom;

        if (trimmingClip.side === 'left') {
          const newStart = Math.max(0, trimmingClip.origStart + deltaSec);
          const newDuration = Math.max(0.2, trimmingClip.origDuration - deltaSec);
          trimClip(trimmingClip.id, newStart, newDuration);
        } else {
          const newDuration = Math.max(0.2, trimmingClip.origDuration + deltaSec);
          trimClip(trimmingClip.id, trimmingClip.origStart, newDuration);
        }
      }

      if (draggingClipId) {
        const deltaPx = clientX - dragClipStartPos.current.startX;
        const deltaSec = deltaPx / zoom;
        let newStart = Math.max(0, dragClipStartPos.current.origStart + deltaSec);

        // Snap to start 00:00 or playhead
        if (newStart < 0.2) {
          newStart = 0;
        } else if (snapping) {
          if (Math.abs(newStart - currentTime) < 0.2) {
            newStart = currentTime;
          }
        }

        moveClip(draggingClipId, dragClipStartPos.current.origTrackId, newStart);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      handlePointerMove(e.clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isScrubbing || trimmingClip || draggingClipId) {
        if (e.touches.length > 0) {
          handlePointerMove(e.touches[0].clientX);
        }
      }
    };

    const handlePointerUp = () => {
      setIsScrubbing(false);
      setTrimmingClip(null);
      setDraggingClipId(null);
      setIsLongPressDragging(false);
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isScrubbing, trimmingClip, draggingClipId, zoom, project.duration, currentTime, snapping, seek, trimClip, moveClip]);

  // Touch pinch-to-zoom on timeline tracks
  const handleTimelineTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastPinchDistRef.current = dist;
      pinchStartZoomRef.current = zoom;
    }
  };

  const handleTimelineTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && lastPinchDistRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / lastPinchDistRef.current;
      const newZoom = Math.max(10, Math.min(250, Math.round(pinchStartZoomRef.current * ratio)));
      setZoom(newZoom);
    }
  };

  const handleTimelineTouchEnd = () => {
    lastPinchDistRef.current = null;
  };

  // Keyboard shortcut handlers (S = split, Delete = del, Cmd+D = dup)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)
      ) {
        return;
      }

      if (e.key === 's' || e.key === 'S') {
        splitClipAtPlayhead();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedClipIds.length > 0) {
          e.preventDefault();
          deleteClip(selectedClipIds[0], e.shiftKey);
        }
      } else if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
        if (selectedClipIds.length > 0) {
          e.preventDefault();
          duplicateClip(selectedClipIds[0]);
        }
      } else if (e.key === 'f' || e.key === 'F') {
        if (selectedClipIds.length > 0) {
          e.preventDefault();
          freezeFrame(selectedClipIds[0]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClipIds, splitClipAtPlayhead, deleteClip, duplicateClip, freezeFrame]);

  const getTrackIcon = (type: TrackType) => {
    switch (type) {
      case 'video':
        return <Film className="w-3.5 h-3.5 text-violet-400" />;
      case 'audio':
        return <Music className="w-3.5 h-3.5 text-emerald-400" />;
      case 'text':
        return <Type className="w-3.5 h-3.5 text-cyan-400" />;
      case 'sticker':
        return <Smile className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getClipBgColor = (clip: Clip) => {
    switch (clip.type) {
      case 'video':
      case 'color':
      case 'image':
        return 'bg-gradient-to-r from-violet-950 to-indigo-950 border-violet-500/50 text-violet-100';
      case 'audio':
        return 'bg-gradient-to-r from-emerald-950 to-teal-950 border-emerald-500/50 text-emerald-100';
      case 'text':
        return 'bg-gradient-to-r from-cyan-950 to-blue-950 border-cyan-500/50 text-cyan-100';
      case 'sticker':
        return 'bg-gradient-to-r from-amber-950 to-orange-950 border-amber-500/50 text-amber-100';
      default:
        return 'bg-slate-800 border-slate-600 text-slate-100';
    }
  };

  return (
    <footer
      className={`border-t border-[#222638] bg-[#0e1017] flex flex-col select-none shrink-0 overflow-visible relative z-20 ${
        isMobile ? 'flex-1 min-h-[160px] max-h-[30vh]' : 'h-64 md:h-72'
      }`}
    >
      {/* Floating Action Bar above timeline on mobile when clip selected */}
      {isMobile && <MobileFloatingClipBar />}

      {/* Timeline Toolbar */}
      <div className="h-9 px-3 border-b border-[#222638] bg-[#12141c] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {/* Split (S) */}
          <button
            onClick={() => splitClipAtPlayhead()}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1a1d29] hover:bg-violet-600/30 hover:border-violet-500 text-xs font-semibold text-slate-200 border border-[#272b3c] transition-colors cursor-pointer shrink-0"
            title="Split Clip at Playhead (S)"
          >
            <Scissors className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Split</span>
          </button>

          {/* Delete */}
          <button
            onClick={() => selectedClipIds.length > 0 && deleteClip(selectedClipIds[0])}
            disabled={selectedClipIds.length === 0}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#1a1d29] hover:bg-rose-950 hover:border-rose-500 text-xs text-slate-300 border border-[#272b3c] disabled:opacity-40 transition-colors cursor-pointer shrink-0"
            title="Delete Selected Clip (Del)"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Delete</span>
          </button>

          {/* Duplicate */}
          <button
            onClick={() => selectedClipIds.length > 0 && duplicateClip(selectedClipIds[0])}
            disabled={selectedClipIds.length === 0}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#1a1d29] hover:bg-[#232738] text-xs text-slate-300 border border-[#272b3c] disabled:opacity-40 transition-colors cursor-pointer shrink-0"
            title="Duplicate Clip (Ctrl+D)"
          >
            <Copy className="w-3.5 h-3.5 text-violet-400" />
            <span className="hidden sm:inline">Duplicate</span>
          </button>

          {/* Freeze Frame */}
          <button
            onClick={() => selectedClipIds.length > 0 && freezeFrame(selectedClipIds[0])}
            disabled={selectedClipIds.length === 0}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#1a1d29] hover:bg-[#232738] text-xs text-slate-300 border border-[#272b3c] disabled:opacity-40 transition-colors cursor-pointer shrink-0"
            title="Freeze Frame (F)"
          >
            <Snowflake className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Freeze</span>
          </button>

          {/* Ripple Delete */}
          <button
            onClick={() => selectedClipIds.length > 0 && deleteClip(selectedClipIds[0], true)}
            disabled={selectedClipIds.length === 0}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#1a1d29] hover:bg-rose-950 hover:border-rose-500 text-xs text-slate-300 border border-[#272b3c] disabled:opacity-40 transition-colors cursor-pointer shrink-0"
            title="Ripple Delete [Shift+Del]"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Ripple</span>
          </button>

          {/* Add Marker */}
          <button
            onClick={() => addMarker(currentTime, 'Marker')}
            className="p-1 rounded bg-[#1a1d29] hover:bg-[#232738] text-slate-300 border border-[#272b3c] transition-colors cursor-pointer shrink-0"
            title="Add Marker at Playhead"
          >
            <Bookmark className="w-3.5 h-3.5 text-cyan-400" />
          </button>
        </div>

        {/* Right Tools: Zoom Slider & Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Zoom In / Out Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoom(Math.max(10, zoom - 15))}
              className="p-1 hover:text-white text-slate-400 cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            {!isMobile && (
              <input
                type="range"
                min="10"
                max="200"
                step="5"
                value={zoom}
                onChange={(e) => setZoom(parseInt(e.target.value))}
                className="w-16 md:w-20 cursor-pointer"
              />
            )}
            <button
              onClick={() => setZoom(Math.min(200, zoom + 15))}
              className="p-1 hover:text-white text-slate-400 cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Multi-Track Body: Left Headers + Right Timeline Canvas */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Track Headers Column (Compact icon on mobile) */}
        <div
          ref={trackHeadersRef}
          onScroll={(e) => {
            if (timelineTracksRef.current) {
              timelineTracksRef.current.scrollTop = e.currentTarget.scrollTop;
            }
          }}
          className={`${
            isMobile ? 'w-12 sm:w-16' : 'w-48 md:w-56'
          } border-r border-[#222638] bg-[#12141c] flex flex-col shrink-0 z-20 overflow-y-auto min-h-0 select-none`}
        >
          {/* Header spacer matching ruler height */}
          <div className="h-7 border-b border-[#222638] bg-[#0e1017] px-2 flex items-center justify-between text-[10px] text-slate-500 font-bold shrink-0 sticky top-0 z-10">
            <span>{isMobile ? '#' : 'TRACKS'}</span>
            <span className="font-mono text-[9px]">{project.tracks.length}</span>
          </div>

          {/* Track Header Rows */}
          <div className="flex-1 space-y-1 py-1 px-1">
            {project.tracks.map((track) => (
              <div
                key={track.id}
                className="h-14 px-1 rounded-lg bg-[#181b26] border border-[#232738] flex flex-col justify-between py-1 transition-colors group"
              >
                <div className="flex items-center justify-center sm:justify-between min-w-0">
                  <div className="flex items-center gap-1 min-w-0" title={track.name}>
                    {getTrackIcon(track.type)}
                    {!isMobile && (
                      <span className="text-xs font-semibold text-slate-300 truncate">
                        {track.name}
                      </span>
                    )}
                  </div>
                  {!isMobile && project.tracks.length > 2 && (
                    <button
                      onClick={() => removeTrack(track.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-0.5"
                      title="Remove Track"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Track controls: Lock, Hide, Mute */}
                <div className="flex items-center justify-center sm:justify-start gap-1 pt-0.5 border-t border-[#232738]/60 text-slate-400">
                  <button
                    onClick={() => toggleTrackLock(track.id)}
                    className={`hover:text-white p-0.5 ${track.locked ? 'text-amber-400' : ''}`}
                    title={track.locked ? 'Unlock' : 'Lock'}
                  >
                    {track.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  </button>

                  <button
                    onClick={() => toggleTrackMute(track.id)}
                    className={`hover:text-white p-0.5 ${track.muted ? 'text-rose-400' : ''}`}
                    title={track.muted ? 'Unmute' : 'Mute'}
                  >
                    {track.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Timeline Canvas (Ruler + Tracks Lanes) */}
        <div
          ref={timelineTracksRef}
          onTouchStart={handleTimelineTouchStart}
          onTouchMove={handleTimelineTouchMove}
          onTouchEnd={handleTimelineTouchEnd}
          onScroll={(e) => {
            if (trackHeadersRef.current) {
              trackHeadersRef.current.scrollTop = e.currentTarget.scrollTop;
            }
          }}
          onWheel={(e) => {
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              setZoom(Math.max(10, Math.min(200, zoom - e.deltaY * 0.2)));
            } else if (timelineTracksRef.current && Math.abs(e.deltaY) > Math.abs(e.deltaX) && !e.shiftKey) {
              timelineTracksRef.current.scrollLeft += e.deltaY;
            }
          }}
          className="flex-1 overflow-x-auto overflow-y-auto relative bg-[#0b0c10] min-h-0 touch-pan-x touch-pan-y"
        >
          <div style={{ width: `${totalWidth}px` }} className="relative min-h-full">
            {/* Timeline Ruler */}
            <div
              ref={rulerRef}
              onMouseDown={handleRulerMouseDown}
              onTouchStart={handleRulerTouchStart}
              className="h-7 border-b border-[#222638] bg-[#12141c] sticky top-0 cursor-pointer relative z-10 touch-none"
            >
              {/* Ruler ticks every 1 second */}
              {Array.from({ length: Math.ceil(project.duration) + 15 }).map((_, sec) => {
                const posX = sec * zoom;
                return (
                  <div key={sec} style={{ left: `${posX}px` }} className="absolute top-0 h-full">
                    <div className="timeline-tick-major" />
                    <span className="absolute top-2 left-1 text-[9px] font-mono text-slate-500">
                      {formatRulerTime(sec)}
                    </span>
                  </div>
                );
              })}

              {/* Markers on Ruler */}
              {project.markers?.map((marker) => (
                <div
                  key={marker.id}
                  style={{ left: `${marker.time * zoom}px` }}
                  className="absolute top-0 transform -translate-x-1/2 z-20 group cursor-pointer"
                  title={`${marker.label} (${marker.time.toFixed(2)}s)`}
                >
                  <div
                    className="w-2.5 h-3 rounded-b-sm shadow-md"
                    style={{ backgroundColor: marker.color }}
                  />
                </div>
              ))}
            </div>

            {/* Playhead Scrubber Line Spanning All Tracks */}
            <div
              style={{ left: `${currentTime * zoom}px` }}
              className="absolute top-0 bottom-0 w-[2px] bg-cyan-400 z-30 pointer-events-none shadow-[0_0_8px_rgba(6,182,212,0.8)]"
            >
              {/* Playhead Needle Head */}
              <div
                onMouseDown={handleRulerMouseDown}
                onTouchStart={handleRulerTouchStart}
                style={{ marginLeft: currentTime * zoom < 6 ? '0px' : '-6px' }}
                className="w-3.5 h-3.5 bg-cyan-400 rotate-45 -mt-1 shadow-lg pointer-events-auto cursor-ew-resize touch-none"
              />
            </div>

            {/* Track Lanes - flush left 00:00 alignment */}
            <div className="space-y-1 py-1 pl-0 pr-4">
              {project.tracks.map((track) => (
                <div
                  key={track.id}
                  className={`h-14 relative bg-[#12141c]/50 border-y border-r border-[#1e2233] border-l-0 rounded-r-lg transition-colors ${
                    track.locked ? 'opacity-60 pointer-events-none' : ''
                  }`}
                >
                  {/* Clips on this track */}
                  {track.clips.map((clip) => {
                    const isSelected = selectedClipIds.includes(clip.id);
                    const leftPx = Math.max(0, clip.start) * zoom;
                    const widthPx = Math.max(clip.duration * zoom, isMobile ? 32 : 24);

                    return (
                      <div
                        key={clip.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          selectClip(clip.id, e.shiftKey);
                        }}
                        onMouseDown={(e) => {
                          if (e.target !== e.currentTarget && (e.target as HTMLElement).dataset.handle) {
                            return;
                          }
                          useEditorStore.getState().pushHistory();
                          setDraggingClipId(clip.id);
                          dragClipStartPos.current = {
                            clipId: clip.id,
                            startX: e.clientX,
                            origStart: clip.start,
                            origTrackId: track.id,
                          };
                        }}
                        onTouchStart={(e) => {
                          if (e.target !== e.currentTarget && (e.target as HTMLElement).dataset.handle) {
                            return;
                          }
                          // Select clip immediately
                          selectClip(clip.id);

                          const touch = e.touches[0];
                          const startX = touch.clientX;
                          // Long press timer (350ms) to begin moving clip
                          longPressTimerRef.current = setTimeout(() => {
                            setIsLongPressDragging(true);
                            useEditorStore.getState().pushHistory();
                            setDraggingClipId(clip.id);
                            dragClipStartPos.current = {
                              clipId: clip.id,
                              startX,
                              origStart: clip.start,
                              origTrackId: track.id,
                            };
                            if (navigator.vibrate) navigator.vibrate(40);
                          }, 350);
                        }}
                        onTouchMove={() => {
                          // If moved before long press, cancel so normal scroll happens
                          if (!isLongPressDragging && longPressTimerRef.current) {
                            clearTimeout(longPressTimerRef.current);
                            longPressTimerRef.current = null;
                          }
                        }}
                        onTouchEnd={() => {
                          if (longPressTimerRef.current) {
                            clearTimeout(longPressTimerRef.current);
                            longPressTimerRef.current = null;
                          }
                        }}
                        style={{
                          left: `${leftPx}px`,
                          width: `${widthPx}px`,
                        }}
                        className={`absolute top-1 bottom-1 rounded-md border text-xs px-2 py-1 flex items-center justify-between cursor-move overflow-hidden transition-shadow ${getClipBgColor(
                          clip
                        )} ${isSelected ? 'ring-2 ring-violet-400 shadow-lg shadow-violet-500/30' : ''}`}
                      >
                        {/* Left Trim Handle (large 24px+ touch handle on mobile) */}
                        <div
                          data-handle="left"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            useEditorStore.getState().pushHistory();
                            setTrimmingClip({
                              id: clip.id,
                              side: 'left',
                              startX: e.clientX,
                              origStart: clip.start,
                              origDuration: clip.duration,
                            });
                          }}
                          onTouchStart={(e) => {
                            e.stopPropagation();
                            useEditorStore.getState().pushHistory();
                            if (e.touches.length > 0) {
                              setTrimmingClip({
                                id: clip.id,
                                side: 'left',
                                startX: e.touches[0].clientX,
                                origStart: clip.start,
                                origDuration: clip.duration,
                              });
                            }
                          }}
                          className={`absolute left-0 top-0 bottom-0 ${
                            isMobile ? 'w-7' : 'w-2.5 hover:w-3.5'
                          } flex items-center justify-center bg-violet-500/30 hover:bg-violet-400 cursor-ew-resize transition-all z-20 touch-none`}
                          title="Drag to trim start"
                        >
                          <div className="w-1 h-5 bg-white/90 rounded-full shadow-sm" />
                        </div>

                        {/* Clip Content Label */}
                        <div className="flex items-center gap-1.5 min-w-0 pr-2 pointer-events-none mx-auto">
                          <span className="font-semibold truncate text-[11px] drop-shadow-sm">
                            {clip.type === 'sticker' && clip.stickerEmoji ? `${clip.stickerEmoji} ` : ''}
                            {clip.name}
                          </span>
                          {clip.freezeFrame && (
                            <span className="text-[9px] bg-sky-950/90 text-sky-300 px-1 py-0.5 rounded border border-sky-400/50 shrink-0">
                              ❄️
                            </span>
                          )}
                        </div>

                        {/* Right Trim Handle (large 24px+ touch handle on mobile) */}
                        <div
                          data-handle="right"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            useEditorStore.getState().pushHistory();
                            setTrimmingClip({
                              id: clip.id,
                              side: 'right',
                              startX: e.clientX,
                              origStart: clip.start,
                              origDuration: clip.duration,
                            });
                          }}
                          onTouchStart={(e) => {
                            e.stopPropagation();
                            useEditorStore.getState().pushHistory();
                            if (e.touches.length > 0) {
                              setTrimmingClip({
                                id: clip.id,
                                side: 'right',
                                startX: e.touches[0].clientX,
                                origStart: clip.start,
                                origDuration: clip.duration,
                              });
                            }
                          }}
                          className={`absolute right-0 top-0 bottom-0 ${
                            isMobile ? 'w-7' : 'w-2.5 hover:w-3.5'
                          } flex items-center justify-center bg-violet-500/30 hover:bg-violet-400 cursor-ew-resize transition-all z-20 touch-none`}
                          title="Drag to trim end"
                        >
                          <div className="w-1 h-5 bg-white/90 rounded-full shadow-sm" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
