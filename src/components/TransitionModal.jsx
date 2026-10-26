import React, { useState, useMemo } from 'react';
import {
  X,
  Shuffle,
  Search,
  Star,
  Check,
  Trash2,
  Layers,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Minimize2,
  Maximize2,
} from 'lucide-react';
import { TRANSITIONS_REGISTRY, TRANSITIONS_LIST, TRANSITION_CATEGORIES } from '../utils/transitions';
import { TransitionThumbnail } from './TransitionThumbnail';
import { useEditorStore } from '../store/editorStore';
import { toastSuccess } from '../store/toastStore';

export const TransitionModal = ({
  isOpen,
  onClose,
  clipId,
  clipName,
  initialTransition = { type: 'dissolve', duration: 0.5, easing: 'easeInOut' },
  onApply,
}) => {
  const { project, setProject, pushHistory } = useEditorStore();
  const [selectedType, setSelectedType] = useState(initialTransition?.type || 'dissolve');
  const [duration, setDuration] = useState(initialTransition?.duration || 0.5);
  const [direction, setDirection] = useState(initialTransition?.direction || 'left');
  const [easing, setEasing] = useState(initialTransition?.easing || 'easeInOut');
  const [category, setCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('clipforge_favorite_transitions');
      return saved ? JSON.parse(saved) : ['fade', 'dissolve', 'wipe-left', 'zoom-in', 'glitch'];
    } catch (e) {
      return ['fade', 'dissolve', 'wipe-left', 'zoom-in'];
    }
  });

  const toggleFavorite = (id) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem('clipforge_favorite_transitions', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const filteredTransitions = useMemo(() => {
    return TRANSITIONS_LIST.filter((t) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!t.name.toLowerCase().includes(q) && !t.category.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (category === 'All') return true;
      if (category === 'Favorites') return favorites.includes(t.id);
      return t.category.toLowerCase() === category.toLowerCase();
    });
  }, [category, searchQuery, favorites]);

  if (!isOpen) return null;

  const currentTransitionObj = TRANSITIONS_REGISTRY[selectedType] || TRANSITIONS_REGISTRY['dissolve'];

  // Apply to current clip cut
  const handleSave = () => {
    const updated = {
      type: selectedType,
      duration: Math.max(0.1, Math.min(3.0, Number(duration))),
      direction,
      easing,
    };
    if (onApply) {
      onApply(updated);
    }
    onClose();
  };

  // Remove transition from this cut
  const handleRemove = () => {
    if (onApply) {
      onApply(null);
    }
    toastSuccess('Transition removed from cut', 'Removed');
    onClose();
  };

  // Apply this transition style & settings to ALL cuts across the project
  const handleApplyToAll = () => {
    pushHistory();
    const transitionData = {
      type: selectedType,
      duration: Math.max(0.1, Math.min(3.0, Number(duration))),
      direction,
      easing,
    };

    const updatedTracks = project.tracks.map((track) => {
      if (track.type === 'audio') return track;
      return {
        ...track,
        clips: track.clips.map((c, idx) => {
          // Apply to every clip except isolated ones
          return {
            ...c,
            transitionIn: { ...transitionData },
          };
        }),
      };
    });

    const updatedProject = {
      ...project,
      tracks: updatedTracks,
      updatedAt: Date.now(),
    };
    setProject(updatedProject);
    toastSuccess(`Applied ${currentTransitionObj.name} to all clips!`, 'Applied to All');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[8px] shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col select-none overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="h-12 px-4 border-b border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center justify-between shrink-0 bg-[#FAFAFA] dark:bg-[#151515]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-[6px] bg-[#3B82F6]/10 text-[#3B82F6] flex items-center justify-center shrink-0">
              <Shuffle className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-semibold text-[#171717] dark:text-[#EDEDED] truncate">
                Transition Settings
              </h2>
              <p className="text-[10px] text-[#737373] dark:text-[#A1A1A1] truncate">
                {clipName ? `Cut at "${clipName}"` : 'Cut between adjacent clips'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[4px] text-[#737373] hover:text-[#171717] dark:hover:text-[#EDEDED] cursor-pointer"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Modal Controls Bar: Duration, Direction, Easing */}
        <div className="p-3.5 border-b border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0 text-xs">
          {/* Duration */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-normal text-[#171717] dark:text-[#EDEDED]">Duration</span>
              <span className="font-mono text-[#737373] dark:text-[#A1A1A1] tabular-nums text-[11px]">
                {Number(duration).toFixed(1)}s
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="3.0"
              step="0.1"
              value={duration}
              onChange={(e) => setDuration(parseFloat(e.target.value))}
              className="w-full cursor-pointer accent-[#171717] dark:accent-[#EDEDED]"
            />
            <div className="flex items-center gap-1">
              {[0.3, 0.5, 0.8, 1.0, 1.5].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`flex-1 py-0.5 rounded-[4px] text-[10px] font-normal border transition-colors cursor-pointer tabular-nums ${
                    Math.abs(duration - d) < 0.05
                      ? 'bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#171717] border-[#171717] dark:border-[#EDEDED]'
                      : 'bg-white dark:bg-[#1A1A1A] text-[#737373] dark:text-[#A1A1A1] border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626]'
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>

          {/* Direction */}
          <div className="space-y-1">
            <span className="font-normal text-[#171717] dark:text-[#EDEDED] block">Direction</span>
            <div className="grid grid-cols-4 gap-1">
              {[
                { id: 'left', icon: ArrowLeft, title: 'Left' },
                { id: 'right', icon: ArrowRight, title: 'Right' },
                { id: 'up', icon: ArrowUp, title: 'Up' },
                { id: 'down', icon: ArrowDown, title: 'Down' },
              ].map((dir) => {
                const IconComponent = dir.icon;
                const isSelected = direction === dir.id;
                return (
                  <button
                    key={dir.id}
                    type="button"
                    onClick={() => setDirection(dir.id)}
                    className={`h-7 rounded-[4px] border flex items-center justify-center transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#171717] border-[#171717] dark:border-[#EDEDED]'
                        : 'bg-white dark:bg-[#1A1A1A] text-[#737373] dark:text-[#A1A1A1] border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626]'
                    }`}
                    title={dir.title}
                  >
                    <IconComponent className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                );
              })}
            </div>
            <div className="flex gap-1 pt-0.5">
              {[
                { id: 'in', label: 'In' },
                { id: 'out', label: 'Out' },
              ].map((subDir) => (
                <button
                  key={subDir.id}
                  type="button"
                  onClick={() => setDirection(subDir.id)}
                  className={`flex-1 py-0.5 rounded-[4px] text-[10px] border transition-colors cursor-pointer ${
                    direction === subDir.id
                      ? 'bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#171717] border-[#171717] dark:border-[#EDEDED]'
                      : 'bg-white dark:bg-[#1A1A1A] text-[#737373] dark:text-[#A1A1A1] border-[#E5E5E5] dark:border-[#2A2A2A]'
                  }`}
                >
                  {subDir.label}
                </button>
              ))}
            </div>
          </div>

          {/* Easing */}
          <div className="space-y-1">
            <span className="font-normal text-[#171717] dark:text-[#EDEDED] block">Easing Curve</span>
            <select
              value={easing}
              onChange={(e) => setEasing(e.target.value)}
              className="w-full h-8 bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] px-2 text-xs text-[#171717] dark:text-[#EDEDED] outline-none cursor-pointer"
            >
              <option value="easeInOut">Ease In-Out (Natural)</option>
              <option value="linear">Linear (Constant)</option>
              <option value="easeIn">Ease In (Accelerating)</option>
              <option value="easeOut">Ease Out (Decelerating)</option>
              <option value="bounce">Bounce (Dynamic)</option>
              <option value="elastic">Elastic (Spring)</option>
            </select>
            <p className="text-[10px] text-[#737373] dark:text-[#A1A1A1] leading-tight pt-0.5">
              Equal overlap duration & audio crossfading.
            </p>
          </div>
        </div>

        {/* Search & Categories Bar */}
        <div className="p-3 border-b border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#FAFAFA] dark:bg-[#151515] space-y-2 shrink-0">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#737373] dark:text-[#A1A1A1]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 80+ transitions (e.g. wipe, cube, zoom, blur, glitch)..."
              className="w-full bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] pl-8 pr-3 py-1.5 text-xs text-[#171717] dark:text-[#EDEDED] outline-none focus:border-[#3B82F6]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#171717] dark:hover:text-[#EDEDED]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 text-xs">
            {TRANSITION_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-2.5 py-1 rounded-[6px] text-[11px] font-normal border transition-colors cursor-pointer shrink-0 ${
                  category === cat
                    ? 'bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#171717] border-[#171717] dark:border-[#EDEDED]'
                    : 'bg-white dark:bg-[#1A1A1A] text-[#737373] dark:text-[#A1A1A1] border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626]'
                }`}
              >
                {cat === 'Favorites' ? `★ Favorites (${favorites.length})` : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Transition Grid with Animated Hover Thumbnails */}
        <div className="flex-1 overflow-y-auto p-3.5 min-h-0 bg-[#FAFAFA]/50 dark:bg-[#111111]/50">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {filteredTransitions.map((t) => {
              const isSelected = selectedType === t.id;
              const isFav = favorites.includes(t.id);
              return (
                <TransitionThumbnail
                  key={t.id}
                  transition={t}
                  isSelected={isSelected}
                  isFavorite={isFav}
                  onToggleFavorite={toggleFavorite}
                  onSelect={(sel) => setSelectedType(sel.id)}
                  duration={duration}
                />
              );
            })}
          </div>

          {filteredTransitions.length === 0 && (
            <div className="py-12 text-center text-[#737373] dark:text-[#A1A1A1] text-xs">
              No transitions found matching "{searchQuery}".
            </div>
          )}
        </div>

        {/* Bottom Actions Bar */}
        <div className="p-3 border-t border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={handleRemove}
            className="min-h-[40px] px-3 py-1.5 rounded-[6px] border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-normal flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Remove transition from this cut"
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Remove</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleApplyToAll}
              className="min-h-[40px] px-3 py-1.5 rounded-[6px] border border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-xs font-medium text-[#171717] dark:text-[#EDEDED] flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Apply this transition to all cuts on the timeline"
            >
              <Layers className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Apply to All Clips</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="min-h-[40px] px-4 py-1.5 rounded-[6px] bg-[#171717] hover:bg-[#262626] text-white dark:bg-[#EDEDED] dark:hover:bg-white dark:text-[#171717] text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
            >
              <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Apply Transition</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
