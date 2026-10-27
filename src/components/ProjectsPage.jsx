import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  FolderKanban,
  Search,
  Grid,
  List,
  Plus,
  Trash2,
  Download,
  Copy,
  Star,
  MoreVertical,
  CheckSquare,
  Square,
  Upload,
  HardDrive,
  RefreshCw,
  FolderOpen,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import {
  getAllProjectsFromDB,
  saveProjectToDB,
  exportProjectToJson,
  parseProjectJson,
  calculateTotalStorageUsage,
  permanentlyDeleteProjectAndUnusedMedia,
  autoPurgeExpiredTrashProjects,
} from '../utils/storage';
import { createDefaultProject } from '../utils/sampleData';
import { AspectRatioModal } from './AspectRatioModal';
import { toastSuccess, toastWarning, toastError } from '../store/toastStore';

/* PORTAL-RENDERED DELETE CONFIRMATION MODAL */
const DeleteConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Move to Trash',
  isDanger = true,
}) => {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onConfirm]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#1E1E1E] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-xl p-5 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 shrink-0">
              <Trash2 className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <h3 className="text-sm font-semibold text-[#171717] dark:text-[#EDEDED]">
              {title}
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
          {message}
        </p>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium rounded-[6px] border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#171717] dark:text-[#EDEDED] hover:bg-[#F5F5F5] dark:hover:bg-[#2A2A2A] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-[6px] text-white transition-colors cursor-pointer shadow-xs ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-[#3B82F6] hover:bg-blue-600'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* PORTAL-RENDERED 3-DOT MENU */
const ProjectCardPortalMenu = ({
  isOpen,
  onClose,
  anchorRect,
  project,
  onOpen,
  onRename,
  onDuplicate,
  onFavorite,
  onExport,
  onDelete,
  onDeleteForever,
  onRestore,
}) => {
  const menuRef = useRef(null);
  const [style, setStyle] = useState({});

  useEffect(() => {
    if (!isOpen || !anchorRect) return;

    const menuWidth = 170;
    const menuHeight = project.deletedAt ? 90 : 220;
    const padding = 12;

    let top = anchorRect.bottom + 4;
    let left = anchorRect.right - menuWidth;

    // Flip upward if menu overflows bottom viewport
    if (top + menuHeight > window.innerHeight - padding) {
      top = anchorRect.top - menuHeight - 4;
    }

    // Adjust left if overflowing screen
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
      {!project.deletedAt ? (
        <>
          <button
            onClick={() => {
              onClose();
              onOpen(project);
            }}
            className="w-full text-left px-3.5 py-2 text-[#171717] dark:text-[#EDEDED] hover:bg-[#F5F5F5] dark:hover:bg-[#2E2E2E] flex items-center gap-2 cursor-pointer font-medium transition-colors"
          >
            <FolderOpen className="w-4 h-4 text-blue-500" strokeWidth={1.5} />
            <span>Open Project</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onRename(project);
            }}
            className="w-full text-left px-3.5 py-2 text-[#171717] dark:text-[#EDEDED] hover:bg-[#F5F5F5] dark:hover:bg-[#2E2E2E] flex items-center gap-2 cursor-pointer font-medium transition-colors"
          >
            <Edit2 className="w-4 h-4 text-[#737373]" strokeWidth={1.5} />
            <span>Rename</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onDuplicate(project.id);
            }}
            className="w-full text-left px-3.5 py-2 text-[#171717] dark:text-[#EDEDED] hover:bg-[#F5F5F5] dark:hover:bg-[#2E2E2E] flex items-center gap-2 cursor-pointer font-medium transition-colors"
          >
            <Copy className="w-4 h-4 text-[#737373]" strokeWidth={1.5} />
            <span>Duplicate</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onFavorite(project.id);
            }}
            className="w-full text-left px-3.5 py-2 text-[#171717] dark:text-[#EDEDED] hover:bg-[#F5F5F5] dark:hover:bg-[#2E2E2E] flex items-center gap-2 cursor-pointer font-medium transition-colors"
          >
            <Star className={`w-4 h-4 ${project.favorite ? 'text-amber-400 fill-amber-400' : 'text-[#737373]'}`} strokeWidth={1.5} />
            <span>{project.favorite ? 'Unfavorite' : 'Favorite'}</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onExport(project);
            }}
            className="w-full text-left px-3.5 py-2 text-[#171717] dark:text-[#EDEDED] hover:bg-[#F5F5F5] dark:hover:bg-[#2E2E2E] flex items-center gap-2 cursor-pointer font-medium transition-colors"
          >
            <Download className="w-4 h-4 text-[#737373]" strokeWidth={1.5} />
            <span>Export File</span>
          </button>

          <div className="my-1 border-t border-[#E5E5E5] dark:border-[#333333]" />

          <button
            onClick={() => {
              console.log('[ClipForge:DeleteProject] Delete option selected from portal menu for:', project.id);
              onDelete(project.id);
              onClose();
            }}
            className="w-full text-left px-3.5 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 cursor-pointer font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4 text-rose-500" strokeWidth={1.5} />
            <span>Delete</span>
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => {
              console.log('[ClipForge:DeleteProject] Restore option selected from portal menu for:', project.id);
              onRestore(project.id);
              onClose();
            }}
            className="w-full text-left px-3.5 py-2 text-[#3B82F6] hover:bg-blue-50 dark:hover:bg-blue-950/30 flex items-center gap-2 cursor-pointer font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-[#3B82F6]" strokeWidth={1.5} />
            <span>Restore Project</span>
          </button>
          <button
            onClick={() => {
              console.log('[ClipForge:DeleteProject] Delete Forever option selected from portal menu for:', project.id);
              onDeleteForever(project.id);
              onClose();
            }}
            className="w-full text-left px-3.5 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 cursor-pointer font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4 text-rose-500" strokeWidth={1.5} />
            <span>Delete Forever</span>
          </button>
        </>
      )}
    </div>,
    document.body
  );
};

