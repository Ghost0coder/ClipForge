import React, { useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { TopBar } from './components/TopBar';
import { LeftPanel } from './components/LeftPanel';
import { CenterPreview } from './components/CenterPreview';
import { RightInspector } from './components/RightInspector';
import { Timeline } from './components/Timeline';
import { ExportModal } from './components/ExportModal';
import { ProjectManagerModal } from './components/ProjectManagerModal';
import { ToastContainer } from './components/ToastContainer';
import { useEditorStore } from './store/editorStore';
import { saveProjectToDB, getProjectFromDB, getLastActiveProjectId, restoreProjectMediaUrls } from './utils/storage';

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
  } = useEditorStore();

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

  // Global Undo / Redo keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [undo, redo]);

  return (
    <div className="flex flex-col h-[100vh] h-screen max-h-[100vh] w-screen overflow-hidden bg-[#0b0c10] text-[#e2e4ec]">
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

      {/* Global Error & Notification Toasts */}
      <ToastContainer />

      {/* Vercel Web Analytics */}
      <Analytics />
    </div>
  );
}
