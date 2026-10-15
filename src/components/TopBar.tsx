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
  MoreVertical,
  X,
  Sliders,
  Laptop,
} from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { AspectRatio, ASPECT_RATIOS } from '../types/editor';
import { useResponsive } from '../utils/useResponsive';
import { PWAInstallButton } from './PWAInstallButton';

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
    devMobilePreview,
    toggleDevMobilePreview,
  } = useEditorStore();

  const { isMobile, isDesktop } = useResponsive();

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(project.name);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // MOBILE TOP BAR LAYOUT (< 768px or devMobilePreview)
  if (isMobile) {
    return (
      <>
        <header className="h-13 border-b border-[#222638] bg-[#12141c] px-2 pt-safe flex items-center justify-between gap-1 select-none shrink-0 z-30">
          {/* Left: Back / Projects Button & Logo */}
          <div className="flex items-center gap-1 min-w-0">
            <button
              onClick={() => setProjectManagerOpen(true)}
              className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl text-slate-300 hover:text-white active:bg-[#1a1d2b] transition-colors cursor-pointer"
              title="Open Project Library"
            >
              <FolderOpen className="w-5 h-5 text-violet-400" />
            </button>

            <div className="flex items-center gap-1.5 min-w-0 pr-1">
              <span className="font-bold text-xs bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent truncate max-w-[100px]">
                {project.name}
              </span>
            </div>
          </div>

          {/* Center: Undo / Redo (44x44px touch targets) */}
          <div className="flex items-center gap-1">
            <button
              onClick={undo}
              disabled={undoStack.length === 0}
              className={`flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl transition-colors ${
                undoStack.length > 0
                  ? 'text-slate-200 active:bg-[#232738]'
                  : 'text-slate-600 cursor-not-allowed opacity-50'
              }`}
              title="Undo"
            >
              <Undo2 className="w-5 h-5" />
            </button>
            <button
              onClick={redo}
              disabled={redoStack.length === 0}
              className={`flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl transition-colors ${
                redoStack.length > 0
                  ? 'text-slate-200 active:bg-[#232738]'
                  : 'text-slate-600 cursor-not-allowed opacity-50'
              }`}
              title="Redo"
            >
              <Redo2 className="w-5 h-5" />
            </button>
          </div>

          {/* Right: Export & Overflow Menu */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setExportModalOpen(true)}
              className="flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 active:opacity-90 text-white font-bold text-xs shadow-md shadow-violet-600/30 transition-all cursor-pointer"
              title="Export Video"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>

            {/* Overflow Menu Button (44x44px) */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl text-slate-300 hover:text-white active:bg-[#1a1d2b] transition-colors cursor-pointer"
              title="More Options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Mobile Overflow Menu Modal / Bottom Sheet */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
            <div className="w-full sm:max-w-md bg-[#141622] border-t sm:border border-[#272b3c] rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto pb-safe">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#232738]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-600 to-cyan-400 flex items-center justify-center">
                    <Sliders className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Project & Canvas Settings</h3>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center min-w-[44px] min-h-[44px] text-slate-400 hover:text-white rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Aspect Ratio Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-2">
                  Canvas Aspect Ratio
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(ASPECT_RATIOS) as AspectRatio[]).map((ratio) => {
                    const isSelected = project.aspectRatio === ratio;
                    return (
                      <button
                        key={ratio}
                        onClick={() => {
                          setAspectRatio(ratio);
                        }}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-violet-950/70 border-violet-500 text-white shadow-md'
                            : 'bg-[#181b26] border-[#252a3b] text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        {getAspectIcon(ratio)}
                        <span className="flex-1 text-left">{ratio}</span>
                        <span className="text-[10px] text-slate-400">
                          {ratio === '9:16' ? 'TikTok' : ratio === '16:9' ? 'YouTube' : ratio === '1:1' ? 'Square' : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Viewport Guides & Snapping */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-2">
                  Timeline & Viewport Guides
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={toggleSafeGuides}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-medium cursor-pointer ${
                      showSafeGuides
                        ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-200'
                        : 'bg-[#181b26] border-[#252a3b] text-slate-400'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-cyan-400" />
                      Safe Guides
                    </span>
                    <span className="text-[10px] font-bold">{showSafeGuides ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    onClick={toggleGrid}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-medium cursor-pointer ${
                      showGrid
                        ? 'bg-violet-950/60 border-violet-500/60 text-violet-200'
                        : 'bg-[#181b26] border-[#252a3b] text-slate-400'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Grid className="w-4 h-4 text-violet-400" />
                      Rule of 3rds
                    </span>
                    <span className="text-[10px] font-bold">{showGrid ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    onClick={toggleSnapping}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-medium cursor-pointer ${
                      snapping
                        ? 'bg-violet-950/60 border-violet-500/60 text-violet-200'
                        : 'bg-[#181b26] border-[#252a3b] text-slate-400'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Magnet className="w-4 h-4 text-violet-400" />
                      Snapping
                    </span>
                    <span className="text-[10px] font-bold">{snapping ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    onClick={toggleMagnetic}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-medium cursor-pointer ${
                      magneticTimeline
                        ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-200'
                        : 'bg-[#181b26] border-[#252a3b] text-slate-400'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Magnet className="w-4 h-4 text-cyan-400" />
                      Magnetic
                    </span>
                    <span className="text-[10px] font-bold">{magneticTimeline ? 'ON' : 'OFF'}</span>
                  </button>
                </div>
              </div>

              {/* Project Rename Option */}
              <div className="pt-1">
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Rename Project
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="flex-1 bg-[#181b26] border border-[#2a3045] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-violet-500"
                  />
                  <button
                    onClick={handleSaveName}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-xs font-bold text-white rounded-xl cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>

              {/* PWA Install */}
              <div className="pt-2 border-t border-[#232738] flex items-center justify-between">
                <span className="text-xs text-slate-300 font-medium">Install ClipForge App</span>
                <PWAInstallButton compact />
              </div>

              {/* Dev Toggle if activated on desktop */}
              {devMobilePreview && (
                <div className="pt-2 border-t border-[#232738]">
                  <button
                    onClick={() => {
                      toggleDevMobilePreview();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full py-2.5 rounded-xl border border-cyan-500/40 bg-cyan-950/30 text-cyan-200 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Laptop className="w-4 h-4" />
                    <span>Switch Back to Desktop Layout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </>
    );
  }

  // DESKTOP TOP BAR (screens wider than 1024px, completely unchanged from original + dev toggle)
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

      {/* Right: Dev Toggle, PWA Install, AI Tools & Export */}
      <div className="flex items-center gap-2">
        {/* Dev toggle to preview mobile layout in the desktop browser */}
        <button
          onClick={toggleDevMobilePreview}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
            devMobilePreview
              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
              : 'border-[#272b3c] bg-[#181b26] text-slate-300 hover:border-violet-500/50 hover:text-white'
          }`}
          title="Toggle Mobile View Preview in Desktop Browser"
        >
          <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden xl:inline">{devMobilePreview ? 'Desktop Mode' : 'Mobile Preview'}</span>
        </button>

        {/* PWA Install Button */}
        <PWAInstallButton />

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
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 text-white hover:opacity-95 shadow-md shadow-violet-600/25 transition-all text-xs font-bold cursor-pointer"
          title="Export Video / Snapshot"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
