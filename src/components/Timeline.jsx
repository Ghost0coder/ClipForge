function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }
function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

import React, { useRef, useState, useEffect } from 'react';
import {
  Scissors,
  Trash2,
  Copy,
  Lock,
  Unlock,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
  Bookmark,
  ArrowLeftRight,
  Snowflake,
  Film,
  Music,
  Type,
  Smile,
  Layers,
  Plus,
  Shuffle,
  Zap,
  X,
  Check,
  Magnet,
  Activity,
} from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { TRANSITIONS_LIST, EFFECTS_LIST } from '../utils/sampleData';
import { useResponsive } from '../utils/useResponsive';
import { MobileFloatingClipBar } from './MobileFloatingClipBar';

export const Timeline = () => {
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
    snapToBeats,
    toggleSnapToBeats,
    selectedClipIds,
    selectClip,
    splitClipAtPlayhead,
    deleteClip,
    deleteSelectedClips,
    duplicateClip,
    freezeFrame,
    moveClip,
    trimClip,
    updateClip,
    addTrack,
    addClipToTrack,
    removeTrack,
    toggleTrackLock,
    toggleTrackHide,
    toggleTrackMute,
    setTrackVolume,
    addMarker,
    copySelected,
    pasteClips,
    autoCutSilence,
    selectedKeyframeId,
    setSelectedKeyframeId,
    updateKeyframeTime,
  } = useEditorStore();

  const { isMobile } = useResponsive();
  const [transitionModal, setTransitionModal] = useState(null);

  const rulerRef = useRef(null);
  const timelineTracksRef = useRef(null);
  const trackHeadersRef = useRef(null);

  // Dragging & Scrubbing states
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [draggingClipId, setDraggingClipId] = useState(null);
  const [trimmingClip, setTrimmingClip] = useState(null);
  const [draggingKeyframe, setDraggingKeyframe] = useState(null);
  const dragClipStartPos = useRef({
    clipId: '',
    startX: 0,
    origStart: 0,
    origTrackId: '',
  });

  // Long press timer for mobile clip drag
  const longPressTimerRef = useRef(null);
  const [isLongPressDragging, setIsLongPressDragging] = useState(false);

  // Pinch-to-zoom tracking
  const lastPinchDistRef = useRef(null);
  const pinchStartZoomRef = useRef(zoom);

  const totalWidth = Math.max(project.duration * zoom + 500, 1400);

  // Time format helper
  const formatRulerTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Detect beats: generates rhythmic beat markers along the project timeline (128 BPM = ~0.46875s)
  const handleDetectBeats = () => {
    useEditorStore.getState().pushHistory();
    const beatInterval = 0.46875; // 128 BPM
    const targetDuration = Math.max(project.duration, 16);
    const newMarkers = [];
    for (let t = 0; t <= targetDuration; t += beatInterval) {
      const beatNum = Math.round(t / beatInterval) + 1;
      const isDownbeat = (beatNum - 1) % 4 === 0;
      newMarkers.push({
        id: 'beat_' + Date.now() + '_' + Math.round(t * 100),
        time: Math.round(t * 100) / 100,
        label: isDownbeat ? `Beat ${beatNum}` : `·`,
        color: isDownbeat ? '#3B82F6' : '#F59E0B',
      });
    }
    useEditorStore.setState((state) => ({
      project: {
        ...state.project,
        markers: [...(state.project.markers || []).filter((m) => !m.id.startsWith('beat_')), ...newMarkers],
      },
    }));
  };

  // Playhead scrubber interactions (mouse + touch)
  const handleRulerScrubStart = (clientX) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const clickX = clientX - rect.left;
    let targetTime = Math.max(0, clickX / zoom);
    if (snapToBeats && project.markers && project.markers.length > 0) {
      const nearestMarker = project.markers.find((m) => Math.abs(m.time - targetTime) < 0.15);
      if (nearestMarker) targetTime = nearestMarker.time;
    }
    seek(targetTime);
    setIsScrubbing(true);
  };

  const handleRulerMouseDown = (e) => {
    handleRulerScrubStart(e.clientX);
  };

  const handleRulerTouchStart = (e) => {
    if (e.touches.length > 0) {
      handleRulerScrubStart(e.touches[0].clientX);
    }
  };

  // Global pointer move & up (supports mouse & touch)
  useEffect(() => {
    const handlePointerMove = (clientX) => {
      if (isScrubbing && rulerRef.current) {
        const rect = rulerRef.current.getBoundingClientRect();
        const clickX = clientX - rect.left;
        let targetTime = Math.max(0, Math.min(clickX / zoom, project.duration));
        if (snapToBeats && project.markers && project.markers.length > 0) {
          const nearestMarker = project.markers.find((m) => Math.abs(m.time - targetTime) < 0.15);
          if (nearestMarker) targetTime = nearestMarker.time;
        }
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

        // Snap to start 00:00 or playhead or beat markers
        if (newStart < 0.2) {
          newStart = 0;
        } else {
          if (snapping && Math.abs(newStart - currentTime) < 0.2) {
            newStart = currentTime;
          }
          if (snapToBeats && project.markers && project.markers.length > 0) {
            const nearestMarker = project.markers.find((m) => Math.abs(m.time - newStart) < 0.25);
            if (nearestMarker) newStart = nearestMarker.time;
          }
        }

        moveClip(draggingClipId, dragClipStartPos.current.origTrackId, newStart);
      }

      if (draggingKeyframe) {
        const deltaPx = clientX - draggingKeyframe.startX;
        const deltaSec = deltaPx / zoom;
        const newTime = Math.max(0, Math.min(draggingKeyframe.clipDuration, draggingKeyframe.origTime + deltaSec));
        draggingKeyframe.keyframeIds.forEach((kId) => {
          updateKeyframeTime(draggingKeyframe.clipId, kId, newTime);
        });
        seek(draggingKeyframe.clipStart + newTime);
      }
    };

    const handleMouseMove = (e) => {
      handlePointerMove(e.clientX);
    };

    const handleTouchMove = (e) => {
      if (isScrubbing || trimmingClip || draggingClipId || draggingKeyframe) {
        if (e.touches.length > 0) {
          handlePointerMove(e.touches[0].clientX);
        }
      }
    };

    const handlePointerUp = () => {
      setIsScrubbing(false);
      setTrimmingClip(null);
      setDraggingClipId(null);
      setDraggingKeyframe(null);
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
  }, [isScrubbing, trimmingClip, draggingClipId, draggingKeyframe, zoom, project.duration, project.markers, currentTime, snapping, snapToBeats, seek, trimClip, moveClip, updateKeyframeTime]);

  // Touch pinch-to-zoom on timeline tracks
  const handleTimelineTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastPinchDistRef.current = dist;
      pinchStartZoomRef.current = zoom;
    }
  };

  const handleTimelineTouchMove = (e) => {
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



  const getTrackIcon = (type) => {
    switch (type) {
      case 'video':
        return <Film className="w-3.5 h-3.5 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} />;
      case 'audio':
        return <Music className="w-3.5 h-3.5 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} />;
      case 'text':
        return <Type className="w-3.5 h-3.5 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} />;
      case 'sticker':
        return <Smile className="w-3.5 h-3.5 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} />;
      case 'effect':
        return <Zap className="w-3.5 h-3.5 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} />;
      default:
        return <Layers className="w-3.5 h-3.5 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} />;
    }
  };

  const getClipBgColor = (clip) => {
    switch (clip.type) {
      case 'video':
      case 'color':
      case 'image':
        return 'bg-[#DCE7F5] dark:bg-[#1E293B] border-[#CBD5E1] dark:border-[#334155] text-[#1E293B] dark:text-[#E2E8F0]';
      case 'audio':
        return 'bg-[#E2ECE5] dark:bg-[#1C3024] border-[#C6DBD0] dark:border-[#2A4B38] text-[#23422E] dark:text-[#D1E7D9]';
      case 'text':
        return 'bg-[#F5EFE6] dark:bg-[#362F24] border-[#E5DAC9] dark:border-[#4D4233] text-[#4F3B20] dark:text-[#EAD9C2]';
      case 'sticker':
        return 'bg-[#FCEAEB] dark:bg-[#382327] border-[#F3CDD1] dark:border-[#543138] text-[#5E282D] dark:text-[#F2CBD2]';
      case 'effect':
        return 'bg-[#F3E8FF] dark:bg-[#2E1065]/50 border-[#D8B4FE] dark:border-[#581C87] text-[#581C87] dark:text-[#E9D5FF]';
      default:
        return 'bg-[#F5F5F5] dark:bg-[#222222] border-[#E5E5E5] dark:border-[#2A2A2A] text-[#171717] dark:text-[#EDEDED]';
    }
  };

  return (
    <footer
      className={`border-t border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#FAFAFA] dark:bg-[#111111] flex flex-col select-none shrink-0 overflow-visible relative z-20 transition-colors ${
        isMobile ? 'flex-1 min-h-[160px] max-h-[30vh]' : 'h-64 md:h-72'
      }`}
    >
      {/* Floating Action Bar above timeline on mobile when clip selected */}
      {isMobile && <MobileFloatingClipBar />}

      {/* Timeline Toolbar */}
      <div className="h-9 px-3 border-b border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] flex items-center justify-between shrink-0 transition-colors">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {/* Split (S) */}
          <button
            onClick={() => splitClipAtPlayhead()}
            className="flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-white dark:bg-[#1A1A1A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-xs font-normal text-[#171717] dark:text-[#EDEDED] border border-[#E5E5E5] dark:border-[#2A2A2A] transition-colors cursor-pointer shrink-0"
            title="Split Clip at Playhead (S)"
          >
            <Scissors className="w-3.5 h-3.5 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} />
            <span className="hidden sm:inline">Split</span>
          </button>

          {/* Delete */}
          <button
            onClick={() => selectedClipIds.length > 0 && deleteSelectedClips(false)}
            disabled={selectedClipIds.length === 0}
            className="flex items-center gap-1 px-2 py-1 rounded-[6px] bg-white dark:bg-[#1A1A1A] hover:bg-red-50 dark:hover:bg-red-950/30 text-xs text-[#737373] dark:text-[#A1A1A1] hover:text-red-600 dark:hover:text-red-400 border border-[#E5E5E5] dark:border-[#2A2A2A] disabled:opacity-30 transition-colors cursor-pointer shrink-0"
            title="Delete Selected Clip(s) (Del / Backspace)"
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span className="hidden sm:inline">Delete</span>
          </button>

          {/* Duplicate */}
          <button
            onClick={() => selectedClipIds.length > 0 && duplicateClip(selectedClipIds[0])}
            disabled={selectedClipIds.length === 0}
            className="flex items-center gap-1 px-2 py-1 rounded-[6px] bg-white dark:bg-[#1A1A1A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-xs text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] border border-[#E5E5E5] dark:border-[#2A2A2A] disabled:opacity-30 transition-colors cursor-pointer shrink-0"
            title="Duplicate Clip (Ctrl+D)"
          >
            <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span className="hidden sm:inline">Duplicate</span>
          </button>

          {/* Freeze Frame */}
          <button
            onClick={() => selectedClipIds.length > 0 && freezeFrame(selectedClipIds[0])}
            disabled={selectedClipIds.length === 0}
            className="flex items-center gap-1 px-2 py-1 rounded-[6px] bg-white dark:bg-[#1A1A1A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-xs text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] border border-[#E5E5E5] dark:border-[#2A2A2A] disabled:opacity-30 transition-colors cursor-pointer shrink-0"
            title="Freeze Frame (F)"
          >
            <Snowflake className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span className="hidden sm:inline">Freeze</span>
          </button>

          {/* Ripple Delete */}
          <button
            onClick={() => selectedClipIds.length > 0 && deleteSelectedClips(true)}
            disabled={selectedClipIds.length === 0}
            className="flex items-center gap-1 px-2 py-1 rounded-[6px] bg-white dark:bg-[#1A1A1A] hover:bg-red-50 dark:hover:bg-red-950/30 text-xs text-[#737373] dark:text-[#A1A1A1] hover:text-red-600 dark:hover:text-red-400 border border-[#E5E5E5] dark:border-[#2A2A2A] disabled:opacity-30 transition-colors cursor-pointer shrink-0"
            title="Ripple Delete [Shift+Del]"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span className="hidden sm:inline">Ripple</span>
          </button>

          {/* Add Marker */}
          <button
            onClick={() => addMarker(currentTime, 'Marker')}
            className="p-1 rounded-[6px] bg-white dark:bg-[#1A1A1A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] border border-[#E5E5E5] dark:border-[#2A2A2A] transition-colors cursor-pointer shrink-0"
            title="Add Marker at Playhead"
          >
            <Bookmark className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>

          {/* Detect Beats */}
          <button
            onClick={handleDetectBeats}
            className="flex items-center gap-1 px-2 py-1 rounded-[6px] bg-white dark:bg-[#1A1A1A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-xs text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] border border-[#E5E5E5] dark:border-[#2A2A2A] transition-colors cursor-pointer shrink-0"
            title="Auto Detect Beats (128 BPM grid & audio markers)"
          >
            <Activity className="w-3.5 h-3.5 text-[#3B82F6]" strokeWidth={1.5} />
            <span className="hidden sm:inline">Detect Beats</span>
          </button>

          {/* Snap to Beats Toggle */}
          <button
            onClick={toggleSnapToBeats}
            className={`flex items-center gap-1 px-2 py-1 rounded-[6px] border text-xs transition-colors cursor-pointer shrink-0 ${
              snapToBeats
                ? 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]'
                : 'bg-white dark:bg-[#1A1A1A] text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] border-[#E5E5E5] dark:border-[#2A2A2A]'
            }`}
            title={snapToBeats ? 'Snap to Beats Active' : 'Snap to Beats Off'}
          >
            <Magnet className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span className="hidden sm:inline">Snap to Beats</span>
          </button>
        </div>

        {/* Right Tools: Zoom Slider & Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoom(Math.max(10, zoom - 15))}
              className="p-1 text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" strokeWidth={1.5} />
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
              className="p-1 text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Multi-Track Body: Left Headers + Right Timeline Canvas */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Track Headers Column */}
        <div
          ref={trackHeadersRef}
          onScroll={(e) => {
            if (timelineTracksRef.current) {
              timelineTracksRef.current.scrollTop = e.currentTarget.scrollTop;
            }
          }}
          className={`${
            isMobile ? 'w-12 sm:w-16' : 'w-44 md:w-48'
          } border-r border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] flex flex-col shrink-0 z-20 overflow-y-auto min-h-0 select-none transition-colors`}
        >
          {/* Header spacer matching ruler height */}
          <div className="h-7 border-b border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#FAFAFA] dark:bg-[#111111] px-2 flex items-center justify-between text-[10px] text-[#737373] dark:text-[#A1A1A1] font-normal shrink-0 sticky top-0 z-10">
            <span>{isMobile ? '#' : 'Tracks'}</span>
            <span className="tabular-nums font-normal text-[10px]">{project.tracks.length}</span>
          </div>

          {/* Track Header Rows */}
          <div className="flex-1 space-y-1 py-1 px-1">
            {project.tracks.map((track) => (
              <div
                key={track.id}
                className="h-14 px-1 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] flex flex-col justify-between py-1 transition-colors group"
              >
                <div className="flex items-center justify-center sm:justify-between min-w-0">
                  <div className="flex items-center gap-1 min-w-0" title={track.name}>
                    {getTrackIcon(track.type)}
                    {!isMobile && (
                      <span className="text-xs font-normal text-[#171717] dark:text-[#EDEDED] truncate">
                        {track.name}
                      </span>
                    )}
                  </div>
                  {!isMobile && project.tracks.length > 2 && (
                    <button
                      onClick={() => removeTrack(track.id)}
                      className="opacity-0 group-hover:opacity-100 text-[#A3A3A3] hover:text-red-500 p-0.5 cursor-pointer"
                      title="Remove Track"
                    >
                      <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                    </button>
                  )}
                </div>

                {/* Track controls: Lock, Hide, Mute */}
                <div className="flex items-center justify-center sm:justify-start gap-1 pt-0.5 border-t border-[#E5E5E5] dark:border-[#2A2A2A] text-[#737373] dark:text-[#A1A1A1]">
                  <button
                    onClick={() => toggleTrackLock(track.id)}
                    className={`hover:text-[#171717] dark:hover:text-[#EDEDED] p-0.5 cursor-pointer ${track.locked ? 'text-[#3B82F6]' : ''}`}
                    title={track.locked ? 'Unlock' : 'Lock'}
                  >
                    {track.locked ? <Lock className="w-3 h-3" strokeWidth={1.5} /> : <Unlock className="w-3 h-3" strokeWidth={1.5} />}
                  </button>

                  <button
                    onClick={() => toggleTrackMute(track.id)}
                    className={`hover:text-[#171717] dark:hover:text-[#EDEDED] p-0.5 cursor-pointer ${track.muted ? 'text-red-500' : ''}`}
                    title={track.muted ? 'Unmute' : 'Mute'}
                  >
                    {track.muted ? <VolumeX className="w-3 h-3" strokeWidth={1.5} /> : <Volume2 className="w-3 h-3" strokeWidth={1.5} />}
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
           className="flex-1 overflow-x-auto overflow-y-auto relative bg-[#FAFAFA] dark:bg-[#111111] min-h-0 touch-pan-x touch-pan-y transition-colors"
        >
          <div style={{ width: `${totalWidth}px` }} className="relative min-h-full">
            {/* Timeline Ruler */}
            <div
              ref={rulerRef}
              onMouseDown={handleRulerMouseDown}
              onTouchStart={handleRulerTouchStart}
              className="h-7 border-b border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] sticky top-0 cursor-pointer relative z-10 touch-none transition-colors"
            >
              {/* Ruler ticks every 1 second */}
              {Array.from({ length: Math.ceil(project.duration) + 15 }).map((_, sec) => {
                const posX = sec * zoom;
                return (
                  <div key={sec} style={{ left: `${posX}px` }} className="absolute top-0 h-full">
                    <div className="timeline-tick-major" />
                    <span className="absolute top-2 left-1 text-[9px] tabular-nums font-normal text-[#737373] dark:text-[#A1A1A1]">
                      {formatRulerTime(sec)}
                    </span>
                  </div>
                );
              })}

              {/* Markers on Ruler */}
              {_optionalChain([project, 'access', _2 => _2.markers, 'optionalAccess', _3 => _3.map, 'call', _4 => _4((marker) => (
                <div
                  key={marker.id}
                  style={{ left: `${marker.time * zoom}px` }}
                  className="absolute top-0 transform -translate-x-1/2 z-20 group cursor-pointer"
                  title={`${marker.label} (${marker.time.toFixed(2)}s)`}
                >
                  <div
                    className="w-2.5 h-3 rounded-b-sm shadow-sm"
                    style={{ backgroundColor: marker.color }}
                  />
                </div>
              ))])}
            </div>

            {/* Playhead Scrubber Line Spanning All Tracks - Single soft accent #3B82F6 without glow */}
            <div
              style={{ left: `${currentTime * zoom}px` }}
              className="absolute top-0 bottom-0 w-[1.5px] bg-[#3B82F6] z-30 pointer-events-none"
            >
              {/* Playhead Needle Head */}
              <div
                onMouseDown={handleRulerMouseDown}
                onTouchStart={handleRulerTouchStart}
                style={{ marginLeft: currentTime * zoom < 6 ? '0px' : '-5px' }}
                className="w-3 h-3 bg-[#3B82F6] rotate-45 -mt-1 shadow-sm pointer-events-auto cursor-ew-resize touch-none"
              />
            </div>

            {/* Track Lanes - flush left 00:00 alignment */}
            <div
              className="space-y-1 py-1 pl-0 pr-4"
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes('application/clipforge-effect')) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'copy';
                }
              }}
              onDrop={(e) => {
                const effectId = e.dataTransfer.getData('application/clipforge-effect');
                if (effectId) {
                  e.preventDefault();
                  const tracksEl = timelineTracksRef.current;
                  const scrollLeft = tracksEl ? tracksEl.scrollLeft : 0;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const dropX = e.clientX - rect.left + scrollLeft;
                  const dropTime = Math.max(0, dropX / zoom);

                  let effectTrack = project.tracks.find((t) => t.type === 'effect');
                  if (!effectTrack) {
                    effectTrack = {
                      id: 'track_effect_' + Date.now(),
                      name: 'Effects',
                      type: 'effect',
                      locked: false,
                      hidden: false,
                      muted: false,
                      volume: 1,
                      clips: [],
                    };
                    addTrack(effectTrack);
                  }

                  const fx = EFFECTS_LIST.find((f) => f.id === effectId) || { name: 'Effect' };
                  const newClip = {
                    id: 'clip_effect_' + Date.now(),
                    trackId: effectTrack.id,
                    type: 'effect',
                    name: fx.name,
                    effectType: effectId,
                    effectIntensity: 60,
                    start: dropTime,
                    duration: 3.0,
                    sourceStart: 0,
                    sourceDuration: 3.0,
                    x: 0,
                    y: 0,
                    scale: 1,
                    rotation: 0,
                    opacity: 1,
                    keyframes: [],
                  };
                  useEditorStore.getState().pushHistory();
                  addClipToTrack(effectTrack.id, newClip);
                  selectClip(newClip.id);
                }
              }}
            >
              {project.tracks.map((track) => (
                <div
                  key={track.id}
                  className={`h-14 relative bg-white/70 dark:bg-[#1A1A1A]/70 border-y border-r border-[#E5E5E5] dark:border-[#2A2A2A] border-l-0 rounded-r-[6px] transition-colors ${
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
                          if (e.target !== e.currentTarget && (e.target ).dataset.handle) {
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
                          if (e.target !== e.currentTarget && (e.target ).dataset.handle) {
                            return;
                          }
                          selectClip(clip.id);

                          const touch = e.touches[0];
                          const startX = touch.clientX;
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
                        className={`absolute top-1 bottom-1 rounded-[6px] border text-xs px-2 py-1 flex items-center justify-between cursor-move overflow-hidden transition-all ${getClipBgColor(
                          clip
                        )} ${isSelected ? 'ring-2 ring-[#3B82F6] border-[#3B82F6]' : ''}`}
                      >
                        {/* Left Trim Handle */}
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
                          } flex items-center justify-center bg-black/10 dark:bg-white/10 hover:bg-[#3B82F6]/30 cursor-ew-resize transition-all z-20 touch-none`}
                          title="Drag to trim start"
                        >
                          <div className="w-1 h-5 bg-[#737373] dark:bg-[#D4D4D4] rounded-full" />
                        </div>

                        {/* Audio Waveform visualization */}
                        {clip.type === 'audio' && (
                          <div className="absolute inset-0 flex items-center justify-around pointer-events-none opacity-30 px-3 overflow-hidden select-none">
                            {Array.from({ length: Math.min(80, Math.max(12, Math.floor(widthPx / 4.5))) }).map((_, barIdx) => {
                              const charCode = clip.id.charCodeAt(barIdx % clip.id.length) || 65;
                              const pseudoRandom = Math.sin(barIdx * 0.7 + charCode * 0.1) * 0.5 + 0.5;
                              const heightPct = 15 + Math.round(pseudoRandom * 75);
                              return (
                                <span
                                  key={barIdx}
                                  className="w-[2px] bg-emerald-800 dark:bg-emerald-300 rounded-full shrink-0"
                                  style={{ height: `${heightPct}%` }}
                                />
                              );
                            })}
                          </div>
                        )}

                        {/* Clip Content Label */}
                        <div className="flex items-center gap-1.5 min-w-0 pr-2 pointer-events-none mx-auto relative z-10">
                          <span className="font-normal truncate text-[11px]">
                            {clip.type === 'sticker' && clip.stickerEmoji ? `${clip.stickerEmoji} ` : ''}
                            {clip.name}
                          </span>
                          {clip.freezeFrame && (
                            <span className="text-[9px] bg-white/70 dark:bg-black/50 px-1 py-0.5 rounded-[4px] border border-[#CBD5E1] dark:border-[#334155] shrink-0">
                              ❄️
                            </span>
                          )}
                          {clip.transitionIn && (
                            <span className="text-[9px] bg-[#3B82F6] text-white px-1 py-0.2 rounded-[3px] shrink-0 flex items-center gap-0.5" title={`Transition: ${clip.transitionIn.type}`}>
                              <Shuffle className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>

                        {/* Right Trim Handle */}
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
                          } flex items-center justify-center bg-black/10 dark:bg-white/10 hover:bg-[#3B82F6]/30 cursor-ew-resize transition-all z-20 touch-none`}
                          title="Drag to trim end"
                        >
                          <div className="w-1 h-5 bg-[#737373] dark:bg-[#D4D4D4] rounded-full" />
                        </div>

                        {/* Keyframe Markers on Selected Clip */}
                        {isSelected && clip.keyframes && clip.keyframes.length > 0 && (() => {
                          const kfMap = new Map();
                          clip.keyframes.forEach((kf) => {
                            const timeKey = Math.round(kf.time * 100) / 100;
                            if (!kfMap.has(timeKey)) {
                              kfMap.set(timeKey, []);
                            }
                            kfMap.get(timeKey).push(kf);
                          });
                          return Array.from(kfMap.entries()).map(([timeKey, kfs]) => {
                            const time = Number(timeKey);
                            const kfLeftPx = time * zoom;
                            const isKfSelected = kfs.some((k) => k.id === selectedKeyframeId);
                            return (
                              <div
                                key={`kf-marker-${clip.id}-${timeKey}`}
                                data-handle="keyframe"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedKeyframeId(kfs[0].id);
                                  seek(clip.start + time);
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setSelectedKeyframeId(kfs[0].id);
                                  seek(clip.start + time);
                                  setDraggingKeyframe({
                                    clipId: clip.id,
                                    keyframeIds: kfs.map((k) => k.id),
                                    startX: e.clientX,
                                    origTime: time,
                                    clipDuration: clip.duration,
                                    clipStart: clip.start,
                                  });
                                }}
                                onTouchStart={(e) => {
                                  e.stopPropagation();
                                  if (e.touches.length > 0) {
                                    setSelectedKeyframeId(kfs[0].id);
                                    seek(clip.start + time);
                                    setDraggingKeyframe({
                                      clipId: clip.id,
                                      keyframeIds: kfs.map((k) => k.id),
                                      startX: e.touches[0].clientX,
                                      origTime: time,
                                      clipDuration: clip.duration,
                                      clipStart: clip.start,
                                    });
                                  }
                                }}
                                style={{
                                  left: `${kfLeftPx}px`,
                                }}
                                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-30 cursor-ew-resize flex items-center justify-center p-2 touch-none group/kf"
                                title={`Keyframe @ ${time.toFixed(2)}s: ${kfs.map((k) => k.property).join(', ')}`}
                              >
                                <div
                                  className={`w-2.5 h-2.5 rotate-45 transition-transform ${
                                    isKfSelected
                                      ? 'bg-[#3B82F6] ring-2 ring-white dark:ring-[#111111] scale-125 shadow-sm'
                                      : 'bg-white dark:bg-[#1A1A1A] border border-[#737373] dark:border-[#A1A1A1] group-hover/kf:scale-125'
                                  }`}
                                />
                              </div>
                            );
                          });
                        })()}
                      </div>
                    );
                  })}

                  {/* Transition Cut Buttons between adjacent clips on visual tracks */}
                  {track.type !== 'audio' && (() => {
                    const sortedClips = [...track.clips].sort((a, b) => a.start - b.start);
                    return sortedClips.slice(0, -1).map((clipA, idx) => {
                      const clipB = sortedClips[idx + 1];
                      const gap = clipB.start - (clipA.start + clipA.duration);
                      if (gap < 0.4 && gap > -0.1) {
                        const cutPosPx = clipB.start * zoom;
                        const hasTransition = Boolean(clipB.transitionIn && clipB.transitionIn.type);
                        const transItem = hasTransition ? TRANSITIONS_LIST.find((t) => t.id === clipB.transitionIn.type) : null;
                        const transName = transItem ? transItem.name : (clipB.transitionIn ? clipB.transitionIn.type : '');

                        return (
                          <div
                            key={`trans-cut-${clipA.id}-${clipB.id}`}
                            style={{ left: `${cutPosPx}px` }}
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-35 flex items-center justify-center pointer-events-auto"
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTransitionModal({
                                  clipId: clipB.id,
                                  clipName: clipB.name,
                                  currentTransition: clipB.transitionIn || { type: 'dissolve', duration: 0.5 },
                                });
                              }}
                              className={`group flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer ${
                                isMobile ? 'min-w-[44px] min-h-[44px]' : 'p-0.5'
                              }`}
                              title={hasTransition ? `Transition: ${transName} (${clipB.transitionIn.duration}s). Click to edit.` : 'Add Transition between clips (+)'}
                            >
                              {hasTransition ? (
                                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-[#3B82F6] text-white text-[10px] font-medium border border-blue-400 shadow-xs">
                                  <Shuffle className="w-2.5 h-2.5" strokeWidth={2} />
                                  <span className="hidden sm:inline max-w-[50px] truncate">{transName}</span>
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-[4px] bg-white dark:bg-[#1A1A1A] border border-[#CBD5E1] dark:border-[#404040] hover:border-[#3B82F6] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] flex items-center justify-center text-[11px] font-semibold text-[#525252] dark:text-[#A3A3A3] hover:text-[#171717] dark:hover:text-[#EDEDED] shadow-xs">
                                  <Plus className="w-3 h-3" strokeWidth={2} />
                                </div>
                              )}
                            </button>
                          </div>
                        );
                      }
                      return null;
                    });
                  })()}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Transition Selector Modal */}
      {transitionModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setTransitionModal(null)}
        >
          <div
            className="bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[8px] shadow-xl w-full max-w-sm p-4 space-y-3.5 select-none animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E5E5E5] dark:border-[#2A2A2A] pb-2.5">
              <div>
                <h3 className="text-xs font-semibold text-[#171717] dark:text-[#EDEDED] flex items-center gap-1.5">
                  <Shuffle className="w-3.5 h-3.5 text-[#3B82F6]" strokeWidth={1.5} />
                  Add Transition to Cut
                </h3>
                <p className="text-[10px] text-[#737373] dark:text-[#A1A1A1] truncate max-w-[240px]">
                  Clip: {transitionModal.clipName}
                </p>
              </div>
              <button
                onClick={() => setTransitionModal(null)}
                className="p-1 rounded-[4px] text-[#737373] hover:text-[#171717] dark:hover:text-[#EDEDED] cursor-pointer"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            {/* Duration slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-normal text-[#171717] dark:text-[#EDEDED]">Duration</span>
                <span className="font-mono text-[#737373] dark:text-[#A1A1A1] tabular-nums text-[11px]">
                  {(transitionModal.currentTransition?.duration || 0.5).toFixed(1)}s
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="2.0"
                step="0.1"
                value={transitionModal.currentTransition?.duration || 0.5}
                onChange={(e) => {
                  const dur = parseFloat(e.target.value);
                  setTransitionModal((prev) => ({
                    ...prev,
                    currentTransition: {
                      ...(prev.currentTransition || { type: 'dissolve' }),
                      duration: dur,
                    },
                  }));
                }}
                className="w-full cursor-pointer accent-[#171717] dark:accent-[#EDEDED]"
              />
              <div className="flex items-center gap-1">
                {[0.3, 0.5, 0.8, 1.0, 1.5].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setTransitionModal((prev) => ({
                        ...prev,
                        currentTransition: {
                          ...(prev.currentTransition || { type: 'dissolve' }),
                          duration: d,
                        },
                      }));
                    }}
                    className={`flex-1 py-0.5 rounded-[4px] text-[10px] font-normal border transition-colors cursor-pointer tabular-nums ${
                      Math.abs((transitionModal.currentTransition?.duration || 0.5) - d) < 0.05
                        ? 'bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#171717] border-[#171717] dark:border-[#EDEDED]'
                        : 'bg-white dark:bg-[#1A1A1A] text-[#737373] dark:text-[#A1A1A1] border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626]'
                    }`}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>

            {/* Grid of transitions */}
            <div className="space-y-1">
              <span className="text-[11px] font-normal text-[#737373] dark:text-[#A1A1A1] block">
                Preset Styles ({TRANSITIONS_LIST.length})
              </span>
              <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-0.5">
                {TRANSITIONS_LIST.map((t) => {
                  const isSelected = transitionModal.currentTransition?.type === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setTransitionModal((prev) => ({
                          ...prev,
                          currentTransition: {
                            type: t.id,
                            duration: prev.currentTransition?.duration || 0.5,
                          },
                        }));
                      }}
                      className={`p-2 rounded-[6px] border flex flex-col items-center justify-center gap-1 transition-all text-center cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/40 border-[#3B82F6] text-[#3B82F6]'
                          : 'bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] hover:border-[#3B82F6] text-[#171717] dark:text-[#EDEDED]'
                      }`}
                    >
                      <Shuffle className="w-3.5 h-3.5 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} />
                      <span className="text-[11px] font-normal truncate w-full">{t.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  useEditorStore.getState().pushHistory();
                  updateClip(transitionModal.clipId, { transitionIn: null });
                  setTransitionModal(null);
                }}
                className="px-2.5 py-1.5 rounded-[6px] text-xs font-normal text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
              >
                Remove
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTransitionModal(null)}
                  className="px-3 py-1.5 rounded-[6px] text-xs font-normal border border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-[#171717] dark:text-[#EDEDED] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (transitionModal.currentTransition?.type) {
                      useEditorStore.getState().pushHistory();
                      updateClip(transitionModal.clipId, {
                        transitionIn: {
                          type: transitionModal.currentTransition.type,
                          duration: transitionModal.currentTransition.duration || 0.5,
                        },
                      });
                    }
                    setTransitionModal(null);
                  }}
                  className="px-3.5 py-1.5 rounded-[6px] text-xs font-medium bg-[#171717] hover:bg-[#262626] text-white dark:bg-[#EDEDED] dark:hover:bg-white dark:text-[#171717] transition-colors cursor-pointer shadow-xs"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};
