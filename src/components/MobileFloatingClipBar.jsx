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
      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-40 flex items-center gap-1 p-1 bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] shadow-md text-[#171717] dark:text-[#EDEDED] select-none pointer-events-auto max-w-[95vw] overflow-x-auto transition-colors"
    >
      {/* Selected clip type badge */}
      <div className="flex items-center gap-1 pl-2 pr-1.5 border-r border-[#E5E5E5] dark:border-[#2A2A2A] shrink-0">
        <span className="text-[10px] font-normal uppercase px-1.5 py-0.5 rounded-[4px] bg-[#F5F5F5] dark:bg-[#222222] text-[#737373] dark:text-[#A1A1A1] border border-[#E5E5E5] dark:border-[#2A2A2A]">
          {selectedClip.type}
        </span>
      </div>

      {/* Split at playhead */}
      <button
        onClick={() => splitClipAtPlayhead(selectedClip.id)}
        className="flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-2 rounded-[6px] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] transition-colors cursor-pointer"
        title="Split Clip at Playhead"
      >
        <Scissors className="w-4 h-4" strokeWidth={1.5} />
        <span className="text-[9px] font-normal mt-0.5">Split</span>
      </button>

      {/* Delete Clip */}
      <button
        onClick={() => deleteClip(selectedClip.id, false)}
        className="flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-2 rounded-[6px] hover:bg-red-50 dark:hover:bg-red-950/30 text-[#737373] dark:text-[#A1A1A1] hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
        title="Delete Clip"
      >
        <Trash2 className="w-4 h-4" strokeWidth={1.5} />
        <span className="text-[9px] font-normal mt-0.5">Delete</span>
      </button>

      {/* Duplicate Clip */}
      <button
        onClick={() => duplicateClip(selectedClip.id)}
        className="flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-2 rounded-[6px] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] transition-colors cursor-pointer"
        title="Duplicate Clip"
      >
        <Copy className="w-4 h-4" strokeWidth={1.5} />
        <span className="text-[9px] font-normal mt-0.5">Copy</span>
      </button>

      {/* Freeze Frame (for video) */}
      {selectedClip.type === 'video' && (
        <button
          onClick={() => freezeFrame(selectedClip.id)}
          className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-2 rounded-[6px] transition-colors cursor-pointer ${
            selectedClip.freezeFrame
              ? 'bg-blue-50 dark:bg-blue-950/40 text-[#3B82F6]'
              : 'hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED]'
          }`}
          title="Freeze Frame"
        >
          <Snowflake className="w-4 h-4" strokeWidth={1.5} />
          <span className="text-[9px] font-normal mt-0.5">Freeze</span>
        </button>
      )}

      {/* Inspector / Edit Bottom Sheet Trigger */}
      <button
        onClick={() => setMobileInspectorOpen(!isMobileInspectorOpen)}
        className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-2 rounded-[6px] transition-colors cursor-pointer ${
          isMobileInspectorOpen
            ? 'bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#171717]'
            : 'hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED]'
        }`}
        title="Open Clip Inspector"
      >
        <Sliders className="w-4 h-4" strokeWidth={1.5} />
        <span className="text-[9px] font-normal mt-0.5">Edit</span>
      </button>

      {/* Deselect / Close */}
      <button
        onClick={deselectAll}
        className="flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-2 rounded-[6px] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] transition-colors cursor-pointer ml-0.5"
        title="Deselect Clip"
      >
        <X className="w-4 h-4" strokeWidth={1.5} />
        <span className="text-[9px] font-normal mt-0.5">Done</span>
      </button>
    </div>
  );
};