export const ProjectsPage = () => {
  const { setProject, setRoute, clearUnusedMedia, isClearMediaModalOpen } = useEditorStore();
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [filterTab, setFilterTab] = useState('all'); // 'all' | '9:16' | '16:9' | '1:1' | 'favorites' | 'trash'
  const [sortBy, setSortBy] = useState('updatedAt'); // 'updatedAt' | 'name' | 'duration' | 'createdAt'
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const [isAspectRatioModalOpen, setIsAspectRatioModalOpen] = useState(false);

  // Portal Menu State
  const [activeMenuState, setActiveMenuState] = useState(null); // { project, rect }

  // Rename modal state
  const [renamingProject, setRenamingProject] = useState(null);
  const [renameInputValue, setRenameInputValue] = useState('');

  // Delete Confirmation Modal State
  // { isOpen: boolean, type: 'trash' | 'bulk_trash' | 'delete_forever' | 'empty_trash', projectId?: string, projectNames?: string, count?: number }
  const [deleteModalState, setDeleteModalState] = useState(null);

  // Storage Stats State
  const [storageMB, setStorageMB] = useState('0.0');

  const loadProjectsAndStorage = async () => {
    console.log('[ClipForge:Asset] Loading projects and storage stats in ProjectsPage...');
    const list = await getAllProjectsFromDB();
    setProjects(list);
    const stats = await calculateTotalStorageUsage();
    setStorageMB(stats.formattedMB);
  };

  useEffect(() => {
    const initPage = async () => {
      console.log('[ClipForge:DeleteProject] Initializing ProjectsPage & auto-purging expired trash (>30 days)...');
      await autoPurgeExpiredTrashProjects();
      await loadProjectsAndStorage();
    };
    initPage();
  }, [isClearMediaModalOpen]);

  const handleOpenMenu = (project, buttonEl) => {
    const rect = buttonEl.getBoundingClientRect();
    console.log('[ClipForge:Asset] Opening 3-dot portal menu for project:', project.id, { rect });
    setActiveMenuState({ project, rect });
  };

  const handleCloseMenu = () => {
    setActiveMenuState(null);
  };

  const handleOpenProjectInEditor = (proj) => {
    if (proj.deletedAt) return;
    setProject(proj);
    setRoute('editor');
  };

  const handleStartRename = (proj) => {
    setRenamingProject(proj);
    setRenameInputValue(proj.name);
  };

  const handleSaveRename = async () => {
    if (!renamingProject || !renameInputValue.trim()) return;
    try {
      const updated = { ...renamingProject, name: renameInputValue.trim(), updatedAt: Date.now() };
      await saveProjectToDB(updated);
      await loadProjectsAndStorage();
      toastSuccess(`Renamed project to "${updated.name}"`, 'Project Renamed');
      setRenamingProject(null);
    } catch (err) {
      toastError(err.message || 'Failed to rename project', 'Rename Error');
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedProjectIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedProjectIds.length === filteredProjects.length) {
      setSelectedProjectIds([]);
    } else {
      setSelectedProjectIds(filteredProjects.map((p) => p.id));
    }
  };

  // Delete Prompt Handlers
  const handlePromptDelete = (id) => {
    const proj = projects.find((p) => p.id === id);
    if (!proj) return;
    console.log('[ClipForge:DeleteProject] Prompting move to trash confirmation for:', id, proj.name);
    setDeleteModalState({
      isOpen: true,
      type: 'trash',
      projectId: id,
      projectNames: proj.name,
    });
  };

  const handlePromptBulkDelete = () => {
    if (selectedProjectIds.length === 0) return;
    console.log('[ClipForge:DeleteProject] Prompting bulk move to trash for count:', selectedProjectIds.length);
    setDeleteModalState({
      isOpen: true,
      type: 'bulk_trash',
      count: selectedProjectIds.length,
    });
  };

  const handlePromptDeleteForever = (id) => {
    const proj = projects.find((p) => p.id === id);
    if (!proj) return;
    console.log('[ClipForge:DeleteProject] Prompting Delete Forever confirmation for:', id, proj.name);
    setDeleteModalState({
      isOpen: true,
      type: 'delete_forever',
      projectId: id,
      projectNames: proj.name,
    });
  };

  const handlePromptEmptyTrash = () => {
    const trashedCount = projects.filter((p) => p.deletedAt).length;
    if (trashedCount === 0) return;
    console.log('[ClipForge:DeleteProject] Prompting Empty Trash confirmation for count:', trashedCount);
    setDeleteModalState({
      isOpen: true,
      type: 'empty_trash',
      count: trashedCount,
    });
  };

  // Execution of Confirmed Delete
  const handleConfirmDelete = async () => {
    if (!deleteModalState) return;
    const { type, projectId, projectNames } = deleteModalState;
    console.log('[ClipForge:DeleteProject] Confirming delete operation:', { type, projectId, projectNames });
    setDeleteModalState(null);

    try {
      if (type === 'trash') {
        const proj = projects.find((p) => p.id === projectId);
        if (!proj) return;

        console.log('[ClipForge:DeleteProject] Setting deletedAt for project:', projectId);
        const updated = { ...proj, deletedAt: Date.now() };
        await saveProjectToDB(updated);
        console.log('[ClipForge:DeleteProject] Successfully saved deletedAt timestamp to IndexedDB');

        // Check if current active project in editorStore is the deleted project
        const currentActiveProject = useEditorStore.getState().project;
        if (currentActiveProject && currentActiveProject.id === projectId) {
          console.log('[ClipForge:DeleteProject] Active editor project was deleted, resetting active project');
          useEditorStore.getState().setProject(createDefaultProject());
        }

        await loadProjectsAndStorage();
        console.log('[ClipForge:DeleteProject] Removed project from active list state');

        toastSuccess(
          `Moved "${proj.name}" to Trash`,
          'Project Moved to Trash',
          {
            label: 'Undo',
            onClick: () => handleRestore(projectId),
          }
        );
        console.log('[ClipForge:DeleteProject] Finished move to trash for:', projectId);
      } else if (type === 'bulk_trash') {
        console.log('[ClipForge:DeleteProject] Executing bulk move to trash for count:', selectedProjectIds.length);
        const currentActiveProject = useEditorStore.getState().project;
        let count = 0;

        for (const id of selectedProjectIds) {
          const proj = projects.find((p) => p.id === id);
          if (proj) {
            const updated = { ...proj, deletedAt: Date.now() };
            await saveProjectToDB(updated);
            count++;

            if (currentActiveProject && currentActiveProject.id === id) {
              useEditorStore.getState().setProject(createDefaultProject());
            }
          }
        }

        setSelectedProjectIds([]);
        await loadProjectsAndStorage();
        console.log('[ClipForge:DeleteProject] Finished bulk move to trash. Total trashed:', count);
        toastSuccess(`Moved ${count} project(s) to Trash`, 'Projects Deleted');
      } else if (type === 'delete_forever') {
        console.log('[ClipForge:EmptyTrash] Executing permanent deletion for:', projectId);
        const res = await purgeTrashedProjects([projectId]);
        await loadProjectsAndStorage();
        toastSuccess(`Permanently deleted "${projectNames || 'Project'}", freed ${res.freedMB} MB`, 'Project Deleted');
        console.log('[ClipForge:EmptyTrash] Finished permanent deletion of:', projectId);
      } else if (type === 'empty_trash') {
        const trashed = projects.filter((p) => p.deletedAt);
        console.log('[ClipForge:EmptyTrash] Executing Empty Trash for count:', trashed.length);

        const res = await purgeTrashedProjects(trashed.map((p) => p.id));

        await loadProjectsAndStorage();
        toastSuccess(`Deleted ${res.deletedProjectsCount} project(s), freed ${res.freedMB} MB`, 'Trash Emptied');
        console.log('[ClipForge:EmptyTrash] Finished Empty Trash');
      }
    } catch (err) {
      console.error('[ClipForge:DeleteProject] Failed delete execution:', err);
      toastError(err.message || 'An error occurred while deleting the project.', 'Delete Failed');
    }
  };

  const handleRestore = async (id) => {
    try {
      console.log('[ClipForge:DeleteProject] Restoring project from trash:', id);
      const proj = projects.find((p) => p.id === id);
      if (!proj) return;
      const updated = { ...proj, deletedAt: null };
      await saveProjectToDB(updated);
      await loadProjectsAndStorage();
      toastSuccess(`Restored "${proj.name}"`, 'Project Restored');
      console.log('[ClipForge:DeleteProject] Successfully restored project:', id);
    } catch (err) {
      console.error('[ClipForge:DeleteProject] Failed to restore project:', err);
      toastError(err.message || 'Failed to restore project', 'Restore Error');
    }
  };

  const handleDuplicate = async (id) => {
    try {
      const proj = projects.find((p) => p.id === id);
      if (!proj) return;
      const dup = {
        ...proj,
        id: `project_${Date.now()}`,
        name: `${proj.name} (Copy)`,
        updatedAt: Date.now(),
        createdAt: Date.now(),
      };
      await saveProjectToDB(dup);
      await loadProjectsAndStorage();
      toastSuccess(`Duplicated "${proj.name}"`, 'Project Duplicated');
    } catch (err) {
      toastError(err.message || 'Failed to duplicate project', 'Duplicate Error');
    }
  };

  const handleToggleFavorite = async (id) => {
    try {
      const proj = projects.find((p) => p.id === id);
      if (!proj) return;
      const updated = { ...proj, favorite: !proj.favorite };
      await saveProjectToDB(updated);
      await loadProjectsAndStorage();
    } catch (err) {
      toastError(err.message || 'Failed to update favorite status', 'Favorite Error');
    }
  };

  const handleImportJson = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await parseProjectJson(file);
      imported.id = `project_${Date.now()}`;
      await saveProjectToDB(imported);
      await loadProjectsAndStorage();
      toastSuccess(`Imported project "${imported.name}"`, 'Project Imported');
    } catch (err) {
      toastWarning('Failed to parse project JSON file.', 'Import Error');
    }
  };

  // Filter and sort
  const filteredProjects = projects.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const isTrash = filterTab === 'trash';
    if (isTrash) {
      return matchesSearch && p.deletedAt;
    }
    if (p.deletedAt) return false;

    if (filterTab === '9:16') return matchesSearch && p.aspectRatio === '9:16';
    if (filterTab === '16:9') return matchesSearch && p.aspectRatio === '16:9';
    if (filterTab === '1:1') return matchesSearch && p.aspectRatio === '1:1';
    if (filterTab === 'favorites') return matchesSearch && p.favorite;
    return matchesSearch;
  }).sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'duration') return (b.duration || 0) - (a.duration || 0);
    if (sortBy === 'createdAt') return (b.createdAt || 0) - (a.createdAt || 0);
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#FAFAFA] dark:bg-[#111111] text-[#171717] dark:text-[#EDEDED] select-none p-4 sm:p-6 lg:p-8 space-y-6 pb-24 sm:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#171717] dark:text-[#EDEDED]">
            Project Library
          </h1>
          <p className="text-xs text-[#737373] dark:text-[#A1A1A1] mt-0.5">
            Manage, organize, and export all your video editing projects.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Clean Unused Media */}
          <button
            onClick={() => clearUnusedMedia()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[8px] border border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-medium text-[#737373] hover:text-rose-600 dark:text-[#A1A1A1] dark:hover:text-rose-400 cursor-pointer transition-colors"
            title="Scan and clear unreferenced media blobs"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear Unused Media</span>
          </button>

          {/* Import JSON */}
          <label className="flex items-center gap-1.5 px-3 py-2 rounded-[8px] border border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-xs font-medium cursor-pointer transition-colors">
            <Upload className="w-4 h-4 text-[#737373]" strokeWidth={1.5} />
            <span>Import JSON</span>
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>

          {/* New Project Button */}
          <button
            onClick={() => setIsAspectRatioModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Toolbar / Filters / Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[10px] p-4 shadow-xs">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 md:pb-0 flex-1">
          {[
            { id: 'all', label: 'All Projects' },
            { id: '9:16', label: 'Reels 9:16' },
            { id: '16:9', label: 'YouTube 16:9' },
            { id: '1:1', label: 'Square 1:1' },
            { id: 'favorites', label: 'Favorites' },
            { id: 'trash', label: 'Trash' },
          ].map((tab) => {
            const trashedCount = projects.filter((p) => p.deletedAt).length;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === 'trash') {
                    setRoute('trash');
                  } else {
                    setFilterTab(tab.id);
                  }
                }}
                className={`px-3 py-1.5 rounded-[6px] text-xs font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  filterTab === tab.id
                    ? 'bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#171717]'
                    : 'text-[#737373] dark:text-[#A1A1A1] hover:bg-[#F5F5F5] dark:hover:bg-[#262626]'
                }`}
              >
                <span>{tab.label}</span>
                {tab.id === 'trash' && trashedCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                    {trashedCount}
                  </span>
                )}
              </button>
            );
          })}

          {/* Empty Trash button when on Trash tab */}
          {filterTab === 'trash' && projects.some((p) => p.deletedAt) && (
            <button
              onClick={handlePromptEmptyTrash}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 cursor-pointer transition-colors whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Empty Trash</span>
            </button>
          )}
        </div>

        {/* Search, Sort & View Mode */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737373]" strokeWidth={1.5} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="w-full bg-[#FAFAFA] dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] pl-9 pr-3 py-1.5 text-xs text-[#171717] dark:text-[#EDEDED] outline-none focus:border-[#3B82F6]"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-[#FAFAFA] dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] px-3 py-1.5 text-xs text-[#171717] dark:text-[#EDEDED] outline-none cursor-pointer"
          >
            <option value="updatedAt">Last Edited</option>
            <option value="name">Project Name</option>
            <option value="duration">Duration</option>
            <option value="createdAt">Date Created</option>
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

      {/* Multi-select bar if selected */}
      {selectedProjectIds.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-[#3B82F6] rounded-[10px] p-3 flex items-center justify-between text-xs">
          <span className="font-semibold text-[#3B82F6]">
            {selectedProjectIds.length} project(s) selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                for (const id of selectedProjectIds) {
                  const p = projects.find((item) => item.id === id);
                  if (p) exportProjectToJson(p);
                }
                setSelectedProjectIds([]);
              }}
              className="px-3 py-1 bg-white dark:bg-[#1A1A1A] border border-[#3B82F6] text-[#3B82F6] text-xs font-medium rounded-[6px] cursor-pointer hover:bg-blue-50"
            >
              Export Selected
            </button>
            <button
              onClick={handlePromptBulkDelete}
              className="px-3 py-1 bg-rose-500 text-white text-xs font-medium rounded-[6px] cursor-pointer hover:bg-rose-600 shadow-xs"
            >
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Projects Display */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[12px] p-12 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#3B82F6]/10 text-[#3B82F6] flex items-center justify-center">
            <FolderKanban className="w-6 h-6" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#171717] dark:text-[#EDEDED]">
              {filterTab === 'trash' ? 'Trash is empty' : 'No projects found'}
            </h2>
            <p className="text-xs text-[#737373] mt-1">
              {filterTab === 'trash'
                ? 'Deleted projects appear here for 30 days before permanent removal.'
                : 'Get started by creating your first video project.'}
            </p>
          </div>
          {filterTab !== 'trash' && (
            <button
              onClick={() => setIsAspectRatioModalOpen(true)}
              className="px-4 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-medium rounded-[8px] shadow-xs transition-colors cursor-pointer"
            >
              Create your first project
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProjects.map((p) => {
            const isSelected = selectedProjectIds.includes(p.id);
            return (
              <div
                key={p.id}
                className={`bg-white dark:bg-[#1A1A1A] border rounded-[10px] overflow-hidden transition-all group shadow-xs flex flex-col relative ${
                  isSelected ? 'border-[#3B82F6] ring-1 ring-[#3B82F6]' : 'border-[#E5E5E5] dark:border-[#2A2A2A] hover:border-[#3B82F6]'
                }`}
              >
                {/* Checkbox & Favorite Overlay */}
                <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between pointer-events-none">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSelect(p.id);
                    }}
                    className="p-1 rounded bg-black/40 text-white hover:bg-black/60 cursor-pointer pointer-events-auto"
                  >
                    {isSelected ? <CheckSquare className="w-4 h-4 text-blue-400" /> : <Square className="w-4 h-4" />}
                  </button>
                  {!p.deletedAt && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(p.id);
                      }}
                      className="p-1 rounded bg-black/40 text-white hover:bg-black/60 cursor-pointer pointer-events-auto"
                    >
                      <Star className={`w-4 h-4 ${p.favorite ? 'text-amber-400 fill-amber-400' : 'text-white'}`} />
                    </button>
                  )}
                </div>

                {/* Thumbnail Header */}
                <div
                  onClick={() => handleOpenProjectInEditor(p)}
                  className="h-36 bg-[#F0F0F0] dark:bg-[#0D0D0D] relative flex items-center justify-center cursor-pointer overflow-hidden"
                >
                  <FolderKanban className="w-10 h-10 text-[#A3A3A3] group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                  <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-mono">
                    {p.aspectRatio || '16:9'}
                  </span>
                </div>

                {/* Body */}
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3
                        onClick={() => handleOpenProjectInEditor(p)}
                        className={`text-xs font-semibold text-[#171717] dark:text-[#EDEDED] truncate ${p.deletedAt ? '' : 'cursor-pointer hover:text-[#3B82F6]'}`}
                        title={p.name}
                      >
                        {p.name}
                      </h3>
                      <p className="text-[10px] text-[#737373] mt-0.5">
                        {p.deletedAt
                          ? `Deleted ${new Date(p.deletedAt).toLocaleDateString()}`
                          : `Edited ${new Date(p.updatedAt || Date.now()).toLocaleDateString()}`}
                      </p>
                    </div>

                    {/* 3-Dot Trigger Button */}
                    <button
                      aria-label="Project actions"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (activeMenuState && activeMenuState.project.id === p.id) {
                          handleCloseMenu();
                        } else {
                          handleOpenMenu(p, e.currentTarget);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          e.preventDefault();
                          handleOpenMenu(p, e.currentTarget);
                        }
                      }}
                      className="min-w-[44px] min-h-[44px] p-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] transition-colors cursor-pointer shrink-0"
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
                    {selectedProjectIds.length === filteredProjects.length ? (
                      <CheckSquare className="w-4 h-4 text-blue-500" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-3">Project Name</th>
                <th className="p-3">Aspect Ratio</th>
                <th className="p-3">Last Edited</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5] dark:divide-[#2A2A2A]">
              {filteredProjects.map((p) => {
                const isSelected = selectedProjectIds.includes(p.id);
                return (
                  <tr key={p.id} className="hover:bg-[#F5F5F5] dark:hover:bg-[#222222] transition-colors">
                    <td className="p-3">
                      <button onClick={() => handleToggleSelect(p.id)}>
                        {isSelected ? <CheckSquare className="w-4 h-4 text-blue-500" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td
                      onClick={() => handleOpenProjectInEditor(p)}
                      className={`p-3 text-xs font-semibold text-[#171717] dark:text-[#EDEDED] ${p.deletedAt ? '' : 'cursor-pointer hover:text-[#3B82F6]'}`}
                    >
                      {p.name}
                    </td>
                    <td className="p-3 text-xs font-mono text-[#737373]">{p.aspectRatio || '16:9'}</td>
                    <td className="p-3 text-xs text-[#737373]">
                      {p.deletedAt
                        ? `Deleted ${new Date(p.deletedAt).toLocaleDateString()}`
                        : new Date(p.updatedAt || Date.now()).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        aria-label="Project actions"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          if (activeMenuState && activeMenuState.project.id === p.id) {
                            handleCloseMenu();
                          } else {
                            handleOpenMenu(p, e.currentTarget);
                          }
                        }}
                        className="min-w-[44px] min-h-[44px] p-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 inline-flex items-center justify-center text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] transition-colors cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
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
          <div className="w-9 h-9 rounded-[8px] bg-[#3B82F6]/10 text-[#3B82F6] flex items-center justify-center">
            <HardDrive className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-[#171717] dark:text-[#EDEDED]">Browser Storage Usage</h4>
            <p className="text-[10px] text-[#737373]">IndexedDB is caching {storageMB} MB of project media blobs.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex-1 sm:w-36 h-2 bg-[#E5E5E5] dark:bg-[#2A2A2A] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#3B82F6] rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(5, (parseFloat(storageMB) / 200) * 100))}%` }}
            />
          </div>
          <button
            onClick={() => clearUnusedMedia()}
            className="px-3 py-1.5 rounded-[6px] bg-[#FAFAFA] dark:bg-[#262626] border border-[#E5E5E5] dark:border-[#333333] text-xs font-medium text-[#171717] dark:text-[#EDEDED] hover:bg-[#E5E5E5] dark:hover:bg-[#333333] transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>Clear Unused Media</span>
          </button>
        </div>
      </div>

      {/* Portal Menu Component */}
      {activeMenuState && (
        <ProjectCardPortalMenu
          isOpen={!!activeMenuState}
          onClose={handleCloseMenu}
          anchorRect={activeMenuState.rect}
          project={activeMenuState.project}
          onOpen={handleOpenProjectInEditor}
          onRename={handleStartRename}
          onDuplicate={handleDuplicate}
          onFavorite={handleToggleFavorite}
          onExport={exportProjectToJson}
          onDelete={handlePromptDelete}
          onDeleteForever={handlePromptDeleteForever}
          onRestore={handleRestore}
        />
      )}

      {/* Delete Confirmation Portal Modal */}
      {deleteModalState && (
        <DeleteConfirmationModal
          isOpen={deleteModalState.isOpen}
          onClose={() => setDeleteModalState(null)}
          onConfirm={handleConfirmDelete}
          title={
            deleteModalState.type === 'trash'
              ? 'Move to Trash'
              : deleteModalState.type === 'bulk_trash'
              ? 'Move Selected to Trash'
              : deleteModalState.type === 'delete_forever'
              ? 'Delete Permanently'
              : 'Empty Trash'
          }
          message={
            deleteModalState.type === 'trash'
              ? `Move "${deleteModalState.projectNames}" to Trash? You can restore it for 30 days.`
              : deleteModalState.type === 'bulk_trash'
              ? `Move ${deleteModalState.count} selected project(s) to Trash? You can restore them for 30 days.`
              : deleteModalState.type === 'delete_forever'
              ? `Permanently delete "${deleteModalState.projectNames}"? This action cannot be undone and will free up browser storage.`
              : `Empty Trash? All ${deleteModalState.count} project(s) in Trash will be permanently deleted.`
          }
          confirmLabel={
            deleteModalState.type === 'trash' || deleteModalState.type === 'bulk_trash'
              ? 'Move to Trash'
              : deleteModalState.type === 'delete_forever'
              ? 'Delete Forever'
              : 'Empty Trash'
          }
          isDanger={true}
        />
      )}

      {/* Rename Modal */}
      {renamingProject && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E1E1E] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#171717] dark:text-[#EDEDED]">Rename Project</h3>
              <button onClick={() => setRenamingProject(null)} className="text-[#737373] hover:text-[#171717] dark:hover:text-[#EDEDED]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              value={renameInputValue}
              onChange={(e) => setRenameInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveRename()}
              autoFocus
              className="w-full bg-[#FAFAFA] dark:bg-[#151515] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] px-3 py-2 text-xs text-[#171717] dark:text-[#EDEDED] outline-none focus:border-[#3B82F6]"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setRenamingProject(null)} className="px-3 py-1.5 text-xs rounded border border-[#E5E5E5] dark:border-[#2A2A2A]">
                Cancel
              </button>
              <button onClick={handleSaveRename} className="px-3 py-1.5 text-xs rounded bg-[#3B82F6] text-white font-medium">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Aspect Ratio Modal */}
      <AspectRatioModal
        isOpen={isAspectRatioModalOpen}
        onClose={() => setIsAspectRatioModalOpen(false)}
      />
    </div>
  );
};
