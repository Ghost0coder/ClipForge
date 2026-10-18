 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import React, { useEffect, useState, useRef } from 'react';
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
    const file = _optionalChain([e, 'access', _ => _.target, 'access', _2 => _2.files, 'optionalAccess', _3 => _3[0]]);
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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-[#141620] border border-[#272b3c] rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="h-12 px-5 border-b border-[#222638] flex items-center justify-between bg-[#10121a] shrink-0">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-bold text-white">Project Manager</h2>
          </div>
          <button
            onClick={() => setProjectManagerOpen(false)}
            className="p-1 text-slate-400 hover:text-white rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-5 py-3 border-b border-[#222638] bg-[#12141c] flex items-center justify-between shrink-0 gap-2">
          <button
            onClick={handleCreateNewProject}
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-violet-500/20"
          >
            <Plus className="w-3.5 h-3.5" /> New Project
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportProjectToJson(activeProject)}
              className="px-3 py-1.5 rounded-lg bg-[#1a1d29] hover:bg-[#232738] border border-[#272b3c] text-xs font-medium text-slate-300 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" /> Save JSON
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportJson}
              accept=".json"
              className="hidden"
            />
            <button
              onClick={() => _optionalChain([fileInputRef, 'access', _4 => _4.current, 'optionalAccess', _5 => _5.click, 'call', _6 => _6()])}
              className="px-3 py-1.5 rounded-lg bg-[#1a1d29] hover:bg-[#232738] border border-[#272b3c] text-xs font-medium text-slate-300 flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5 text-violet-400" /> Load JSON
            </button>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Active project card */}
            <div className="p-3.5 rounded-xl border-2 border-violet-500/60 bg-[#1a1733] flex flex-col justify-between gap-3 shadow-lg shadow-violet-500/10">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Currently Active
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-900/60 text-violet-200 border border-violet-500/30">
                    {activeProject.aspectRatio}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white truncate">{activeProject.name}</h3>
                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> {activeProject.duration.toFixed(1)}s duration
                </p>
              </div>

              <div className="pt-2 border-t border-violet-500/30 flex items-center justify-between text-[11px] text-slate-400">
                <span>{activeProject.tracks.length} tracks</span>
                <span className="text-slate-300">Autosaved</span>
              </div>
            </div>

            {/* Other saved projects */}
            {projectsList
              .filter((p) => p.id !== activeProject.id)
              .map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => handleOpenProject(proj)}
                  className="p-3.5 rounded-xl border border-[#272b3c] hover:border-slate-500 bg-[#181b26] flex flex-col justify-between gap-3 cursor-pointer group transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono text-slate-500">
                        {formatDate(proj.updatedAt)}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222738] text-slate-300">
                        {proj.aspectRatio}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-200 group-hover:text-white truncate">
                      {proj.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> {proj.duration.toFixed(1)}s duration
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#232738] flex items-center justify-between text-[11px] text-slate-500">
                    <span>{proj.tracks.length} tracks</span>
                    <button
                      onClick={(e) => handleDeleteProject(proj.id, e)}
                      className="p-1 hover:text-rose-400 text-slate-500 transition-colors"
                      title="Delete Project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
