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
} from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import {
  getAllProjectsFromDB,
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
  } = useEditorStore();

  const [projectsList, setProjectsList] = useState([]);
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
    if (confirm('Delete this project permanently?')) {
      await deleteProjectFromDB(id);
      loadProjects();
    }
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

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 select-none">
      <div className="bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] w-full max-w-2xl shadow-lg flex flex-col max-h-[80vh] overflow-hidden text-[#171717] dark:text-[#EDEDED] transition-colors">
        {/* Header */}
        <div className="h-11 px-4 border-b border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center justify-between bg-[#FAFAFA] dark:bg-[#151515] shrink-0">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} />
            <h2 className="text-xs font-medium text-[#171717] dark:text-[#EDEDED]">Project Manager</h2>
          </div>
          <button
            onClick={() => setProjectManagerOpen(false)}
            className="p-1 text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] rounded-[4px] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-4 py-2.5 border-b border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] flex items-center justify-between shrink-0 gap-2">
          <button
            onClick={handleCreateNewProject}
            className="px-3 py-1.5 rounded-[6px] bg-[#171717] hover:bg-[#262626] text-white dark:bg-[#EDEDED] dark:hover:bg-white dark:text-[#171717] text-xs font-normal flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={1.5} /> New Project
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportProjectToJson(activeProject)}
              className="px-2.5 py-1.5 rounded-[6px] bg-white dark:bg-[#1A1A1A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] border border-[#E5E5E5] dark:border-[#2A2A2A] text-xs font-normal text-[#171717] dark:text-[#EDEDED] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} /> Save JSON
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
              className="px-2.5 py-1.5 rounded-[6px] bg-white dark:bg-[#1A1A1A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] border border-[#E5E5E5] dark:border-[#2A2A2A] text-xs font-normal text-[#171717] dark:text-[#EDEDED] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} /> Load JSON
            </button>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#FAFAFA] dark:bg-[#111111]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Active project card */}
            <div className="p-3.5 rounded-[6px] border border-[#3B82F6] bg-white dark:bg-[#1A1A1A] flex flex-col justify-between gap-3 shadow-xs">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-normal text-[#3B82F6] flex items-center gap-1">
                    <Check className="w-3 h-3" strokeWidth={1.5} /> Currently Active
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-[#F5F5F5] dark:bg-[#222222] text-[#737373] dark:text-[#A1A1A1] border border-[#E5E5E5] dark:border-[#2A2A2A]">
                    {activeProject.aspectRatio}
                  </span>
                </div>
                <h3 className="text-xs font-medium text-[#171717] dark:text-[#EDEDED] truncate">{activeProject.name}</h3>
                <p className="text-[11px] text-[#737373] dark:text-[#A1A1A1] mt-1 flex items-center gap-1.5 tabular-nums">
                  <Clock className="w-3 h-3" strokeWidth={1.5} /> {activeProject.duration.toFixed(1)}s duration
                </p>
              </div>

              <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center justify-between text-[11px] text-[#737373] dark:text-[#A1A1A1]">
                <span className="tabular-nums">{activeProject.tracks.length} tracks</span>
                <span className="text-[#A3A3A3] dark:text-[#737373]">Autosaved</span>
              </div>
            </div>

            {/* Other saved projects */}
            {projectsList
              .filter((p) => p.id !== activeProject.id)
              .map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => handleOpenProject(proj)}
                  className="p-3.5 rounded-[6px] border border-[#E5E5E5] dark:border-[#2A2A2A] hover:border-[#171717] dark:hover:border-[#EDEDED] bg-white dark:bg-[#1A1A1A] flex flex-col justify-between gap-3 cursor-pointer group transition-colors shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1] tabular-nums">
                        {formatDate(proj.updatedAt)}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-[#F5F5F5] dark:bg-[#222222] text-[#737373] dark:text-[#A1A1A1] border border-[#E5E5E5] dark:border-[#2A2A2A]">
                        {proj.aspectRatio}
                      </span>
                    </div>
                    <h3 className="text-xs font-medium text-[#171717] dark:text-[#EDEDED] group-hover:text-[#3B82F6] truncate">
                      {proj.name}
                    </h3>
                    <p className="text-[11px] text-[#737373] dark:text-[#A1A1A1] mt-1 flex items-center gap-1.5 tabular-nums">
                      <Clock className="w-3 h-3" strokeWidth={1.5} /> {proj.duration.toFixed(1)}s duration
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center justify-between text-[11px] text-[#737373] dark:text-[#A1A1A1]">
                    <span className="tabular-nums">{proj.tracks.length} tracks</span>
                    <button
                      onClick={(e) => handleDeleteProject(proj.id, e)}
                      className="p-1 hover:text-red-500 text-[#737373] dark:text-[#A1A1A1] transition-colors cursor-pointer"
                      title="Delete Project"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
