import React, { useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { LeftPanel } from './components/LeftPanel';
import { CenterPreview } from './components/CenterPreview';
import { RightInspector } from './components/RightInspector';
import { Timeline } from './components/Timeline';
import { ExportModal } from './components/ExportModal';
import { ProjectManagerModal } from './components/ProjectManagerModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { ToastContainer } from './components/ToastContainer';
import { MobileBottomToolbar } from './components/MobileBottomToolbar';
import { useEditorStore } from './store/editorStore';
import { saveProjectToDB, getProjectFromDB, getLastActiveProjectId, restoreProjectMediaUrls } from './utils/storage';
import { useResponsive } from './utils/useResponsive';
import { useHotkeyManager } from './utils/useHotkeyManager';

export default function App() {
  const {
    project,
    setProject,
    leftPanelCollapsed,
    rightInspectorCollapsed,
    toggleLeftPanel,
    toggleRightInspector,
    undo,
    redo,
    isMobileToolDrawerOpen,
    setMobileToolDrawerOpen,
    isMobileInspectorOpen,
    setMobileInspectorOpen,
    selectedClipIds,
    deselectAll,
  } = useEditorStore();

  const { isMobile } = useResponsive();

  // On initial mount, attempt to recover last active project from IndexedDB
  useEffect(() => {
    async function initStorage() {
      try {
        const lastId = await getLastActiveProjectId();
        if (lastId) {
          const saved = await getProjectFromDB(lastId);
          // Only restore if user had actual non-demo project
          if (saved) {
            const hasOldDemoClips = saved.tracks.some((t) =>
              t.clips.some((c) =>
                c.id.startsWith('clip_demo') ||
                c.id === 'clip_video_1' ||
                c.id === 'clip_video_2' ||
                c.id === 'clip_audio_1' ||
                c.id === 'clip_text_1' ||
                c.id === 'clip_sticker_1' ||
                c.name.toLowerCase().includes('demo') ||
                c.name.toLowerCase().includes('cyberpunk') ||
                c.name.toLowerCase().includes('tokyo') ||
                c.name.toLowerCase().includes('synthwave')
              )
            );
            if (!hasOldDemoClips && saved.tracks.some((t) => t.clips.length > 0)) {
              console.log('[ClipForge:Storage] Restoring saved project from IndexedDB:', saved.name);
              const restored = await restoreProjectMediaUrls(saved);
              setProject(restored);
              window.dispatchEvent(new CustomEvent('clipforge:redraw'));
            }
          }
        }
      } catch (err) {
        console.warn('Initial project restore error:', err);
      }
    }
    initStorage();
  }, [setProject]);

  // Periodic autosave every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      saveProjectToDB(project);
    }, 5000);

    return () => clearInterval(timer);
  }, [project]);

  // Initialize global hotkey manager (Space play/pause, Delete clips, Ctrl+Z undo/redo, etc.)
  useHotkeyManager();

  // MOBILE LAYOUT (< 768px or devMobilePreview)
  if (isMobile) {
    return (
      <div className="flex flex-col h-[100dvh] max-h-[100dvh] w-screen overflow-hidden bg-[#0b0c10] text-[#e2e4ec] select-none touch-manipulation overscroll-none">
        {/* Compact Top Bar */}
        <TopBar />

        {/* Preview Player (fixed ~35-40% of screen height) */}
        <div className="h-[38%] min-h-[190px] max-h-[42%] flex flex-col overflow-hidden shrink-0 relative bg-black/40">
          <CenterPreview />
        </div>

        {/* Multi-Track Timeline (~25% of screen height) */}
        <div className="flex-1 min-h-[150px] flex flex-col overflow-hidden relative">
          <Timeline />
        </div>

        {/* Bottom Tool Bar (Media, Audio, Text, Stickers, Effects, Filters, Transitions, Captions, AI) */}
        <MobileBottomToolbar />

        {/* Bottom Sheet Drawer for Tools (~50% height, draggable, closable) */}
        {isMobileToolDrawerOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <div
              onClick={() => setMobileToolDrawerOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity"
            />
            <div className="relative z-10 w-full h-[52vh] max-h-[80vh] bg-[#141620] border-t border-[#272b3c] rounded-t-3xl shadow-2xl flex flex-col overflow-hidden pb-safe">
              <LeftPanel mobileDrawer onClose={() => setMobileToolDrawerOpen(false)} />
            </div>
          </div>
        )}

        {/* Bottom Sheet for Inspector (opens automatically when clip is selected and closes when deselected) */}
        {isMobileInspectorOpen && selectedClipIds.length > 0 && !isMobileToolDrawerOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <div
              onClick={() => {
                deselectAll();
                setMobileInspectorOpen(false);
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity"
            />
            <div className="relative z-10 w-full h-[52vh] max-h-[80vh] bg-[#141620] border-t border-violet-500/40 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden pb-safe">
              <RightInspector
                mobileDrawer
                onClose={() => {
                  deselectAll();
                  setMobileInspectorOpen(false);
                }}
              />
            </div>
          </div>
        )}

        {/* Modal Dialogs */}
        <ExportModal />
        <ProjectManagerModal />
        <KeyboardShortcutsModal />

        {/* Global Error & Notification Toasts */}
        <ToastContainer />
      </div>
    );
  }

  // DESKTOP & TABLET LAYOUT (>= 1024px desktop unchanged)
  return (
    <div className="flex flex-col h-[100dvh] h-screen max-h-[100dvh] w-screen overflow-hidden bg-[#0b0c10] text-[#e2e4ec]">
      {/* Top Bar */}
      <TopBar />

      {/* Main Workspace Split: Left Tab Drawer + Center Canvas Preview + Right Inspector */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {!leftPanelCollapsed && <LeftPanel />}
        
        {/* Left panel collapse toggle tab */}
        <button
          onClick={toggleLeftPanel}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-40 bg-[#1e2233] hover:bg-violet-600 text-slate-400 hover:text-white p-1 rounded-r-md border-r border-y border-[#2a2f46] text-[10px] shadow-md transition-all cursor-pointer opacity-70 hover:opacity-100"
          style={{ left: leftPanelCollapsed ? '0px' : undefined }}
          title={leftPanelCollapsed ? 'Expand Tools Panel' : 'Collapse Tools Panel'}
        >
          {leftPanelCollapsed ? '▶' : '◀'}
        </button>

        <CenterPreview />

        {/* Right inspector collapse toggle tab */}
        <button
          onClick={toggleRightInspector}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-40 bg-[#1e2233] hover:bg-violet-600 text-slate-400 hover:text-white p-1 rounded-l-md border-l border-y border-[#2a2f46] text-[10px] shadow-md transition-all cursor-pointer opacity-70 hover:opacity-100"
          style={{ right: rightInspectorCollapsed ? '0px' : undefined }}
          title={rightInspectorCollapsed ? 'Expand Inspector' : 'Collapse Inspector'}
        >
          {rightInspectorCollapsed ? '◀' : '▶'}
        </button>

        {!rightInspectorCollapsed && <RightInspector />}
      </div>

      {/* Multi-Track Timeline */}
      <Timeline />

      {/* Modal Dialogs */}
      <ExportModal />
      <ProjectManagerModal />
      <KeyboardShortcutsModal />

      {/* Global Error & Notification Toasts */}
      <ToastContainer />
    </div>
  );
}
