import React, { useEffect, useState, useRef } from 'react';
import {
  X,
  FolderOpen,
  Plus,
  Trash2,
  Download,
  Upload,
  Clock,
  Check,
  Copy,
  Edit2,
  Film,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import {
  getAllProjectsFromDB,
  saveProjectToDB,
  deleteProjectFromDB,
  exportProjectToJson,
  parseProjectJson,
} from '../utils/storage';
import { createDefaultProject } from '../utils/sampleData';

export const ProjectManagerModal = () => {
  const {
    isProjectManagerOpen,
    setProjectManagerOpen,
    project: activeProject,
    setProject,
    updateProjectName,
  } = useEditorStore();

  const [projectsList, setProjectsList] = useState([]);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editNameValue, setEditNameValue] = useState('');
  const fileInputRef = useRef(null);

  const loadProjects = async () => {
    const list = await getAllProjectsFromDB();
    setProjectsList(list);
  };

  useEffect(() => {
    if (isProjectManagerOpen) {
      loadProjects();
    }
  }, [isProjectManagerOpen]);

  if (!isProjectManagerOpen) return null;

  const handleOpenProject = (proj) => {
    setProject(proj);
    setProjectManagerOpen(false);
  };

  const handleDeleteProject = async (id, e) => {
    e.stopPropagation();
    if (confirm('Delete this project permanently? This action cannot be undone.')) {
      await deleteProjectFromDB(id);
      loadProjects();
    }
  };

  const handleDuplicateProject = async (proj, e) => {
    e.stopPropagation();
    const duplicated = JSON.parse(JSON.stringify(proj));
    duplicated.id = 'proj_' + Date.now();
    duplicated.name = `${proj.name} (Copy)`;
    duplicated.updatedAt = Date.now();
    await saveProjectToDB(duplicated);
    await loadProjects();
  };

  const handleStartRename = (proj, e) => {
    e.stopPropagation();
    setEditingProjectId(proj.id);
    setEditNameValue(proj.name);
  };

  const handleSaveRename = async (proj, e) => {
    e.stopPropagation();
    if (editNameValue.trim()) {
      if (proj.id === activeProject.id) {
        updateProjectName(editNameValue.trim());
      }
      const updated = { ...proj, name: editNameValue.trim(), updatedAt: Date.now() };
      await saveProjectToDB(updated);
      await loadProjects();
    }
    setEditingProjectId(null);
  };

  const handleCreateNewProject = () => {
    const newProj = createDefaultProject();
    newProj.name = `Untitled Project ${projectsList.length + 1}`;
    setProject(newProj);
    setProjectManagerOpen(false);
  };

  const handleImportJson = async (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseProjectJson(file);
      setProject(parsed);
      setProjectManagerOpen(false);
    } catch (err) {
      alert(`Invalid ClipForge project file: ${err.message}`);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Compute thumbnail preview background or aspect badge
  const renderThumbnail = (proj) => {
    const ratio = proj.aspectRatio || '16:9';
    const isPortrait = ratio === '9:16';
    const isSquare = ratio === '1:1';
    const clipsCount = proj.tracks?.reduce((acc, t) => acc + (t.clips?.length || 0), 0) || 0;

    return (
      <div className="w-full h-24 rounded-[6px] bg-[#F0F0F0] dark:bg-[#151515] border border-[#E5E5E5] dark:border-[#282828] relative flex items-center justify-center overflow-hidden select-none">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#999_1px,transparent_1px)] [background-size:12px_12px]" />
        
        {/* Aspect ratio frame simulation */}
        <div
          className={`border border-[#D4D4D4] dark:border-[#383838] bg-white/60 dark:bg-[#202020]/60 rounded flex flex-col items-center justify-center p-1.5 transition-transform group-hover:scale-105 ${
            isPortrait
              ? 'w-10 h-16'
              : isSquare
              ? 'w-14 h-14'
              : 'w-24 h-14'
          }`}
        >
          <Film className="w-4 h-4 text-[#737373] dark:text-[#A1A1A1] opacity-60" strokeWidth={1.5} />
          <span className="text-[9px] font-mono text-[#737373] dark:text-[#A1A1A1] mt-0.5">{ratio}</span>
        </div>

        {/* Clip Count badge */}
        <div className="absolute bottom-1.5 right-1.5 bg-black/70 backdrop-blur-xs text-white text-[9px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1">
          <Layers className="w-2.5 h-2.5" strokeWidth={1.5} />
          <span>{clipsCount} clips</span>
        </div>

        {/* Duration badge */}
        <div className="absolute top-1.5 left-1.5 bg-black/70 backdrop-blur-xs text-white text-[9px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" strokeWidth={1.5} />
          <span>{proj.duration?.toFixed(1) || 0}s</span>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[8px] w-full max-w-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-[#171717] dark:text-[#EDEDED] transition-colors">
        {/* Header */}
        <div className="h-12 px-4 border-b border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center justify-between bg-[#FAFAFA] dark:bg-[#151515] shrink-0">
          <div className="flex items-center gap-2.5">
            <FolderOpen className="w-4 h-4 text-blue-500" strokeWidth={1.5} />
            <div>
              <h2 className="text-xs font-semibold text-[#171717] dark:text-[#EDEDED]">Projects Library</h2>
              <p className="text-[10px] text-[#737373] dark:text-[#A1A1A1] flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Autosaved every 5s • Instant Crash Recovery
              </p>
            </div>
          </div>
          <button
            onClick={() => setProjectManagerOpen(false)}
            className="p-1.5 text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] rounded-[4px] hover:bg-[#F0F0F0] dark:hover:bg-[#262626] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-4 py-2.5 border-b border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] flex items-center justify-between shrink-0 gap-2 flex-wrap">
          <button
            onClick={handleCreateNewProject}
            className="px-3 py-1.5 rounded-[6px] bg-[#171717] hover:bg-[#262626] text-white dark:bg-[#EDEDED] dark:hover:bg-white dark:text-[#171717] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={1.5} /> New Project
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportProjectToJson(activeProject)}
              className="px-2.5 py-1.5 rounded-[6px] bg-white dark:bg-[#1A1A1A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] border border-[#E5E5E5] dark:border-[#2A2A2A] text-xs font-medium text-[#171717] dark:text-[#EDEDED] flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Save active project as .json file to your computer"
            >
              <Download className="w-3.5 h-3.5 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} /> Export .json
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportJson}
              accept=".json"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 rounded-[6px] bg-white dark:bg-[#1A1A1A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] border border-[#E5E5E5] dark:border-[#2A2A2A] text-xs font-medium text-[#171717] dark:text-[#EDEDED] flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Load project from .json file"
            >
              <Upload className="w-3.5 h-3.5 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} /> Import .json
            </button>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#FAFAFA] dark:bg-[#111111]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Active project card */}
            <div className="p-3 rounded-[6px] border-2 border-blue-500 bg-white dark:bg-[#1A1A1A] flex flex-col justify-between gap-2.5 shadow-sm relative group">
              {/* Thumbnail */}
              {renderThumbnail(activeProject)}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <Check className="w-3 h-3" strokeWidth={2} /> Active Project
                  </span>
                  <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1] tabular-nums">
                    {formatDate(activeProject.updatedAt || Date.now())}
                  </span>
                </div>

                {editingProjectId === activeProject.id ? (
                  <div className="flex items-center gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editNameValue}
                      onChange={(e) => setEditNameValue(e.target.value)}
                      className="flex-1 text-xs bg-[#FAFAFA] dark:bg-[#151515] border border-blue-500 rounded px-1.5 py-0.5 outline-none"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename(activeProject, e);
                        if (e.key === 'Escape') setEditingProjectId(null);
                      }}
                    />
                    <button
                      type="button"
                      onClick={(e) => handleSaveRename(activeProject, e)}
                      className="p-1 bg-blue-500 text-white rounded cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <h3 className="text-xs font-semibold text-[#171717] dark:text-[#EDEDED] truncate flex items-center justify-between">
                    <span className="truncate">{activeProject.name}</span>
                    <button
                      type="button"
                      onClick={(e) => handleStartRename(activeProject, e)}
                      className="p-1 opacity-0 group-hover:opacity-100 hover:text-blue-500 transition-opacity cursor-pointer"
                      title="Rename"
                    >
                      <Edit2 className="w-3 h-3 text-[#737373]" />
                    </button>
                  </h3>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center justify-between text-[11px] text-[#737373] dark:text-[#A1A1A1]">
                <span className="tabular-nums font-mono text-[10px]">{activeProject.tracks?.length || 0} tracks</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => handleDuplicateProject(activeProject, e)}
                    className="p-1.5 hover:text-[#171717] dark:hover:text-[#EDEDED] rounded hover:bg-[#F0F0F0] dark:hover:bg-[#262626] transition-colors cursor-pointer"
                    title="Duplicate Project"
                  >
                    <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </div>

            {/* Other saved projects */}
            {projectsList
              .filter((p) => p.id !== activeProject.id)
              .map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => handleOpenProject(proj)}
                  className="p-3 rounded-[6px] border border-[#E5E5E5] dark:border-[#2A2A2A] hover:border-[#171717] dark:hover:border-[#EDEDED] bg-white dark:bg-[#1A1A1A] flex flex-col justify-between gap-2.5 cursor-pointer group transition-colors shadow-xs relative"
                >
                  {/* Thumbnail */}
                  {renderThumbnail(proj)}

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1] tabular-nums">
                        {formatDate(proj.updatedAt)}
                      </span>
                    </div>

                    {editingProjectId === proj.id ? (
                      <div className="flex items-center gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editNameValue}
                          onChange={(e) => setEditNameValue(e.target.value)}
                          className="flex-1 text-xs bg-[#FAFAFA] dark:bg-[#151515] border border-blue-500 rounded px-1.5 py-0.5 outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(proj, e);
                            if (e.key === 'Escape') setEditingProjectId(null);
                          }}
                        />
                        <button
                          type="button"
                          onClick={(e) => handleSaveRename(proj, e)}
                          className="p-1 bg-blue-500 text-white rounded cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <h3 className="text-xs font-medium text-[#171717] dark:text-[#EDEDED] group-hover:text-blue-500 truncate flex items-center justify-between">
                        <span className="truncate">{proj.name}</span>
                        <button
                          type="button"
                          onClick={(e) => handleStartRename(proj, e)}
                          className="p-1 opacity-0 group-hover:opacity-100 hover:text-blue-500 transition-opacity cursor-pointer"
                          title="Rename"
                        >
                          <Edit2 className="w-3 h-3 text-[#737373]" />
                        </button>
                      </h3>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center justify-between text-[11px] text-[#737373] dark:text-[#A1A1A1]">
                    <span className="tabular-nums font-mono text-[10px]">{proj.tracks?.length || 0} tracks</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => handleDuplicateProject(proj, e)}
                        className="p-1.5 hover:text-[#171717] dark:hover:text-[#EDEDED] rounded hover:bg-[#F0F0F0] dark:hover:bg-[#262626] transition-colors cursor-pointer"
                        title="Duplicate Project"
                      >
                        <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteProject(proj.id, e)}
                        className="p-1.5 hover:text-red-500 text-[#737373] dark:text-[#A1A1A1] rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                        title="Delete Project"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
