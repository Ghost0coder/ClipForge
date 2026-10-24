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
  Keyboard,
  Sun,
  Moon,
  HelpCircle,
} from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { ASPECT_RATIOS } from '../types/editor';
import { useResponsive } from '../utils/useResponsive';
import { PWAInstallButton } from './PWAInstallButton';

export const TopBar = () => {
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
    toggleShortcutsModal,
    openOnboarding,
    theme,
    toggleTheme,
  } = useEditorStore();

  const { isMobile } = useResponsive();

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(project.name);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSaveName = () => {
    if (tempName.trim()) {
      updateProjectName(tempName.trim());
    }
    setIsEditingName(false);
  };

  const getAspectIcon = (ratio) => {
    switch (ratio) {
      case '16:9':
        return <Monitor className="w-3.5 h-3.5 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} />;
      case '9:16':
        return <Smartphone className="w-3.5 h-3.5 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} />;
      case '1:1':
        return <Square className="w-3.5 h-3.5 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} />;
      case '4:5':
        return <ImageIcon className="w-3.5 h-3.5 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} />;
      case '21:9':
        return <Tv className="w-3.5 h-3.5 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} />;
      default:
        return <Monitor className="w-3.5 h-3.5 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} />;
    }
  };

  // MOBILE TOP BAR LAYOUT (< 768px or devMobilePreview)
  if (isMobile) {
    return (
      <>
        <header className="h-12 border-b border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] px-2 pt-safe flex items-center justify-between gap-1 select-none shrink-0 z-30 transition-colors">
          {/* Left: Projects Button & Project Name */}
          <div className="flex items-center gap-1 min-w-0">
            <button
              onClick={() => setProjectManagerOpen(true)}
              className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-[6px] text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] active:bg-[#F5F5F5] dark:active:bg-[#262626] transition-colors cursor-pointer"
              title="Open Project Library"
            >
              <FolderOpen className="w-4 h-4" strokeWidth={1.5} />
            </button>

            <span className="font-medium text-xs text-[#171717] dark:text-[#EDEDED] truncate max-w-[100px]">
              {project.name}
            </span>
          </div>

          {/* Center: Undo / Redo */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={undo}
              disabled={undoStack.length === 0}
              className={`flex items-center justify-center min-w-[44px] min-h-[44px] rounded-[6px] transition-colors ${
                undoStack.length > 0
                  ? 'text-[#171717] dark:text-[#EDEDED] active:bg-[#F5F5F5] dark:active:bg-[#262626]'
                  : 'text-[#A3A3A3] dark:text-[#555555] cursor-not-allowed opacity-50'
              }`}
              title="Undo"
            >
              <Undo2 className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <button
              onClick={redo}
              disabled={redoStack.length === 0}
              className={`flex items-center justify-center min-w-[44px] min-h-[44px] rounded-[6px] transition-colors ${
                redoStack.length > 0
                  ? 'text-[#171717] dark:text-[#EDEDED] active:bg-[#F5F5F5] dark:active:bg-[#262626]'
                  : 'text-[#A3A3A3] dark:text-[#555555] cursor-not-allowed opacity-50'
              }`}
              title="Redo"
            >
              <Redo2 className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>

          {/* Right: Theme Toggle, Export & Overflow Menu */}
          <div className="flex items-center gap-1">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-[6px] text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] active:bg-[#F5F5F5] dark:active:bg-[#262626] transition-colors cursor-pointer"
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" strokeWidth={1.5} /> : <Moon className="w-4 h-4" strokeWidth={1.5} />}
            </button>

            {/* Flat Primary Export */}
            <button
              onClick={() => setExportModalOpen(true)}
              className="flex items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-[6px] bg-[#171717] hover:bg-[#262626] text-white dark:bg-[#EDEDED] dark:hover:bg-white dark:text-[#171717] font-medium text-xs transition-colors cursor-pointer"
              title="Export Video"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Export</span>
            </button>

            {/* Overflow Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-[6px] text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] active:bg-[#F5F5F5] dark:active:bg-[#262626] transition-colors cursor-pointer"
              title="More Options"
            >
              <MoreVertical className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </header>

        {/* Mobile Overflow Menu Modal / Bottom Sheet */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
            <div className="w-full sm:max-w-md bg-white dark:bg-[#1A1A1A] border-t sm:border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-t-xl sm:rounded-[6px] p-5 shadow-lg space-y-4 max-h-[85vh] overflow-y-auto pb-safe">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5] dark:border-[#2A2A2A]">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#171717] dark:text-[#EDEDED]" strokeWidth={1.5} />
                  <h3 className="text-xs font-medium text-[#171717] dark:text-[#EDEDED]">Project & Canvas Settings</h3>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center min-w-[44px] min-h-[44px] text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] rounded-[6px] transition-colors"
                >
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>

              {/* Aspect Ratio Selector */}
              <div>
                <label className="text-xs font-normal text-[#737373] dark:text-[#A1A1A1] block mb-2">
                  Canvas Aspect Ratio
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.keys(ASPECT_RATIOS).map((ratio) => {
                    const isSelected = project.aspectRatio === ratio;
                    return (
                      <button
                        key={ratio}
                        onClick={() => setAspectRatio(ratio)}
                        className={`flex items-center gap-2 p-2.5 rounded-[6px] border text-xs font-normal transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#F5F5F5] dark:bg-[#262626] border-[#3B82F6] text-[#171717] dark:text-[#EDEDED]'
                            : 'bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] text-[#737373] dark:text-[#A1A1A1] hover:border-[#D4D4D4]'
                        }`}
                      >
                        {getAspectIcon(ratio)}
                        <span className="flex-1 text-left">{ratio}</span>
                        <span className="text-[10px] text-[#A3A3A3] dark:text-[#737373]">
                          {ratio === '9:16' ? 'TikTok' : ratio === '16:9' ? 'YouTube' : ratio === '1:1' ? 'Square' : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Viewport Guides & Snapping */}
              <div>
                <label className="text-xs font-normal text-[#737373] dark:text-[#A1A1A1] block mb-2">
                  Timeline & Guides
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={toggleSafeGuides}
                    className={`flex items-center justify-between p-2.5 rounded-[6px] border text-xs font-normal cursor-pointer ${
                      showSafeGuides
                        ? 'bg-blue-50 dark:bg-blue-950/30 border-[#3B82F6] text-[#3B82F6]'
                        : 'bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] text-[#737373] dark:text-[#A1A1A1]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.5} />
                      Safe Guides
                    </span>
                    <span className="text-[10px]">{showSafeGuides ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    onClick={toggleGrid}
                    className={`flex items-center justify-between p-2.5 rounded-[6px] border text-xs font-normal cursor-pointer ${
                      showGrid
                        ? 'bg-blue-50 dark:bg-blue-950/30 border-[#3B82F6] text-[#3B82F6]'
                        : 'bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] text-[#737373] dark:text-[#A1A1A1]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Grid className="w-3.5 h-3.5" strokeWidth={1.5} />
                      Rule of 3rds
                    </span>
                    <span className="text-[10px]">{showGrid ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    onClick={toggleSnapping}
                    className={`flex items-center justify-between p-2.5 rounded-[6px] border text-xs font-normal cursor-pointer ${
                      snapping
                        ? 'bg-blue-50 dark:bg-blue-950/30 border-[#3B82F6] text-[#3B82F6]'
                        : 'bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] text-[#737373] dark:text-[#A1A1A1]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Magnet className="w-3.5 h-3.5" strokeWidth={1.5} />
                      Snapping
                    </span>
                    <span className="text-[10px]">{snapping ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    onClick={toggleMagnetic}
                    className={`flex items-center justify-between p-2.5 rounded-[6px] border text-xs font-normal cursor-pointer ${
                      magneticTimeline
                        ? 'bg-blue-50 dark:bg-blue-950/30 border-[#3B82F6] text-[#3B82F6]'
                        : 'bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] text-[#737373] dark:text-[#A1A1A1]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Magnet className="w-3.5 h-3.5" strokeWidth={1.5} />
                      Magnetic
                    </span>
                    <span className="text-[10px]">{magneticTimeline ? 'ON' : 'OFF'}</span>
                  </button>
                </div>
              </div>

              {/* Project Rename Option */}
              <div className="pt-1">
                <label className="text-xs font-normal text-[#737373] dark:text-[#A1A1A1] block mb-1.5">
                  Rename Project
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="flex-1 bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] px-3 py-1.5 text-xs text-[#171717] dark:text-[#EDEDED] outline-none focus:border-[#171717] dark:focus:border-[#EDEDED]"
                  />
                  <button
                    onClick={handleSaveName}
                    className="px-3.5 py-1.5 bg-[#171717] hover:bg-[#262626] text-white dark:bg-[#EDEDED] dark:hover:bg-white dark:text-[#171717] text-xs font-medium rounded-[6px] cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>

              {/* Guided Tour / Help */}
              <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center justify-between">
                <span className="text-xs text-[#737373] dark:text-[#A1A1A1]">Guided Tour & Help</span>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    openOnboarding();
                  }}
                  className="px-2.5 py-1 rounded-[6px] border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#171717] dark:text-[#EDEDED] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-blue-500" strokeWidth={1.5} />
                  <span>5-Step Tour</span>
                </button>
              </div>

              {/* Keyboard Shortcuts Dialog */}
              <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center justify-between">
                <span className="text-xs text-[#737373] dark:text-[#A1A1A1]">Keyboard Shortcuts</span>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    toggleShortcutsModal();
                  }}
                  className="px-2.5 py-1 rounded-[6px] border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#171717] dark:text-[#EDEDED] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Keyboard className="w-3.5 h-3.5 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} />
                  <span>View All</span>
                </button>
              </div>

              {/* PWA Install */}
              <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center justify-between">
                <span className="text-xs text-[#737373] dark:text-[#A1A1A1]">Install ClipForge App</span>
                <PWAInstallButton compact />
              </div>

              {/* Dev Toggle if activated on desktop */}
              {devMobilePreview && (
                <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A]">
                  <button
                    onClick={() => {
                      toggleDevMobilePreview();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full py-2 rounded-[6px] border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#171717] dark:text-[#EDEDED] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-xs font-medium flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Laptop className="w-4 h-4 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} />
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

  // DESKTOP TOP BAR
  return (
    <header className="h-11 border-b border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] px-3 flex items-center justify-between gap-3 select-none shrink-0 z-30 transition-colors">
      {/* Left: Brand & Project Name */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 pr-3 border-r border-[#E5E5E5] dark:border-[#2A2A2A]">
          <div className="w-6 h-6 rounded-[6px] bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#171717] flex items-center justify-center">
            <Film className="w-3.5 h-3.5" strokeWidth={1.5} />
          </div>
          <span className="font-medium text-xs tracking-tight text-[#171717] dark:text-[#EDEDED]">
            ClipForge
          </span>
        </div>

        {/* Project Title Editor */}
        <div className="flex items-center gap-1 group">
          {isEditingName ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                autoFocus
                className="bg-white dark:bg-[#1A1A1A] border border-[#171717] dark:border-[#EDEDED] rounded-[6px] px-2 py-0.5 text-xs text-[#171717] dark:text-[#EDEDED] outline-none w-40"
              />
              <button
                onClick={handleSaveName}
                className="p-1 text-[#737373] hover:text-[#171717] dark:hover:text-[#EDEDED] transition-colors cursor-pointer"
                title="Save Name"
              >
                <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </div>
          ) : (
            <div
              onClick={() => {
                setTempName(project.name);
                setIsEditingName(true);
              }}
              className="flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded-[6px] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] transition-colors"
              title="Click to rename project"
            >
              <span className="text-xs font-normal text-[#171717] dark:text-[#EDEDED] max-w-[160px] truncate">
                {project.name}
              </span>
              <Edit2 className="w-3 h-3 text-[#A3A3A3] group-hover:text-[#737373] dark:group-hover:text-[#EDEDED] transition-colors" strokeWidth={1.5} />
            </div>
          )}
        </div>

        {/* Project Library Button */}
        <button
          onClick={() => setProjectManagerOpen(true)}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] rounded-[6px] transition-colors cursor-pointer"
          title="Open Project Library"
        >
          <FolderOpen className="w-3.5 h-3.5 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} />
          <span className="hidden sm:inline">Projects</span>
        </button>
      </div>

      {/* Center: Undo/Redo, Aspect Ratio & Viewport Guides */}
      <div className="flex items-center gap-2">
        {/* Undo / Redo */}
        <div className="flex items-center border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] p-0.5 bg-white dark:bg-[#1A1A1A]">
          <button
            onClick={undo}
            disabled={undoStack.length === 0}
            className={`p-1 rounded-[4px] transition-colors ${
              undoStack.length > 0
                ? 'text-[#171717] dark:text-[#EDEDED] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] cursor-pointer'
                : 'text-[#D4D4D4] dark:text-[#444444] cursor-not-allowed'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            className={`p-1 rounded-[4px] transition-colors ${
              redoStack.length > 0
                ? 'text-[#171717] dark:text-[#EDEDED] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] cursor-pointer'
                : 'text-[#D4D4D4] dark:text-[#444444] cursor-not-allowed'
            }`}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Aspect Ratio Selector */}
        <div className="relative flex items-center bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] px-2 py-1 text-xs gap-1.5">
          {getAspectIcon(project.aspectRatio)}
          <select
            value={project.aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
            className="bg-transparent text-xs text-[#171717] dark:text-[#EDEDED] outline-none cursor-pointer pr-1 font-normal"
          >
            {Object.keys(ASPECT_RATIOS).map((ratio) => (
              <option key={ratio} value={ratio} className="bg-white dark:bg-[#1A1A1A] text-[#171717] dark:text-[#EDEDED]">
                {ratio} {ratio === '9:16' ? '(Shorts/TikTok)' : ratio === '16:9' ? '(YouTube)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Viewport Guides: Safe-area & Grid */}
        <div className="hidden md:flex items-center gap-0.5 border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] p-0.5 bg-white dark:bg-[#1A1A1A]">
          <button
            onClick={toggleSafeGuides}
            className={`p-1 rounded-[4px] transition-colors cursor-pointer ${
              showSafeGuides ? 'bg-blue-50 dark:bg-blue-950/40 text-[#3B82F6]' : 'text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED]'
            }`}
            title="Toggle Safe Area Guides"
          >
            <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
          <button
            onClick={toggleGrid}
            className={`p-1 rounded-[4px] transition-colors cursor-pointer ${
              showGrid ? 'bg-blue-50 dark:bg-blue-950/40 text-[#3B82F6]' : 'text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED]'
            }`}
            title="Toggle Rule-of-Thirds Grid"
          >
            <Grid className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
          <button
            onClick={toggleSnapping}
            className={`p-1 rounded-[4px] transition-colors cursor-pointer ${
              snapping ? 'bg-blue-50 dark:bg-blue-950/40 text-[#3B82F6]' : 'text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED]'
            }`}
            title="Timeline Snapping (N)"
          >
            <Magnet className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
          <button
            onClick={toggleShortcutsModal}
            className="p-1 rounded-[4px] transition-colors text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] cursor-pointer"
            title="Keyboard Shortcuts (?)"
          >
            <Keyboard className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
          <button
            onClick={openOnboarding}
            className="p-1 rounded-[4px] transition-colors text-[#737373] dark:text-[#A1A1A1] hover:text-blue-500 dark:hover:text-blue-400 cursor-pointer"
            title="Interactive Studio Tour (5 Steps)"
          >
            <HelpCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Right: Dark Mode Toggle, Dev Toggle, PWA, AI Tools & Export */}
      <div className="flex items-center gap-2">
        {/* Optional Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-[6px] border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] transition-colors cursor-pointer"
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5" strokeWidth={1.5} /> : <Moon className="w-3.5 h-3.5" strokeWidth={1.5} />}
        </button>

        {/* Dev toggle to preview mobile layout in desktop browser */}
        <button
          onClick={toggleDevMobilePreview}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-[6px] border text-xs font-normal transition-colors cursor-pointer ${
            devMobilePreview
              ? 'bg-blue-50 dark:bg-blue-950/40 border-[#3B82F6] text-[#3B82F6]'
              : 'border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED]'
          }`}
          title="Toggle Mobile View Preview in Desktop Browser"
        >
          <Smartphone className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span className="hidden xl:inline">{devMobilePreview ? 'Desktop' : 'Mobile'}</span>
        </button>

        {/* PWA Install Button */}
        <PWAInstallButton />

        {/* AI Studio Panel Trigger - Clean flat secondary button */}
        <button
          onClick={() => setActiveLeftTab('ai')}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] text-[#171717] dark:text-[#EDEDED] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] transition-colors text-xs font-normal cursor-pointer"
          title="Open AI Creation Studio"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} />
          <span>AI Studio</span>
        </button>

        {/* Export Button - Clean flat solid charcoal primary button */}
        <button
          onClick={() => setExportModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-[6px] bg-[#171717] hover:bg-[#262626] text-white dark:bg-[#EDEDED] dark:hover:bg-white dark:text-[#171717] transition-colors text-xs font-medium cursor-pointer"
          title="Export Video / Snapshot"
        >
          <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
