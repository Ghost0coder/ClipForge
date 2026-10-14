import React, { useState } from 'react';
import {
  Undo2,
  Redo2,
  Monitor,
  Smartphone,
  Square,
  Image as ImageIcon,
  Tv,
  Magnet,
  Grid,
  ShieldCheck,
  FolderOpen,
  Sparkles,
  Download,
  Film,
  Edit2,
  Check,
} from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { AspectRatio, ASPECT_RATIOS } from '../types/editor';

export const TopBar: React.FC = () => {
  const {
    project,
    updateProjectName,
    setAspectRatio,
    undo,
    redo,
    undoStack,
    redoStack,
    snapping,
    toggleSnapping,
    magneticTimeline,
    toggleMagnetic,
    showSafeGuides,
    toggleSafeGuides,
    showGrid,
    toggleGrid,
    setExportModalOpen,
    setProjectManagerOpen,
    setActiveLeftTab,
  } = useEditorStore();

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(project.name);

  const handleSaveName = () => {
    if (tempName.trim()) {
      updateProjectName(tempName.trim());
    }
    setIsEditingName(false);
  };

  const getAspectIcon = (ratio: AspectRatio) => {
    switch (ratio) {
      case '16:9':
        return <Monitor className="w-3.5 h-3.5 text-violet-400" />;
      case '9:16':
        return <Smartphone className="w-3.5 h-3.5 text-cyan-400" />;
      case '1:1':
        return <Square className="w-3.5 h-3.5 text-emerald-400" />;
      case '4:5':
        return <ImageIcon className="w-3.5 h-3.5 text-amber-400" />;
      case '21:9':
        return <Tv className="w-3.5 h-3.5 text-rose-400" />;
    }
  };

  return (
    <header className="h-12 border-b border-[#222638] bg-[#12141c] px-4 flex items-center justify-between gap-4 select-none shrink-0 z-30">
      {/* Left: Brand & Project Name */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 pr-3 border-r border-[#222638]">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Film className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-base tracking-wide bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            ClipForge
          </span>
        </div>

        {/* Project Title Editor */}
        <div className="flex items-center gap-1.5 group">
          {isEditingName ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                autoFocus
                className="bg-[#181b26] border border-violet-500/50 rounded px-2 py-0.5 text-xs text-white outline-none w-44"
              />
              <button
                onClick={handleSaveName}
                className="p-1 hover:text-cyan-400 text-slate-400 transition-colors"
                title="Save Name"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => {
                setTempName(project.name);
                setIsEditingName(true);
              }}
              className="flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded hover:bg-[#1a1d29] transition-colors"
              title="Click to rename project"
            >
              <span className="text-xs font-medium text-slate-200 max-w-[180px] truncate">
                {project.name}
              </span>
              <Edit2 className="w-3 h-3 text-slate-500 group-hover:text-violet-400 transition-colors" />
            </div>
          )}
        </div>

        {/* Project Library Button */}
        <button
          onClick={() => setProjectManagerOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-400 hover:text-white hover:bg-[#1c202e] rounded-md transition-colors"
          title="Open Project Library"
        >
          <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden sm:inline">Projects</span>
        </button>
      </div>

      {/* Center: Undo/Redo & Aspect Ratio */}
      <div className="flex items-center gap-2">
        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5 bg-[#181b26] p-0.5 rounded-lg border border-[#232738]">
          <button
            onClick={undo}
            disabled={undoStack.length === 0}
            className={`p-1.5 rounded-md transition-colors ${
              undoStack.length > 0
                ? 'text-slate-300 hover:text-white hover:bg-[#232738]'
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            className={`p-1.5 rounded-md transition-colors ${
              redoStack.length > 0
                ? 'text-slate-300 hover:text-white hover:bg-[#232738]'
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Aspect Ratio Selector */}
        <div className="relative flex items-center bg-[#181b26] border border-[#232738] rounded-lg px-2 py-1 text-xs text-slate-300 gap-1.5">
          {getAspectIcon(project.aspectRatio)}
          <select
            value={project.aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
            className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer pr-1 font-medium"
          >
            {(Object.keys(ASPECT_RATIOS) as AspectRatio[]).map((ratio) => (
              <option key={ratio} value={ratio} className="bg-[#181b26] text-white">
                {ratio} {ratio === '9:16' ? '(Shorts/TikTok)' : ratio === '16:9' ? '(YouTube)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Viewport Guides: Safe-area & Grid */}
        <div className="hidden md:flex items-center gap-1 bg-[#181b26] p-0.5 rounded-lg border border-[#232738]">
          <button
            onClick={toggleSafeGuides}
            className={`p-1.5 rounded-md transition-colors ${
              showSafeGuides ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Safe Area Guides (TikTok/YouTube safe margins)"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={toggleGrid}
            className={`p-1.5 rounded-md transition-colors ${
              showGrid ? 'bg-violet-500/20 text-violet-400' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Rule-of-Thirds Grid"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={toggleSnapping}
            className={`p-1.5 rounded-md transition-colors ${
              snapping ? 'bg-violet-500/20 text-violet-400' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Timeline Snapping"
          >
            <Magnet className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right: AI Tools & Export */}
      <div className="flex items-center gap-2">
        {/* AI Creator Panel Trigger */}
        <button
          onClick={() => setActiveLeftTab('ai')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-950 to-indigo-950 border border-violet-500/30 text-violet-300 hover:text-white hover:border-violet-500/60 transition-all text-xs font-semibold shadow-sm"
          title="Open AI Creation Studio"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>AI Studio</span>
        </button>

        {/* Export Button */}
        <button
          onClick={() => setExportModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 text-white hover:opacity-95 shadow-md shadow-violet-600/25 transition-all text-xs font-bold"
          title="Export Video / Snapshot"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
