import React, { useState, useEffect } from 'react';
import {
  Upload,
  Film,
  Music,
  Image as ImageIcon,
  Trash2,
  CheckSquare,
  Check,
  X,
  Search,
  AlertTriangle,
} from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { storeMediaBlob } from '../utils/storage';
import { toastSuccess, toastError } from '../store/toastStore';

export const AssetsPage = () => {
  const {
    project,
    selectedAssetIds,
    selectAsset,
    deselectAsset,
    clearAssetSelection,
    addMediaAsset,
    deleteAssets,
    clearUnusedMedia,
  } = useEditorStore();

  const [activeTab, setActiveTab] = useState('uploads'); // 'uploads' | 'luts' | 'fonts' | 'stickers'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [assetsToDelete, setAssetsToDelete] = useState([]);
  const [removeClips, setRemoveClips] = useState(true);

  const library = project.mediaLibrary || [];

  // Counts per tab
  const tabCounts = {
    uploads: library.filter((a) => !a.category || a.category === 'uploads').length,
    luts: library.filter((a) => a.category === 'luts').length,
    fonts: library.filter((a) => a.category === 'fonts').length,
    stickers: library.filter((a) => a.category === 'stickers').length,
  };

  // Filtered assets for current tab and search query
  const filteredAssets = library.filter((asset) => {
    const matchesTab =
      activeTab === 'uploads'
        ? !asset.category || asset.category === 'uploads'
        : asset.category === activeTab;
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  // Calculate affected timeline clips count
  const getAffectedClipsCount = (assetIds) => {
    const assets = library.filter((a) => assetIds.includes(a.id));
    const mediaKeys = new Set();
    assets.forEach((a) => {
      if (a.mediaId) mediaKeys.add(a.mediaId);
      if (a.id) mediaKeys.add(a.id);
      if (a.url) mediaKeys.add(a.url);
    });
    let count = 0;
    (project.tracks || []).forEach((t) => {
      (t.clips || []).forEach((c) => {
        if (mediaKeys.has(c.mediaId) || mediaKeys.has(c.id) || mediaKeys.has(c.mediaUrl)) {
          count++;
        }
      });
    });
    return count;
  };

  const handleUploadAsset = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const mediaId = 'media_asset_' + Date.now() + '_' + i;
        const url = await storeMediaBlob(mediaId, file, file.name);

        const isVideo = file.type.startsWith('video');
        const isAudio = file.type.startsWith('audio');
        const isImage = file.type.startsWith('image');

        const newAsset = {
          id: 'asset_' + Date.now() + '_' + i,
          name: file.name,
          type: isVideo ? 'video' : isAudio ? 'audio' : isImage ? 'image' : 'asset',
          url: url,
          mediaId: mediaId,
          size: file.size,
          duration: 0,
          createdAt: Date.now(),
          category: activeTab,
        };

        addMediaAsset(newAsset);
        console.log('[ClipForge:Asset] Uploaded asset:', newAsset);
        toastSuccess(`Uploaded "${file.name}" to ${activeTab}`, 'Asset Added');
      } catch (err) {
        console.error('[ClipForge:Asset] Error uploading asset:', err);
        toastError(`Failed to upload "${file.name}"`);
      }
    }
  };

  const openDeleteModal = (assetIds) => {
    console.log('[ClipForge:Asset] openDeleteModal:', assetIds);
    setAssetsToDelete(assetIds);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    console.log('[ClipForge:Asset] confirmDelete:', assetsToDelete, { removeClips });
    if (assetsToDelete.length === 0) return;
    await deleteAssets(assetsToDelete, removeClips);
    setDeleteModalOpen(false);
    setAssetsToDelete([]);
  };

  // Keyboard Delete / Ctrl+A handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable;
      if (isInput) return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedAssetIds.length > 0) {
        e.preventDefault();
        console.log('[ClipForge:Asset] Delete hotkey on AssetsPage with selected:', selectedAssetIds);
        openDeleteModal(selectedAssetIds);
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        console.log('[ClipForge:Asset] Select All hotkey on AssetsPage');
        filteredAssets.forEach((a) => selectAsset(a.id, true, false));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAssetIds, filteredAssets, selectAsset]);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#FAFAFA] dark:bg-[#111111] text-[#171717] dark:text-[#EDEDED] select-none p-4 sm:p-6 lg:p-8 space-y-6 pb-24 sm:pb-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#171717] dark:text-[#EDEDED]">
            Assets Manager
          </h1>
          <p className="text-xs text-[#737373] dark:text-[#A1A1A1] mt-0.5">
            Manage your custom media uploads, color LUTs, fonts, and saved stickers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={clearUnusedMedia}
            className="px-3 py-2 rounded-[8px] border border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-medium text-[#737373] hover:text-rose-600 dark:text-[#A1A1A1] dark:hover:text-rose-400 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Clear media files not currently used on the timeline"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear Unused Media</span>
          </button>

          <button
            onClick={() => setSelectMode(!selectMode)}
            className={`px-3 py-2 rounded-[8px] border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              selectMode
                ? 'bg-[#171717] text-white border-transparent dark:bg-[#EDEDED] dark:text-[#171717]'
                : 'bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] text-[#171717] dark:text-[#EDEDED] hover:bg-[#F5F5F5] dark:hover:bg-[#262626]'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>{selectMode ? 'Select Mode On' : 'Select Mode'}</span>
          </button>

          <label className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer">
            <Upload className="w-4 h-4" strokeWidth={1.5} />
            <span>Upload Asset</span>
            <input
              type="file"
              multiple
              onChange={handleUploadAsset}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Tabs & Search Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5E5] dark:border-[#2A2A2A] pb-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'uploads', label: 'My Uploads' },
            { id: 'luts', label: 'Color LUTs' },
            { id: 'fonts', label: 'Custom Fonts' },
            { id: 'stickers', label: 'Saved Stickers' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-[6px] text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === tab.id
                  ? 'bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#171717]'
                  : 'text-[#737373] dark:text-[#A1A1A1] hover:bg-[#F5F5F5] dark:hover:bg-[#262626]'
              }`}
            >
              <span>{tab.label}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10">
                {tabCounts[tab.id]}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#737373]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assets..."
            className="w-full text-xs pl-8 pr-7 py-1.5 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#171717] dark:text-[#EDEDED] focus:outline-none focus:border-[#3B82F6]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#171717]"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Bulk Selection Toolbar */}
      {selectedAssetIds.length > 0 && (
        <div className="p-3 rounded-[8px] bg-[#EFF6FF] dark:bg-[#1E293B] border border-[#BFDBFE] dark:border-[#334155] flex items-center justify-between text-xs gap-3">
          <span className="font-semibold text-[#1E40AF] dark:text-[#93C5FD]">
            {selectedAssetIds.length} asset(s) selected
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openDeleteModal(selectedAssetIds)}
              className="px-3 py-1.5 rounded-[6px] bg-red-600 hover:bg-red-700 text-white font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Selected
            </button>

            <button
              onClick={clearAssetSelection}
              className="p-1.5 rounded-[6px] text-[#64748B] hover:bg-blue-100 dark:hover:bg-slate-700 cursor-pointer"
              title="Clear Selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Assets Grid */}
      {filteredAssets.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#1A1A1A] border border-dashed border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[12px] space-y-2">
          <Film className="w-10 h-10 mx-auto text-[#A3A3A3] stroke-1" />
          <h3 className="text-sm font-semibold text-[#171717] dark:text-[#EDEDED]">
            No assets found in "{activeTab}"
          </h3>
          <p className="text-xs text-[#737373] dark:text-[#A1A1A1]">
            Upload files or create media inside the editor to populate your library.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredAssets.map((asset) => {
            const isSelected = selectedAssetIds.includes(asset.id);
            return (
              <div
                key={asset.id}
                onClick={(e) => {
                  const multi = e.ctrlKey || e.metaKey || selectMode;
                  const shift = e.shiftKey;
                  selectAsset(asset.id, multi, shift);
                }}
                className={`group relative bg-white dark:bg-[#1A1A1A] border rounded-[10px] overflow-hidden p-3 flex flex-col justify-between transition-all cursor-pointer select-none shadow-2xs ${
                  isSelected
                    ? 'border-[#3B82F6] ring-2 ring-[#3B82F6]/40 bg-blue-50/20 dark:bg-blue-950/20'
                    : 'border-[#E5E5E5] dark:border-[#2A2A2A] hover:border-[#A3A3A3]'
                }`}
              >
                {/* Thumbnail Preview Box */}
                <div className="h-28 bg-[#F5F5F5] dark:bg-[#0D0D0D] rounded-[6px] flex items-center justify-center relative overflow-hidden mb-3">
                  {asset.type === 'video' ? (
                    <video
                      src={asset.url}
                      className="w-full h-full object-cover pointer-events-none"
                      muted
                      preload="metadata"
                    />
                  ) : asset.type === 'image' || asset.type === 'sticker' ? (
                    <img
                      src={asset.url}
                      alt={asset.name}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  ) : (
                    <Music className="w-8 h-8 text-[#3B82F6]" strokeWidth={1.5} />
                  )}

                  {/* Selection Checkbox */}
                  {(selectMode || isSelected) && (
                    <div className="absolute top-2 left-2 z-10">
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center text-white transition-colors ${
                          isSelected ? 'bg-[#3B82F6]' : 'bg-black/40 border border-white/60'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  )}

                  {/* Trash Hover Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openDeleteModal([asset.id]);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-rose-600"
                    title="Delete Asset"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Name & Details */}
                <div>
                  <p className="text-xs font-semibold text-[#171717] dark:text-[#EDEDED] truncate" title={asset.name}>
                    {asset.name}
                  </p>
                  <p className="text-[10px] text-[#737373] mt-0.5 uppercase tracking-wide">
                    {asset.type} • {asset.size ? `${(asset.size / (1024 * 1024)).toFixed(1)} MB` : 'Local Asset'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E1E1E] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-sm font-semibold text-[#171717] dark:text-[#EDEDED]">
                  Delete {assetsToDelete.length} Asset(s)?
                </h3>
              </div>
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="text-[#737373] hover:text-[#171717] dark:hover:text-[#EDEDED] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#737373] dark:text-[#A1A1A1] leading-relaxed">
              Deleting asset(s) will purge their blobs permanently from IndexedDB storage.
            </p>

            {/* Affected Clips Warning */}
            {(() => {
              const count = getAffectedClipsCount(assetsToDelete);
              if (count === 0) return null;
              return (
                <div className="p-2.5 rounded-[6px] bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-200 text-xs space-y-2">
                  <p className="font-medium flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {count} clip(s) on your active timeline rely on these assets.
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                    <input
                      type="checkbox"
                      checked={removeClips}
                      onChange={(e) => setRemoveClips(e.target.checked)}
                      className="rounded border-amber-300 dark:border-amber-700 text-rose-600 focus:ring-rose-500"
                    />
                    <span>Also remove associated clips from timeline tracks</span>
                  </label>
                </div>
              );
            })()}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A]">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="px-3 py-1.5 rounded-[6px] text-xs font-medium border border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-[#171717] dark:text-[#EDEDED] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-3 py-1.5 rounded-[6px] text-xs font-medium bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
