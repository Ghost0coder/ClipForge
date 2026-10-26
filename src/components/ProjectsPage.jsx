import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { getAllProjectsFromDB, deleteProjectFromDB, saveProjectToDB, exportProjectToJson, parseProjectJson } from '../utils/storage';
import { AspectRatioModal } from './AspectRatioModal';
import { toastSuccess, toastWarning } from '../store/toastStore';

export const ProjectsPage = () => {
  const { setProject, setRoute } = useEditorStore();
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [filterTab, setFilterTab] = useState('all'); // 'all' | '9:16' | '16:9' | '1:1' | 'favorites' | 'trash'
  const [sortBy, setSortBy] = useState('updatedAt'); // 'updatedAt' | 'name' | 'duration' | 'createdAt'
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const [isAspectRatioModalOpen, setIsAspectRatioModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);

  const loadProjects = async () => {
    const list = await getAllProjectsFromDB();
    setProjects(list);
  };

  useEffect(() => {
    loadProjects();
  }, []);

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

  const handleDelete = async (id) => {
    const proj = projects.find((p) => p.id === id);
    if (!proj) return;
    // Move to trash or delete
    const updated = { ...proj, deletedAt: Date.now() };
    await saveProjectToDB(updated);
    await loadProjects();
    toastSuccess(`Moved "${proj.name}" to trash`, 'Project Deleted');
    setActiveMenuId(null);
  };

  const handleRestore = async (id) => {
    const proj = projects.find((p) => p.id === id);
    if (!proj) return;
    const updated = { ...proj, deletedAt: null };
    await saveProjectToDB(updated);
    await loadProjects();
    toastSuccess(`Restored "${proj.name}"`, 'Project Restored');
  };

  const handleDuplicate = async (id) => {
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
    await loadProjects();
    toastSuccess(`Duplicated "${proj.name}"`, 'Project Duplicated');
    setActiveMenuId(null);
  };

  const handleToggleFavorite = async (id) => {
    const proj = projects.find((p) => p.id === id);
    if (!proj) return;
    const updated = { ...proj, favorite: !proj.favorite };
    await saveProjectToDB(updated);
    await loadProjects();
  };

  const handleImportJson = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await parseProjectJson(file);
      imported.id = `project_${Date.now()}`;
      await saveProjectToDB(imported);
      await loadProjects();
      toastSuccess(`Imported project "${imported.name}"`, 'Project Imported');
    } catch (err) {
      toastWarning('Failed to parse project json file.', 'Import Error');
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
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#FAFAFA] dark:bg-[#111111] text-[#171717] dark:text-[#EDEDED] select-none p-6 lg:p-8 space-y-6">
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
            onClick={() => useEditorStore.getState().clearUnusedMedia()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[8px] border border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-medium text-[#737373] hover:text-rose-600 dark:text-[#A1A1A1] dark:hover:text-rose-400 cursor-pointer transition-colors"
            title="Clean media blobs unreferenced across projects"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clean Unused Media</span>
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
            className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-medium shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Toolbar / Filters / Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[10px] p-4 shadow-xs">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 md:pb-0">
          {[
            { id: 'all', label: 'All Projects' },
            { id: '9:16', label: 'Reels 9:16' },
            { id: '16:9', label: 'YouTube 16:9' },
            { id: '1:1', label: 'Square 1:1' },
            { id: 'favorites', label: 'Favorites' },
            { id: 'trash', label: 'Trash' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              className={`px-3 py-1.5 rounded-[6px] text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                filterTab === tab.id
                  ? 'bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#171717]'
                  : 'text-[#737373] dark:text-[#A1A1A1] hover:bg-[#F5F5F5] dark:hover:bg-[#262626]'
              }`}
            >
              {tab.label}
            </button>
          ))}
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
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-[#3B82F6] rounded-[10px] p-3 flex items-center justify-between">
          <span className="text-xs font-medium text-[#3B82F6]">
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
              onClick={async () => {
                for (const id of selectedProjectIds) {
                  await handleDelete(id);
                }
                setSelectedProjectIds([]);
              }}
              className="px-3 py-1 bg-rose-500 text-white text-xs font-medium rounded-[6px] cursor-pointer hover:bg-rose-600"
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
            <h2 className="text-sm font-semibold text-[#171717] dark:text-[#EDEDED]">No projects found</h2>
            <p className="text-xs text-[#737373] mt-1">Get started by creating your first video project.</p>
          </div>
          <button
            onClick={() => setIsAspectRatioModalOpen(true)}
            className="px-4 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-medium rounded-[8px] shadow-sm transition-colors cursor-pointer"
          >
            Create your first project
          </button>
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
                <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSelect(p.id);
                    }}
                    className="p-1 rounded bg-black/40 text-white hover:bg-black/60 cursor-pointer"
                  >
                    {isSelected ? <CheckSquare className="w-4 h-4 text-blue-400" /> : <Square className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(p.id);
                    }}
                    className="p-1 rounded bg-black/40 text-white hover:bg-black/60 cursor-pointer"
                  >
                    <Star className={`w-4 h-4 ${p.favorite ? 'text-amber-400 fill-amber-400' : 'text-white'}`} />
                  </button>
                </div>

                {/* Thumbnail Header */}
                <div
                  onClick={() => {
                    if (p.deletedAt) return;
                    setProject(p);
                    setRoute('editor');
                  }}
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
                    <div>
                      <h3
                        onClick={() => {
                          if (p.deletedAt) return;
                          setProject(p);
                          setRoute('editor');
                        }}
                        className="text-xs font-semibold text-[#171717] dark:text-[#EDEDED] truncate cursor-pointer hover:text-[#3B82F6]"
                      >
                        {p.name}
                      </h3>
                      <p className="text-[10px] text-[#737373] mt-0.5">
                        Edited {new Date(p.updatedAt || Date.now()).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Menu Button */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === p.id ? null : p.id);
                        }}
                        className="p-1 rounded text-[#737373] hover:text-[#171717] dark:hover:text-[#EDEDED] cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeMenuId === p.id && (
                        <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#333333] rounded-[8px] shadow-lg py-1 z-20">
                          {!p.deletedAt ? (
                            <>
                              <button
                                onClick={() => {
                                  setProject(p);
                                  setRoute('editor');
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs text-[#171717] dark:text-[#EDEDED] hover:bg-[#F5F5F5] dark:hover:bg-[#2E2E2E]"
                              >
                                Open
                              </button>
                              <button
                                onClick={() => handleDuplicate(p.id)}
                                className="w-full text-left px-3 py-1.5 text-xs text-[#171717] dark:text-[#EDEDED] hover:bg-[#F5F5F5] dark:hover:bg-[#2E2E2E]"
                              >
                                Duplicate
                              </button>
                              <button
                                onClick={() => exportProjectToJson(p)}
                                className="w-full text-left px-3 py-1.5 text-xs text-[#171717] dark:text-[#EDEDED] hover:bg-[#F5F5F5] dark:hover:bg-[#2E2E2E]"
                              >
                                Export JSON
                              </button>
                              <button
                                onClick={() => handleDelete(p.id)}
                                className="w-full text-left px-3 py-1.5 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleRestore(p.id)}
                              className="w-full text-left px-3 py-1.5 text-xs text-[#3B82F6] hover:bg-blue-50 dark:hover:bg-blue-950/30 flex items-center gap-1.5"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Restore</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
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
                      onClick={() => {
                        if (p.deletedAt) return;
                        setProject(p);
                        setRoute('editor');
                      }}
                      className="p-3 text-xs font-semibold text-[#171717] dark:text-[#EDEDED] cursor-pointer hover:text-[#3B82F6]"
                    >
                      {p.name}
                    </td>
                    <td className="p-3 text-xs font-mono text-[#737373]">{p.aspectRatio || '16:9'}</td>
                    <td className="p-3 text-xs text-[#737373]">
                      {new Date(p.updatedAt || Date.now()).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right space-x-2">
                      {!p.deletedAt ? (
                        <>
                          <button
                            onClick={() => exportProjectToJson(p)}
                            className="px-2 py-1 bg-white dark:bg-[#262626] border border-[#E5E5E5] dark:border-[#333333] text-[11px] rounded hover:border-[#3B82F6]"
                          >
                            Export
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="px-2 py-1 bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 text-[11px] rounded"
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleRestore(p.id)}
                          className="px-2.5 py-1 bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 text-[11px] rounded font-medium"
                        >
                          Restore
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Storage Meter & Clear Unused Media */}
      <div className="bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[10px] p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[8px] bg-[#3B82F6]/10 text-[#3B82F6] flex items-center justify-center">
            <HardDrive className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-[#171717] dark:text-[#EDEDED]">Browser Storage Usage</h4>
            <p className="text-[10px] text-[#737373]">IndexedDB is caching your project assets & media blobs.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex-1 sm:w-36 h-2 bg-[#E5E5E5] dark:bg-[#2A2A2A] rounded-full overflow-hidden">
            <div className="h-full bg-[#3B82F6] w-1/4 rounded-full" />
          </div>
          <button
            onClick={() => {
              toastSuccess('Cleared temporary cached media blobs', 'Storage Cleaned');
            }}
            className="px-3 py-1.5 rounded-[6px] bg-[#FAFAFA] dark:bg-[#262626] border border-[#E5E5E5] dark:border-[#333333] text-xs font-medium text-[#171717] dark:text-[#EDEDED] hover:bg-[#E5E5E5] dark:hover:bg-[#333333] transition-colors cursor-pointer whitespace-nowrap"
          >
            Clear Unused Media
          </button>
        </div>
      </div>

      {/* Aspect Ratio Modal */}
      <AspectRatioModal
        isOpen={isAspectRatioModalOpen}
        onClose={() => setIsAspectRatioModalOpen(false)}
      />
    </div>
  );
};
