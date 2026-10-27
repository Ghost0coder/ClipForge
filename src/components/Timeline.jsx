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
  Sliders,
  ChevronLeft,
  FolderPlus,
} from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { TRANSITIONS_LIST, EFFECTS_LIST } from '../utils/sampleData';
import { useResponsive } from '../utils/useResponsive';
import { MobileFloatingClipBar } from './MobileFloatingClipBar';
import { TransitionModal } from './TransitionModal';
import { toastSuccess } from '../store/toastStore';

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
    trackHeightMode,
    setTrackHeightMode,
    activeCompoundClipId,
    enterCompoundClip,
    exitCompoundClip,
    groupSelectedIntoCompoundClip,
    setMixerModalOpen,
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

  const formatTimecode = (sec) => {
    if (isNaN(sec) || sec < 0) sec = 0;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const f = Math.floor((sec % 1) * 30);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${f.toString().padStart(2, '0')}`;
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
    if (clip.colorLabel) {
      return 'border-black/25 text-white shadow-xs';
    }
    if (clip.type === 'compound') {
      return 'bg-[#EDE9FE] dark:bg-[#2E1065]/70 border-[#C4B5FD] dark:border-[#581C87] text-[#5B21B6] dark:text-[#DDD6FE]';
    }
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

  let activeCompoundClip = null;
  if (activeCompoundClipId) {
    for (const t of project.tracks) {
      const found = t.clips.find((c) => c.id === activeCompoundClipId);
      if (found) {
        activeCompoundClip = found;
        break;
      }
    }
  }
  const tracksToRender = activeCompoundClipId && activeCompoundClip?.compoundData?.tracks
    ? activeCompoundClip.compoundData.tracks
    : project.tracks;

  const trackHeightClass =
    trackHeightMode === 'small' ? 'h-10' : trackHeightMode === 'large' ? 'h-20' : 'h-14';

  return (
    <footer
      className={`border-t border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#FAFAFA] dark:bg-[#111111] flex flex-col select-none overflow-visible relative z-20 transition-colors ${
        isMobile ? 'flex-1 min-h-0 h-full w-full' : 'h-64 md:h-72 shrink-0'
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
            <span className="hidden sm:inline">Snap Beats</span>
          </button>

          {/* Magnetic Timeline Toggle */}
          <button
            onClick={toggleMagnetic}
            className={`flex items-center gap-1 px-2 py-1 rounded-[6px] border text-xs transition-colors cursor-pointer shrink-0 ${
              magneticTimeline
                ? 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]'
                : 'bg-white dark:bg-[#1A1A1A] text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] border-[#E5E5E5] dark:border-[#2A2A2A]'
            }`}
            title={magneticTimeline ? 'Magnetic Timeline: On (clips snap with no gaps)' : 'Magnetic Timeline: Off'}
          >
            <Magnet className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span className="hidden sm:inline">Magnetic</span>
          </button>

          {/* Group into Compound Clip */}
          <button
            onClick={() => groupSelectedIntoCompoundClip()}
            disabled={selectedClipIds.length === 0}
            className="flex items-center gap-1 px-2 py-1 rounded-[6px] bg-white dark:bg-[#1A1A1A] hover:bg-purple-50 dark:hover:bg-purple-950/30 text-xs text-[#737373] dark:text-[#A1A1A1] hover:text-purple-600 dark:hover:text-purple-400 border border-[#E5E5E5] dark:border-[#2A2A2A] disabled:opacity-30 transition-colors cursor-pointer shrink-0"
            title="Group Selected Clips into Compound Clip"
          >
            <FolderPlus className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span className="hidden sm:inline">Compound</span>
          </button>

          {/* Audio Mixer Modal Button */}
          <button
            onClick={() => setMixerModalOpen(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-[6px] bg-white dark:bg-[#1A1A1A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-xs text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] border border-[#E5E5E5] dark:border-[#2A2A2A] transition-colors cursor-pointer shrink-0"
            title="Open Audio Mixer & Limiter"
          >
            <Sliders className="w-3.5 h-3.5 text-[#3B82F6]" strokeWidth={1.5} />
            <span className="hidden sm:inline">Mixer</span>
          </button>
        </div>

        {/* Right Tools: Track Height & Zoom Slider */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Track Height Switcher */}
          <div className="flex items-center border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] p-0.5 bg-white dark:bg-[#1A1A1A]">
            {[
              { id: 'small', label: 'S', title: 'Small track height (38px)' },
              { id: 'medium', label: 'M', title: 'Medium track height (56px)' },
              { id: 'large', label: 'L', title: 'Large track height (78px)' },
            ].map((th) => (
              <button
                key={th.id}
                type="button"
                onClick={() => setTrackHeightMode(th.id)}
                className={`px-1.5 py-0.5 text-[10px] rounded-[3px] transition-colors cursor-pointer ${
                  trackHeightMode === th.id
                    ? 'bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#171717] font-medium'
                    : 'text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED]'
                }`}
                title={th.title}
              >
                {th.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoom(Math.max(10, zoom - 15))}
              className={`text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] cursor-pointer flex items-center justify-center ${
                isMobile ? 'min-w-[34px] min-h-[34px] p-1 active:bg-[#F5F5F5] dark:active:bg-[#262626] rounded-[6px]' : 'p-1'
              }`}
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
            {isMobile ? (
              <span className="text-[10px] tabular-nums font-mono text-[#737373] dark:text-[#A1A1A1] px-1 select-none">
                {Math.round((zoom / 45) * 100)}%
              </span>
            ) : (
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
              className={`text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] cursor-pointer flex items-center justify-center ${
                isMobile ? 'min-w-[34px] min-h-[34px] p-1 active:bg-[#F5F5F5] dark:active:bg-[#262626] rounded-[6px]' : 'p-1'
              }`}
              title="Zoom In"
              aria-label="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Compound Clip Breadcrumb Navigation Bar */}
      {activeCompoundClipId && (
        <div className="h-8 px-3 bg-purple-50 dark:bg-purple-950/40 border-b border-purple-200 dark:border-purple-800/60 flex items-center justify-between text-xs text-purple-700 dark:text-purple-300 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exitCompoundClip}
              className="px-2 py-0.5 rounded bg-white dark:bg-[#1A1A1A] border border-purple-300 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/50 flex items-center gap-1 font-medium transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back to Main Timeline</span>
            </button>
            <span className="font-semibold truncate">
              Editing: {activeCompoundClip?.name || 'Compound Clip'}
            </span>
          </div>
          <span className="text-[10px] opacity-75 hidden sm:inline">
            Double-click exit or click Back to return
          </span>
        </div>
      )}

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
            <span className="tabular-nums font-normal text-[10px]">{tracksToRender.length}</span>
          </div>

          {/* Track Header Rows */}
          <div className="flex-1 space-y-1 py-1 px-1">
            {tracksToRender.map((track) => (
              <div
                key={track.id}
                className={`${trackHeightClass} px-1 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] flex flex-col justify-between py-1 transition-colors group`}
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

            {/* Playhead Scrubber Line Spanning All Tracks - Single soft accent #3B82F6 */}
            <div
              style={{ left: `${currentTime * zoom}px` }}
              className={`absolute top-0 bottom-0 ${isMobile ? 'w-[2px]' : 'w-[1.5px]'} bg-[#3B82F6] z-30 pointer-events-none`}
            >
              {/* Playhead Needle Head with touch target */}
              <div
                onMouseDown={handleRulerMouseDown}
                onTouchStart={handleRulerTouchStart}
                style={{ marginLeft: currentTime * zoom < 6 ? '0px' : isMobile ? '-8px' : '-5px' }}
                className={`${
                  isMobile ? 'w-4 h-4 -mt-1.5 rounded-full' : 'w-3 h-3 rotate-45 -mt-1'
                } bg-[#3B82F6] shadow-md pointer-events-auto cursor-ew-resize touch-none flex items-center justify-center active:scale-125 transition-transform`}
                title={`Playhead: ${formatTimecode(currentTime)}`}
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
              {tracksToRender.map((track) => (
                <div
                  key={track.id}
                  className={`${trackHeightClass} relative bg-white/70 dark:bg-[#1A1A1A]/70 border-y border-r border-[#E5E5E5] dark:border-[#2A2A2A] border-l-0 rounded-r-[6px] transition-colors ${
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
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          if (clip.type === 'compound') {
                            enterCompoundClip(clip.id);
                          }
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
                          backgroundColor: clip.colorLabel || undefined,
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
                            isMobile ? 'w-9' : 'w-2.5 hover:w-3.5'
                          } flex items-center justify-center bg-black/10 dark:bg-white/10 hover:bg-[#3B82F6]/30 cursor-ew-resize transition-all z-20 touch-none`}
                          title="Drag to trim start"
                        >
                          <div className={`${isMobile ? 'w-1.5 h-6' : 'w-1 h-5'} bg-[#737373] dark:bg-[#D4D4D4] rounded-full`} />
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
                          {clip.animationIn && clip.animationIn !== 'none' && (
                            <span className="text-[9px] bg-purple-600 text-white px-1 py-0.2 rounded-[3px] shrink-0" title={`Animation In: ${clip.animationIn}`}>
                              In
                            </span>
                          )}
                          {clip.animationOut && clip.animationOut !== 'none' && (
                            <span className="text-[9px] bg-indigo-600 text-white px-1 py-0.2 rounded-[3px] shrink-0" title={`Animation Out: ${clip.animationOut}`}>
                              Out
                            </span>
                          )}
                          {clip.animationLoop && clip.animationLoop !== 'none' && (
                            <span className="text-[9px] bg-amber-600 text-white px-1 py-0.2 rounded-[3px] shrink-0" title={`Loop: ${clip.animationLoop}`}>
                              Loop
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
                            isMobile ? 'w-9' : 'w-2.5 hover:w-3.5'
                          } flex items-center justify-center bg-black/10 dark:bg-white/10 hover:bg-[#3B82F6]/30 cursor-ew-resize transition-all z-20 touch-none`}
                          title="Drag to trim end"
                        >
                          <div className={`${isMobile ? 'w-1.5 h-6' : 'w-1 h-5'} bg-[#737373] dark:bg-[#D4D4D4] rounded-full`} />
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

                  {/* Transition Cut Buttons on visual tracks */}
                  {track.type !== 'audio' && (() => {
                    const sortedClips = [...track.clips].sort((a, b) => a.start - b.start);
                    if (sortedClips.length === 0) return null;

                    const firstClip = sortedClips[0];
                    const lastClip = sortedClips[sortedClips.length - 1];

                    const firstCutPosPx = firstClip.start * zoom;
                    const hasFirstTrans = Boolean(firstClip.transitionIn && firstClip.transitionIn.type);
                    const firstTransItem = hasFirstTrans ? TRANSITIONS_LIST.find((t) => t.id === firstClip.transitionIn.type) : null;
                    const firstTransName = firstTransItem ? firstTransItem.name : (firstClip.transitionIn ? firstClip.transitionIn.type : '');

                    const lastCutPosPx = (lastClip.start + lastClip.duration) * zoom;
                    const hasLastTrans = Boolean(lastClip.transitionOut && lastClip.transitionOut.type);
                    const lastTransItem = hasLastTrans ? TRANSITIONS_LIST.find((t) => t.id === lastClip.transitionOut.type) : null;
                    const lastTransName = lastTransItem ? lastTransItem.name : (lastClip.transitionOut ? lastClip.transitionOut.type : '');

                    return (
                      <>
                        {/* 1. First clip In-Transition (Fade in from black / cut) */}
                        <div
                          key={`trans-first-${firstClip.id}`}
                          style={{ left: `${firstCutPosPx}px` }}
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-35 flex items-center justify-center pointer-events-auto"
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTransitionModal({
                                clipId: firstClip.id,
                                clipName: firstClip.name,
                                currentTransition: firstClip.transitionIn || { type: 'fade', duration: 0.6 },
                                mode: 'in',
                              });
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'copy';
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              try {
                                const raw = e.dataTransfer.getData('application/json');
                                if (raw) {
                                  const data = JSON.parse(raw);
                                  if (data.type === 'transition') {
                                    useEditorStore.getState().pushHistory();
                                    updateClip(firstClip.id, { transitionIn: { type: data.transitionId, duration: 0.6 } });
                                    toastSuccess('Applied In-Transition (Fade in from Black)', 'Transition Added');
                                  }
                                }
                              } catch (err) {}
                            }}
                            className={`group flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer ${
                              isMobile ? 'min-w-[44px] min-h-[44px]' : 'p-0.5'
                            }`}
                            title={hasFirstTrans ? `In-Transition: ${firstTransName} (${firstClip.transitionIn.duration}s). Click to edit.` : 'Add In-Transition (Fade in from black)'}
                          >
                            {hasFirstTrans ? (
                              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-[#3B82F6] text-white text-[10px] font-medium border border-blue-400 shadow-xs">
                                <Shuffle className="w-2.5 h-2.5" strokeWidth={2} />
                                <span className="hidden sm:inline max-w-[50px] truncate">{firstTransName}</span>
                              </div>
                            ) : (
                              <div className="w-4 h-4 rounded-[3px] bg-white dark:bg-[#1A1A1A] border border-[#CBD5E1] dark:border-[#404040] hover:border-[#3B82F6] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] flex items-center justify-center text-[10px] text-[#525252] dark:text-[#A3A3A3] hover:text-[#171717] dark:hover:text-[#EDEDED] shadow-xs">
                                <Plus className="w-2.5 h-2.5" strokeWidth={2} />
                              </div>
                            )}
                          </button>
                        </div>

                        {/* 2. Adjacent clips cuts */}
                        {sortedClips.slice(0, -1).map((clipA, idx) => {
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
                                      mode: 'in',
                                    });
                                  }}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'copy';
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    try {
                                      const raw = e.dataTransfer.getData('application/json');
                                      if (raw) {
                                        const data = JSON.parse(raw);
                                        if (data.type === 'transition') {
                                          useEditorStore.getState().pushHistory();
                                          updateClip(clipB.id, { transitionIn: { type: data.transitionId, duration: 0.6 } });
                                          toastSuccess('Applied transition to cut', 'Transition Added');
                                        }
                                      }
                                    } catch (err) {}
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
                        })}

                        {/* 3. Last clip Out-Transition (Fade out to black / cut) */}
                        <div
                          key={`trans-last-${lastClip.id}`}
                          style={{ left: `${lastCutPosPx}px` }}
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-35 flex items-center justify-center pointer-events-auto"
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTransitionModal({
                                clipId: lastClip.id,
                                clipName: lastClip.name,
                                currentTransition: lastClip.transitionOut || { type: 'fade', duration: 0.6 },
                                mode: 'out',
                              });
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'copy';
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              try {
                                const raw = e.dataTransfer.getData('application/json');
                                if (raw) {
                                  const data = JSON.parse(raw);
                                  if (data.type === 'transition') {
                                    useEditorStore.getState().pushHistory();
                                    updateClip(lastClip.id, { transitionOut: { type: data.transitionId, duration: 0.6 } });
                                    toastSuccess('Applied Out-Transition (Fade out to Black)', 'Transition Added');
                                  }
                                }
                              } catch (err) {}
                            }}
                            className={`group flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer ${
                              isMobile ? 'min-w-[44px] min-h-[44px]' : 'p-0.5'
                            }`}
                            title={hasLastTrans ? `Out-Transition: ${lastTransName} (${lastClip.transitionOut.duration}s). Click to edit.` : 'Add Out-Transition (Fade out to black)'}
                          >
                            {hasLastTrans ? (
                              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-[#3B82F6] text-white text-[10px] font-medium border border-blue-400 shadow-xs">
                                <Shuffle className="w-2.5 h-2.5" strokeWidth={2} />
                                <span className="hidden sm:inline max-w-[50px] truncate">{lastTransName}</span>
                              </div>
                            ) : (
                              <div className="w-4 h-4 rounded-[3px] bg-white dark:bg-[#1A1A1A] border border-[#CBD5E1] dark:border-[#404040] hover:border-[#3B82F6] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] flex items-center justify-center text-[10px] text-[#525252] dark:text-[#A3A3A3] hover:text-[#171717] dark:hover:text-[#EDEDED] shadow-xs">
                                <Plus className="w-2.5 h-2.5" strokeWidth={2} />
                              </div>
                            )}
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Comprehensive Transition Selector Modal */}
      {transitionModal && (
        <TransitionModal
          isOpen={Boolean(transitionModal)}
          onClose={() => setTransitionModal(null)}
          clipId={transitionModal.clipId}
          clipName={transitionModal.clipName}
          initialTransition={transitionModal.currentTransition}
          onApply={(updatedTransition) => {
            useEditorStore.getState().pushHistory();
            if (transitionModal.mode === 'out') {
              updateClip(transitionModal.clipId, { transitionOut: updatedTransition });
            } else {
              updateClip(transitionModal.clipId, { transitionIn: updatedTransition });
            }
          }}
        />
      )}
    </footer>
  );
};
