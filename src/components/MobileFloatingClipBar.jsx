import React from 'react';
import {
  Scissors,
  Trash2,
  Copy,
  Snowflake,
  Sliders,
  X,

} from 'lucide-react';
import { useEditorStore } from '../store/editorStore';

export const MobileFloatingClipBar = () => {
  const {
    selectedClipIds,
    getSelectedClip,
    splitClipAtPlayhead,
    deleteClip,
    duplicateClip,
    freezeFrame,
    deselectAll,
    setMobileInspectorOpen,
    isMobileInspectorOpen,
  } = useEditorStore();

  const selectedClip = getSelectedClip();

  if (!selectedClip || selectedClipIds.length === 0) {
    return null;
  }

  return (
    <div
      role="toolbar"
      aria-label="Selected Clip Quick Actions"
      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-40 flex items-center gap-1.5 p-1.5 bg-[#141622]/95 border border-violet-500/40 rounded-2xl shadow-2xl backdrop-blur-md text-white select-none pointer-events-auto max-w-[95vw] overflow-x-auto"
    >
      {/* Selected clip type badge */}
      <div className="flex items-center gap-1 pl-2 pr-1.5 border-r border-white/10 shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-violet-600/30 text-violet-300 border border-violet-500/30">
          {selectedClip.type}
        </span>
      </div>

      {/* Split at playhead */}
      <button
        onClick={() => splitClipAtPlayhead(selectedClip.id)}
        className="flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-2 rounded-xl hover:bg-white/10 active:bg-violet-600/30 text-slate-200 transition-colors cursor-pointer"
        title="Split Clip at Playhead"
      >
        <Scissors className="w-4 h-4 text-violet-400" />
        <span className="text-[9px] font-semibold mt-0.5">Split</span>
      </button>

      {/* Delete Clip */}
      <button
        onClick={() => deleteClip(selectedClip.id, false)}
        className="flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-2 rounded-xl hover:bg-rose-500/20 active:bg-rose-500/30 text-rose-300 transition-colors cursor-pointer"
        title="Delete Clip"
      >
        <Trash2 className="w-4 h-4 text-rose-400" />
        <span className="text-[9px] font-semibold mt-0.5">Delete</span>
      </button>

      {/* Duplicate Clip */}
      <button
        onClick={() => duplicateClip(selectedClip.id)}
        className="flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-2 rounded-xl hover:bg-white/10 active:bg-cyan-500/20 text-slate-200 transition-colors cursor-pointer"
        title="Duplicate Clip"
      >
        <Copy className="w-4 h-4 text-cyan-400" />
        <span className="text-[9px] font-semibold mt-0.5">Copy</span>
      </button>

      {/* Freeze Frame (for video) */}
      {selectedClip.type === 'video' && (
        <button
          onClick={() => freezeFrame(selectedClip.id)}
          className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer ${
            selectedClip.freezeFrame ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-200'
          }`}
          title="Freeze Frame"
        >
          <Snowflake className="w-4 h-4 text-cyan-300" />
          <span className="text-[9px] font-semibold mt-0.5">Freeze</span>
        </button>
      )}

      {/* Inspector / Edit Bottom Sheet Trigger */}
      <button
        onClick={() => setMobileInspectorOpen(!isMobileInspectorOpen)}
        className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-2 rounded-xl transition-colors cursor-pointer ${
          isMobileInspectorOpen ? 'bg-violet-600 text-white' : 'hover:bg-white/10 text-slate-200'
        }`}
        title="Open Clip Inspector"
      >
        <Sliders className="w-4 h-4 text-amber-400" />
        <span className="text-[9px] font-semibold mt-0.5">Edit</span>
      </button>

      {/* Deselect / Close */}
      <button
        onClick={deselectAll}
        className="flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer ml-0.5"
        title="Deselect Clip"
      >
        <X className="w-4 h-4" />
        <span className="text-[9px] font-semibold mt-0.5">Done</span>
      </button>
    </div>
  );
};
