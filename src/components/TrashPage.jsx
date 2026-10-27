import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Trash2,
  Search,
  Grid,
  List,
  RefreshCw,
  FolderKanban,
  CheckSquare,
  Square,
  HardDrive,
  MoreVertical,
  X,
  AlertTriangle,
  Film,
} from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import {
  getAllProjectsFromDB,
  saveProjectToDB,
  calculateTotalStorageUsage,
  calculateProjectMediaSize,
  purgeTrashedProjects,
  autoPurgeExpiredTrashProjects,
} from '../utils/storage';
import { toastSuccess, toastError, toastWarning } from '../store/toastStore';

/* PORTAL-RENDERED EMPTY TRASH CONFIRMATION MODAL */
const EmptyTrashConfirmationModal = ({ isOpen, onClose, onConfirm, count }) => {
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Focus cancel button by default for safety
    const timer = setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#1E1E1E] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-xl p-5 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 shrink-0">
              <Trash2 className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <h3 className="text-sm font-semibold text-[#171717] dark:text-[#EDEDED]">
              Empty Trash?
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#737373] hover:text-[#171717] dark:hover:text-[#EDEDED] p-1 rounded cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#737373] dark:text-[#A1A1A1] leading-relaxed">
          Permanently delete {count} project{count === 1 ? '' : 's'}? This cannot be undone.
        </p>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            ref={cancelButtonRef}
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium rounded-[6px] border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#171717] dark:text-[#EDEDED] hover:bg-[#F5F5F5] dark:hover:bg-[#2A2A2A] transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-[#3B82F6]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3.5 py-1.5 text-xs font-medium rounded-[6px] text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer shadow-xs"
          >
            Delete forever
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* PORTAL-RENDERED 3-DOT MENU FOR TRASH ITEMS */
const TrashItemPortalMenu = ({
  isOpen,
  onClose,
  anchorRect,
  project,
  onRestore,
  onDeleteForever,
}) => {
  const menuRef = useRef(null);
  const [style, setStyle] = useState({});

  useEffect(() => {
    if (!isOpen || !anchorRect) return;

    const menuWidth = 160;
    const menuHeight = 90;
    const padding = 12;

    let top = anchorRect.bottom + 4;
    let left = anchorRect.right - menuWidth;

    if (top + menuHeight > window.innerHeight - padding) {
      top = anchorRect.top - menuHeight - 4;
    }

    if (left < padding) {
      left = Math.max(padding, anchorRect.left);
    }

    setStyle({
      position: 'fixed',
      top: `${Math.max(padding, top)}px`,
      left: `${Math.max(padding, left)}px`,
      width: `${menuWidth}px`,
      zIndex: 9999,
    });

    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleScroll = () => onClose();
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('touchstart', handleOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('touchstart', handleOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, anchorRect, project]);

  if (!isOpen || !anchorRect) return null;

  return createPortal(
    <div
      ref={menuRef}
      style={style}
      onClick={(e) => e.stopPropagation()}
      className="bg-white dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#333333] rounded-[10px] shadow-2xl py-1 text-xs select-none transition-opacity duration-100 ring-1 ring-black/5"
    >
      <button
        onClick={() => {
          onClose();
          onRestore(project.id);
        }}
        className="w-full text-left px-3.5 py-2 text-[#3B82F6] hover:bg-blue-50 dark:hover:bg-blue-950/30 flex items-center gap-2 cursor-pointer font-medium transition-colors"
      >
        <RefreshCw className="w-4 h-4 text-[#3B82F6]" strokeWidth={1.5} />
        <span>Restore</span>
      </button>

      <button
        onClick={() => {
          onClose();
          onDeleteForever([project.id]);
        }}
        className="w-full text-left px-3.5 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 cursor-pointer font-medium transition-colors"
      >
        <Trash2 className="w-4 h-4 text-rose-500" strokeWidth={1.5} />
        <span>Delete forever</span>
      </button>
    </div>,
    document.body
  );
};

/* PREVIEW DIALOG FOR TRASHED PROJECT */
const TrashedPreviewModal = ({ project, isOpen, onClose, onRestore, onDeleteForever }) => {
  if (!isOpen || !project) return null;

  const daysPassed = Math.floor((Date.now() - (project.deletedAt || Date.now())) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, 30 - daysPassed);

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#1E1E1E] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 shrink-0">
              <AlertTriangle className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#171717] dark:text-[#EDEDED]">
                Trashed Project Preview
              </h3>
              <p className="text-[11px] text-[#737373]">Opening trashed projects is disabled.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#737373] hover:text-[#171717] dark:hover:text-[#EDEDED] p-1 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Thumbnail Frame */}
        <div className="h-40 bg-[#F0F0F0] dark:bg-[#0D0D0D] rounded-[10px] relative flex items-center justify-center overflow-hidden border border-[#E5E5E5] dark:border-[#2A2A2A]">
          <Film className="w-12 h-12 text-[#A3A3A3]" strokeWidth={1.5} />
          <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-mono">
            {project.aspectRatio || '16:9'}
          </span>
        </div>

        {/* Details Grid */}
        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-[#E5E5E5] dark:border-[#2A2A2A]">
            <span className="text-[#737373]">Project Name</span>
            <span className="font-semibold text-[#171717] dark:text-[#EDEDED]">{project.name}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#E5E5E5] dark:border-[#2A2A2A]">
            <span className="text-[#737373]">Deleted On</span>
            <span className="text-[#171717] dark:text-[#EDEDED]">
              {new Date(project.deletedAt || Date.now()).toLocaleDateString()}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#E5E5E5] dark:border-[#2A2A2A]">
            <span className="text-[#737373]">Auto-Purge In</span>
            <span
              className={`font-semibold ${
                daysRemaining <= 3 ? 'text-rose-600 dark:text-rose-400' : 'text-[#171717] dark:text-[#EDEDED]'
              }`}
            >
              {daysRemaining} day{daysRemaining === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        <p className="text-xs text-[#737373] leading-relaxed">
          To edit or view timeline tracks, restore this project back to your library.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A]">
          <button
            onClick={() => {
              onClose();
              onDeleteForever([project.id]);
            }}
            className="px-3.5 py-2 text-xs font-medium rounded-[6px] border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
          >
            Delete forever
          </button>
          <button
            onClick={() => {
              onClose();
              onRestore(project.id);
            }}
            className="px-4 py-2 text-xs font-medium rounded-[6px] bg-[#3B82F6] hover:bg-blue-600 text-white transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Restore Project</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export const TrashPage = () => {
  const { setRoute } = useEditorStore();
  const [trashedProjects, setTrashedProjects] = useState([]);
  const [activeProjects, setActiveProjects] = useState([]);
  const [projectSizes, setProjectSizes] = useState({}); // { id: bytes }
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [sortBy, setSortBy] = useState('deletedAt'); // 'deletedAt' | 'name' | 'size'
  const [selectedIds, setSelectedIds] = useState([]);

  // Portal Menu State
  const [activeMenuState, setActiveMenuState] = useState(null);

  // Preview Dialog State
  const [previewProject, setPreviewProject] = useState(null);

  // Delete Progress Modal State
  const [deleteProgress, setDeleteProgress] = useState(null); // { isDeleting, current, total }

  // Empty Trash Confirmation Modal State
  const [emptyTrashConfirmModalOpen, setEmptyTrashConfirmModalOpen] = useState(false);

  // Storage Stats State
  const [storageStats, setStorageStats] = useState({
    activeFormattedMB: '0.0',
    trashFormattedMB: '0.0',
    formattedMB: '0.0',
  });

  const loadData = async () => {
    console.log('[ClipForge:EmptyTrash] Loading trashed projects and storage stats...');
    await autoPurgeExpiredTrashProjects();
    const all = await getAllProjectsFromDB();

    const trashed = all.filter((p) => p.deletedAt);
    const active = all.filter((p) => !p.deletedAt);

    setTrashedProjects(trashed);
    setActiveProjects(active);

    // Calculate individual media sizes for trashed projects
    const sizes = {};
    for (const p of trashed) {
      sizes[p.id] = await calculateProjectMediaSize(p);
    }
    setProjectSizes(sizes);

    const stats = await calculateTotalStorageUsage();
    setStorageStats(stats);
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('clipforge:projects_updated', handleUpdate);
    return () => window.removeEventListener('clipforge:projects_updated', handleUpdate);
  }, []);

  // Multi-select hotkeys (Ctrl+A)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && trashedProjects.length > 0) {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
        e.preventDefault();
        setSelectedIds(filteredProjects.map((p) => p.id));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [trashedProjects]);

  const handleToggleSelect = (id, multi = false, shift = false) => {
    setSelectedIds((prev) => {
      if (shift && prev.length > 0) {
        const lastId = prev[prev.length - 1];
        const lastIdx = filteredProjects.findIndex((p) => p.id === lastId);
        const currIdx = filteredProjects.findIndex((p) => p.id === id);
        if (lastIdx !== -1 && currIdx !== -1) {
          const start = Math.min(lastIdx, currIdx);
          const end = Math.max(lastIdx, currIdx);
          const rangeIds = filteredProjects.slice(start, end + 1).map((p) => p.id);
          return Array.from(new Set([...prev, ...rangeIds]));
        }
      }
      if (multi) {
        return prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      }
      return prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredProjects.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProjects.map((p) => p.id));
    }
  };

  // Restore Project (Single or Bulk)
  const handleRestore = async (idsToRestore) => {
    const ids = Array.isArray(idsToRestore) ? idsToRestore : [idsToRestore];
    if (ids.length === 0) return;

    try {
      console.log('[ClipForge:Trash] Restoring project(s):', ids);
      const activeNames = new Set(activeProjects.map((p) => p.name));

      let restoredCount = 0;
      let lastRestoredName = '';

      for (const id of ids) {
        const proj = trashedProjects.find((p) => p.id === id);
        if (proj) {
          let nameToUse = proj.name;
          if (activeNames.has(nameToUse)) {
            nameToUse = `${proj.name} (restored)`;
          }

          const restoredProj = {
            ...proj,
            name: nameToUse,
            deletedAt: null,
            updatedAt: Date.now(),
          };

          await saveProjectToDB(restoredProj);
          restoredCount++;
          lastRestoredName = nameToUse;
        }
      }

      setSelectedIds([]);
      await loadData();

      if (restoredCount === 1) {
        toastSuccess(`Restored "${lastRestoredName}"`, 'Project Restored');
      } else {
        toastSuccess(`Restored ${restoredCount} projects`, 'Projects Restored');
      }
    } catch (err) {
      console.error('[ClipForge:Trash] Error restoring project:', err);
      toastError(err.message || 'Failed to restore project', 'Restore Error');
    }
  };

  // Delete Forever (Single or Bulk)
  const handleDeleteForever = async (idsToDelete) => {
    const ids = Array.isArray(idsToDelete) ? idsToDelete : [idsToDelete];
    console.log('[ClipForge:EmptyTrash] Delete Forever requested for count:', ids.length);
    if (ids.length === 0) return;

    if (!confirm(`Permanently delete ${ids.length} project(s)? This cannot be undone.`)) return;

    console.log('[ClipForge:EmptyTrash] Delete Forever confirmed by user');
    setDeleteProgress({ isDeleting: true, current: 0, total: ids.length });

    try {
      const res = await purgeTrashedProjects(ids, (current, total) => {
        setDeleteProgress({ isDeleting: true, current, total });
      });

      setSelectedIds([]);
      await loadData();
      setDeleteProgress(null);

      if (res.failedProjectIds && res.failedProjectIds.length > 0) {
        toastError(`Deleted ${res.deletedProjectsCount} project(s), but ${res.failedProjectIds.length} failed.`, 'Partial Deletion');
      } else {
        toastSuccess(`Deleted ${res.deletedProjectsCount} project(s), freed ${res.freedMB} MB`, 'Projects Permanently Deleted');
      }
      console.log('[ClipForge:EmptyTrash] Delete Forever process finished');
    } catch (err) {
      setDeleteProgress(null);
      console.error('[ClipForge:EmptyTrash] Error deleting forever:', err);
      toastError(err.message || 'Failed to permanently delete projects', 'Delete Error');
    }
  };

  // Prompt Empty Trash
  const handlePromptEmptyTrash = () => {
    console.log('[ClipForge:EmptyTrash] Empty Trash button clicked');
    const count = trashedProjects.length;
    console.log('[ClipForge:EmptyTrash] Found trashed projects count:', count);
    if (count === 0) return;

    console.log('[ClipForge:EmptyTrash] Confirmation modal opened');
    setEmptyTrashConfirmModalOpen(true);
  };

  // Confirmed Empty Trash
  const handleConfirmEmptyTrash = async () => {
    console.log('[ClipForge:EmptyTrash] Confirmation confirmed by user');
    setEmptyTrashConfirmModalOpen(false);

    const idsToPurge = trashedProjects.map((p) => p.id);
    setDeleteProgress({ isDeleting: true, current: 0, total: idsToPurge.length });

    try {
      const res = await purgeTrashedProjects(idsToPurge, (current, total) => {
        setDeleteProgress({ isDeleting: true, current, total });
      });

      setSelectedIds([]);
      await loadData();
      setDeleteProgress(null);

      if (res.failedProjectIds && res.failedProjectIds.length > 0) {
        const failedNames = trashedProjects
          .filter((p) => res.failedProjectIds.includes(p.id))
          .map((p) => p.name)
          .join(', ');
        toastError(`Failed to delete: ${failedNames}. Deleted ${res.deletedProjectsCount} project(s).`, 'Partial Deletion');
      } else {
        toastSuccess(`Deleted ${res.deletedProjectsCount} project(s), freed ${res.freedMB} MB`, 'Trash Emptied');
      }
      console.log('[ClipForge:EmptyTrash] Empty Trash process finished. Freed bytes:', res.freedBytes);
    } catch (err) {
      setDeleteProgress(null);
      console.error('[ClipForge:EmptyTrash] Error during Empty Trash:', err);
      toastError(err.message || 'Failed to empty trash', 'Trash Error');
    }
  };

  // Format Helper for bytes
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0.0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb < 0.1) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${mb.toFixed(1)} MB`;
  };

  // Filter & Sort
  const filteredProjects = trashedProjects
    .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'size') return (projectSizes[b.id] || 0) - (projectSizes[a.id] || 0);
      return (b.deletedAt || 0) - (a.deletedAt || 0);
    });

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#FAFAFA] dark:bg-[#111111] text-[#171717] dark:text-[#EDEDED] select-none p-4 sm:p-6 lg:p-8 space-y-6 pb-24 sm:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Trash2 className="w-6 h-6 text-rose-500" strokeWidth={1.5} />
            <h1 className="text-2xl font-semibold tracking-tight text-[#171717] dark:text-[#EDEDED]">
              Trash
            </h1>
            {trashedProjects.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400">
                {trashedProjects.length}
              </span>
            )}
          </div>
          <p className="text-xs text-[#737373] dark:text-[#A1A1A1] mt-0.5">
            Projects are permanently deleted after 30 days.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Empty Trash Button */}
          <button
            disabled={trashedProjects.length === 0}
            onClick={handlePromptEmptyTrash}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-xs font-semibold shadow-xs transition-colors cursor-pointer ${
              trashedProjects.length > 0
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-[#E5E5E5] dark:bg-[#2A2A2A] text-[#A1A1A1] cursor-not-allowed opacity-60'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>
              {trashedProjects.length > 0
                ? `Empty Trash (${trashedProjects.length})`
                : 'Empty Trash'}
            </span>
          </button>
        </div>
      </div>

      {/* Toolbar / Filters / Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[10px] p-4 shadow-xs">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 md:pb-0">
          {[
            { id: 'projects', label: 'All Projects' },
            { id: 'reels', label: 'Reels 9:16' },
            { id: 'youtube', label: 'YouTube 16:9' },
            { id: 'square', label: 'Square 1:1' },
            { id: 'favorites', label: 'Favorites' },
            { id: 'trash', label: 'Trash' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'trash') setRoute('trash');
                else setRoute('projects');
              }}
              className={`px-3 py-1.5 rounded-[6px] text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                tab.id === 'trash'
                  ? 'bg-rose-600 text-white dark:bg-rose-500'
                  : 'text-[#737373] dark:text-[#A1A1A1] hover:bg-[#F5F5F5] dark:hover:bg-[#262626]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search, Sort & View Mode */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737373]" strokeWidth={1.5} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search trash..."
              className="w-full bg-[#FAFAFA] dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] pl-9 pr-3 py-1.5 text-xs text-[#171717] dark:text-[#EDEDED] outline-none focus:border-[#3B82F6]"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-[#FAFAFA] dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] px-3 py-1.5 text-xs text-[#171717] dark:text-[#EDEDED] outline-none cursor-pointer"
          >
            <option value="deletedAt">Date Deleted</option>
            <option value="name">Name</option>
            <option value="size">Size</option>
          </select>

          <div className="flex items-center border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] p-0.5 bg-[#FAFAFA] dark:bg-[#111111]">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-[4px] cursor-pointer ${viewMode === 'grid' ? 'bg-white dark:bg-[#262626] text-[#171717] dark:text-[#EDEDED] shadow-xs' : 'text-[#737373]'}`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-[4px] cursor-pointer ${viewMode === 'list' ? 'bg-white dark:bg-[#262626] text-[#171717] dark:text-[#EDEDED] shadow-xs' : 'text-[#737373]'}`}
              title="List View"
            >
              <List className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Multi-select Selection Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-[10px] p-3 flex items-center justify-between text-xs animate-in fade-in duration-150">
          <span className="font-semibold text-rose-700 dark:text-rose-300">
            {selectedIds.length} item(s) selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRestore(selectedIds)}
              className="px-3 py-1 bg-white dark:bg-[#1A1A1A] border border-[#3B82F6] text-[#3B82F6] text-xs font-semibold rounded-[6px] cursor-pointer hover:bg-blue-50 transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restore selected</span>
            </button>
            <button
              onClick={() => handleDeleteForever(selectedIds)}
              className="px-3 py-1 bg-rose-600 text-white text-xs font-semibold rounded-[6px] cursor-pointer hover:bg-rose-700 shadow-xs transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete forever selected</span>
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-1 text-[#737373] hover:text-[#171717] dark:hover:text-[#EDEDED] text-xs font-medium"
            >
              Clear selection
            </button>
          </div>
        </div>
      )}

      {/* Items Grid / List Display */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[12px] p-16 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center">
            <Trash2 className="w-7 h-7" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#171717] dark:text-[#EDEDED]">Trash is empty</h2>
            <p className="text-xs text-[#737373] mt-1 max-w-sm">
              Deleted projects will appear here for 30 days before permanent removal.
            </p>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProjects.map((p) => {
            const isSelected = selectedIds.includes(p.id);
            const daysPassed = Math.floor((Date.now() - (p.deletedAt || Date.now())) / (1000 * 60 * 60 * 24));
            const daysRemaining = Math.max(0, 30 - daysPassed);
            const isUrgent = daysRemaining <= 3;
            const sizeStr = formatBytes(projectSizes[p.id]);

            return (
              <div
                key={p.id}
                className={`bg-white dark:bg-[#1A1A1A] border rounded-[10px] overflow-hidden transition-all group shadow-xs flex flex-col relative ${
                  isSelected ? 'border-[#3B82F6] ring-1 ring-[#3B82F6]' : 'border-[#E5E5E5] dark:border-[#2A2A2A] hover:border-rose-400'
                }`}
              >
                {/* Checkbox Overlay */}
                <div className="absolute top-2 left-2 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSelect(p.id, e.ctrlKey || e.metaKey, e.shiftKey);
                    }}
                    className="p-1 rounded bg-black/50 text-white hover:bg-black/70 cursor-pointer"
                  >
                    {isSelected ? <CheckSquare className="w-4 h-4 text-blue-400" /> : <Square className="w-4 h-4" />}
                  </button>
                </div>

                {/* Days Remaining Badge */}
                <div className="absolute top-2 right-2 z-10">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold shadow-xs ${
                      isUrgent
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'bg-black/60 text-white/90 backdrop-blur-xs'
                    }`}
                  >
                    Deletes in {daysRemaining} day{daysRemaining === 1 ? '' : 's'}
                  </span>
                </div>

                {/* Thumbnail Header (Dimmed) */}
                <div
                  onClick={() => setPreviewProject(p)}
                  className="h-36 bg-[#EBEBEB] dark:bg-[#0A0A0A] relative flex items-center justify-center cursor-pointer overflow-hidden opacity-75 group-hover:opacity-100 transition-opacity"
                >
                  <FolderKanban className="w-10 h-10 text-[#A3A3A3]" strokeWidth={1.5} />
                  <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-mono">
                    {p.aspectRatio || '16:9'}
                  </span>
                </div>

                {/* Body Details */}
                <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <h3
                      onClick={() => setPreviewProject(p)}
                      className="text-xs font-semibold text-[#171717] dark:text-[#EDEDED] truncate cursor-pointer hover:text-[#3B82F6]"
                      title={p.name}
                    >
                      {p.name}
                    </h3>
                    <div className="flex items-center justify-between text-[10px] text-[#737373] mt-1">
                      <span>Deleted {new Date(p.deletedAt || Date.now()).toLocaleDateString()}</span>
                      <span className="font-mono">{sizeStr}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A]">
                    <button
                      onClick={() => handleRestore(p.id)}
                      className="flex-1 py-1.5 rounded-[6px] bg-blue-50 dark:bg-blue-950/40 text-[#3B82F6] hover:bg-blue-100 dark:hover:bg-blue-900/50 text-[11px] font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Restore</span>
                    </button>
                    <button
                      onClick={() => handleDeleteForever([p.id])}
                      className="flex-1 py-1.5 rounded-[6px] bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-[11px] font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete forever</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setActiveMenuState({ project: p, rect });
                      }}
                      className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-[#737373] cursor-pointer"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[10px] overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#FAFAFA] dark:bg-[#151515] text-[11px] font-medium text-[#737373]">
                <th className="p-3 w-10">
                  <button onClick={handleSelectAll}>
                    {selectedIds.length === filteredProjects.length ? (
                      <CheckSquare className="w-4 h-4 text-blue-500" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-3">Project Name</th>
                <th className="p-3">Deleted Date</th>
                <th className="p-3">Purge Status</th>
                <th className="p-3">Size</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5] dark:divide-[#2A2A2A]">
              {filteredProjects.map((p) => {
                const isSelected = selectedIds.includes(p.id);
                const daysPassed = Math.floor((Date.now() - (p.deletedAt || Date.now())) / (1000 * 60 * 60 * 24));
                const daysRemaining = Math.max(0, 30 - daysPassed);
                const sizeStr = formatBytes(projectSizes[p.id]);

                return (
                  <tr key={p.id} className="hover:bg-[#F5F5F5] dark:hover:bg-[#222222] transition-colors">
                    <td className="p-3">
                      <button onClick={() => handleToggleSelect(p.id)}>
                        {isSelected ? <CheckSquare className="w-4 h-4 text-blue-500" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td
                      onClick={() => setPreviewProject(p)}
                      className="p-3 text-xs font-semibold text-[#171717] dark:text-[#EDEDED] cursor-pointer hover:text-[#3B82F6]"
                    >
                      {p.name}
                    </td>
                    <td className="p-3 text-xs text-[#737373]">
                      {new Date(p.deletedAt || Date.now()).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-xs">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          daysRemaining <= 3
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                            : 'bg-[#F5F5F5] text-[#737373] dark:bg-[#262626] dark:text-[#A1A1A1]'
                        }`}
                      >
                        Deletes in {daysRemaining} day{daysRemaining === 1 ? '' : 's'}
                      </span>
                    </td>
                    <td className="p-3 text-xs font-mono text-[#737373]">{sizeStr}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRestore(p.id)}
                          className="px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-950/40 text-[#3B82F6] hover:bg-blue-100 text-xs font-semibold cursor-pointer"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => handleDeleteForever([p.id])}
                          className="px-2.5 py-1 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-xs font-semibold cursor-pointer"
                        >
                          Delete forever
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Storage Usage Meter */}
      <div className="bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[10px] p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[8px] bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <HardDrive className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-[#171717] dark:text-[#EDEDED]">Browser Storage Usage</h4>
            <p className="text-[10px] text-[#737373]">
              Active Projects: {storageStats.activeFormattedMB || '0.0'} MB &bull; Trash Storage: {storageStats.trashFormattedMB || '0.0'} MB
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex-1 sm:w-48 h-2.5 bg-[#E5E5E5] dark:bg-[#2A2A2A] rounded-full overflow-hidden flex">
            {/* Active storage in blue */}
            <div
              className="h-full bg-[#3B82F6] transition-all duration-300"
              style={{
                width: `${Math.min(100, (parseFloat(storageStats.activeFormattedMB || '0') / 200) * 100)}%`,
              }}
              title={`Active: ${storageStats.activeFormattedMB} MB`}
            />
            {/* Trash storage in rose */}
            <div
              className="h-full bg-rose-500 transition-all duration-300"
              style={{
                width: `${Math.min(100, (parseFloat(storageStats.trashFormattedMB || '0') / 200) * 100)}%`,
              }}
              title={`Trash: ${storageStats.trashFormattedMB} MB`}
            />
          </div>
          <button
            onClick={handlePromptEmptyTrash}
            disabled={trashedProjects.length === 0}
            className={`px-3 py-1.5 rounded-[6px] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              trashedProjects.length > 0
                ? 'bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-100'
                : 'bg-[#E5E5E5] dark:bg-[#2A2A2A] text-[#A1A1A1] cursor-not-allowed opacity-60'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>
              {trashedProjects.length > 0
                ? `Empty Trash (${trashedProjects.length})`
                : 'Empty Trash'}
            </span>
          </button>
        </div>
      </div>

      {/* Empty Trash Confirmation Portal Modal */}
      <EmptyTrashConfirmationModal
        isOpen={emptyTrashConfirmModalOpen}
        onClose={() => setEmptyTrashConfirmModalOpen(false)}
        onConfirm={handleConfirmEmptyTrash}
        count={trashedProjects.length}
      />

      {/* Portal Menu Component */}
      {activeMenuState && (
        <TrashItemPortalMenu
          isOpen={!!activeMenuState}
          onClose={() => setActiveMenuState(null)}
          anchorRect={activeMenuState.rect}
          project={activeMenuState.project}
          onRestore={handleRestore}
          onDeleteForever={handleDeleteForever}
        />
      )}

      {/* Trashed Preview Dialog */}
      <TrashedPreviewModal
        project={previewProject}
        isOpen={!!previewProject}
        onClose={() => setPreviewProject(null)}
        onRestore={handleRestore}
        onDeleteForever={handleDeleteForever}
      />

      {/* Progress Dialog when deleting many items */}
      {deleteProgress && deleteProgress.isDeleting && (
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E1E1E] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-semibold text-[#171717] dark:text-[#EDEDED]">
              Permanently Deleting...
            </h3>
            <p className="text-xs text-[#737373]">
              Deleting {deleteProgress.current} of {deleteProgress.total} projects and purging media blobs...
            </p>
            <div className="w-full h-2 bg-[#E5E5E5] dark:bg-[#2A2A2A] rounded-full overflow-hidden">
              <div
                className="h-full bg-rose-600 transition-all duration-200"
                style={{
                  width: `${(deleteProgress.current / deleteProgress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
