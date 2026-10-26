import React, { useState, useEffect } from 'react';
import { X, Trash2, HardDrive, CheckSquare, Square, Film, Music, Image as ImageIcon, Loader2, AlertCircle, Check } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { scanAllUnusedMedia, purgeUnusedMediaItems, calculateTotalStorageUsage } from '../utils/storage';
import { toastSuccess, toastError, toastWarning } from '../store/toastStore';

export const ClearUnusedMediaModal = () => {
  const {
    isClearMediaModalOpen,
    setClearMediaModalOpen,
    project,
    setProject,
    isExporting,
    setStorageStats,
  } = useEditorStore();

  const [loading, setLoading] = useState(true);
  const [purging, setPurging] = useState(false);
  const [unusedItems, setUnusedItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [totalUnusedBytes, setTotalUnusedBytes] = useState(0);

  const loadUnusedMedia = async () => {
    setLoading(true);
    console.log('[ClipForge:ClearMedia] ClearUnusedMediaModal opened, scanning...');
    try {
      const { unusedItems: items, totalUnusedBytes: bytes } = await scanAllUnusedMedia(project);
      setUnusedItems(items);
      setSelectedIds(items.map((i) => i.id));
      setTotalUnusedBytes(bytes);
    } catch (err) {
      console.error('[ClipForge:ClearMedia] Failed to scan unused media:', err);
      toastError('Failed to scan storage for unused media', 'Scan Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isClearMediaModalOpen) {
      loadUnusedMedia();
    }
  }, [isClearMediaModalOpen]);

  if (!isClearMediaModalOpen) return null;

  const handleToggleSelectAll = () => {
    if (selectedIds.length === unusedItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(unusedItems.map((i) => i.id));
    }
  };

  const handleToggleItem = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleConfirmClear = async () => {
    if (isExporting) {
      toastWarning('Cannot clear media while video export is in progress.', 'Export In Progress');
      return;
    }

    const itemsToPurge = unusedItems.filter((i) => selectedIds.includes(i.id));
    if (itemsToPurge.length === 0) return;

    setPurging(true);
    console.log('[ClipForge:ClearMedia] Starting purge of selected items:', itemsToPurge.length);

    try {
      const { successCount, totalFreedBytes, updatedProject } = await purgeUnusedMediaItems(
        itemsToPurge,
        project
      );

      if (updatedProject && setProject) {
        setProject(updatedProject);
      }

      // Recalculate storage stats
      const stats = await calculateTotalStorageUsage();
      setStorageStats(stats);

      const freedMB = (totalFreedBytes / (1024 * 1024)).toFixed(1);
      toastSuccess(`Cleared ${successCount} file(s), freed ${freedMB} MB`, 'Storage Cleaned');

      setClearMediaModalOpen(false);
    } catch (err) {
      console.error('[ClipForge:ClearMedia] Error during purge:', err);
      toastError(`Failed to clear unused media: ${err.message || 'Unknown error'}`, 'Cleanup Failed');
    } finally {
      setPurging(false);
    }
  };

  const selectedBytes = unusedItems
    .filter((i) => selectedIds.includes(i.id))
    .reduce((sum, i) => sum + (i.size || 0), 0);

  const selectedMB = (selectedBytes / (1024 * 1024)).toFixed(1);
  const totalMB = (totalUnusedBytes / (1024 * 1024)).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white dark:bg-[#1E1E1E] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-[#171717] dark:text-[#EDEDED] transition-colors">
        {/* Header */}
        <div className="h-12 px-5 border-b border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center justify-between bg-[#FAFAFA] dark:bg-[#151515] shrink-0">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-rose-500" strokeWidth={1.5} />
            <h2 className="text-sm font-semibold text-[#171717] dark:text-[#EDEDED]">
              Clear Unused Media
            </h2>
          </div>
          <button
            onClick={() => setClearMediaModalOpen(false)}
            className="p-1.5 text-[#737373] hover:text-[#171717] dark:hover:text-[#EDEDED] rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 min-h-0">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#3B82F6]" />
              <p className="text-xs text-[#737373] dark:text-[#A1A1A1]">
                Scanning saved projects and local cache for unused media...
              </p>
            </div>
          ) : unusedItems.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center">
                <Check className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h3 className="text-sm font-semibold text-[#171717] dark:text-[#EDEDED]">
                No Unused Media Found
              </h3>
              <p className="text-xs text-[#737373] dark:text-[#A1A1A1] max-w-xs mx-auto leading-relaxed">
                All media files in storage are currently placed on timeline tracks across your projects.
              </p>
            </div>
          ) : (
            <>
              {/* Overview Summary */}
              <div className="p-3 rounded-[8px] bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-amber-900 dark:text-amber-200 block">
                    {unusedItems.length} unused file(s) found
                  </span>
                  <span className="text-[11px] text-amber-700 dark:text-amber-300">
                    Unreferenced by any timeline track across saved projects ({totalMB} MB total)
                  </span>
                </div>
                <button
                  onClick={handleToggleSelectAll}
                  className="px-2.5 py-1 rounded bg-white dark:bg-[#2A2A2A] border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100 text-[11px] font-medium cursor-pointer"
                >
                  {selectedIds.length === unusedItems.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {unusedItems.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  const isVideo = item.type?.startsWith('video');
                  const isImage = item.type?.startsWith('image') || item.type === 'sticker';
                  const sizeMB = ((item.size || 0) / (1024 * 1024)).toFixed(1);

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleToggleItem(item.id)}
                      className={`p-2.5 rounded-[8px] border flex items-center justify-between gap-3 transition-colors cursor-pointer select-none ${
                        isSelected
                          ? 'bg-blue-50/40 dark:bg-blue-950/30 border-[#3B82F6]'
                          : 'bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Checkbox */}
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center text-white shrink-0 transition-colors ${
                            isSelected ? 'bg-[#3B82F6]' : 'border border-[#A3A3A3] dark:border-[#525252]'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>

                        {/* Thumbnail */}
                        <div className="w-10 h-10 rounded bg-black/10 dark:bg-black/50 overflow-hidden shrink-0 flex items-center justify-center">
                          {isVideo ? (
                            item.url ? (
                              <video src={item.url} className="w-full h-full object-cover pointer-events-none" />
                            ) : (
                              <Film className="w-4 h-4 text-[#737373]" />
                            )
                          ) : isImage ? (
                            item.url ? (
                              <img src={item.url} alt="" className="w-full h-full object-cover pointer-events-none" />
                            ) : (
                              <ImageIcon className="w-4 h-4 text-[#737373]" />
                            )
                          ) : (
                            <Music className="w-4 h-4 text-[#3B82F6]" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[#171717] dark:text-[#EDEDED] truncate" title={item.name}>
                            {item.name}
                          </p>
                          <p className="text-[10px] text-[#737373] mt-0.5">
                            {item.type || 'Media File'}
                          </p>
                        </div>
                      </div>

                      {/* Size */}
                      <span className="font-mono text-xs font-medium text-[#171717] dark:text-[#EDEDED] shrink-0">
                        {sizeMB} MB
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#FAFAFA] dark:bg-[#151515] flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={() => setClearMediaModalOpen(false)}
            className="px-4 py-2 rounded-[6px] text-xs font-medium border border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-[#171717] dark:text-[#EDEDED] transition-colors cursor-pointer"
          >
            {unusedItems.length === 0 ? 'Close' : 'Cancel'}
          </button>

          {unusedItems.length > 0 && (
            <button
              onClick={handleConfirmClear}
              disabled={purging || selectedIds.length === 0}
              className="px-4 py-2 rounded-[6px] text-xs font-medium bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              {purging && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>
                {purging
                  ? 'Clearing Files...'
                  : `Clear Selected (${selectedIds.length} files, ${selectedMB} MB)`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
