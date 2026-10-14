import React, { useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { LeftPanel } from './components/LeftPanel';
import { CenterPreview } from './components/CenterPreview';
import { RightInspector } from './components/RightInspector';
import { Timeline } from './components/Timeline';
import { ExportModal } from './components/ExportModal';
import { ProjectManagerModal } from './components/ProjectManagerModal';
import { useEditorStore } from './store/editorStore';
import { saveProjectToDB, getProjectFromDB, getLastActiveProjectId } from './utils/storage';

export default function App() {
  const {
    project,
    setProject,
    leftPanelCollapsed,
    rightInspectorCollapsed,
    toggleLeftPanel,
    toggleRightInspector,
  } = useEditorStore();

  // On initial mount, attempt to recover last active project from IndexedDB
  useEffect(() => {
    async function initStorage() {
      try {
        const lastId = await getLastActiveProjectId();
        if (lastId) {
          const saved = await getProjectFromDB(lastId);
          if (saved) {
            setProject(saved);
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

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0b0c10] text-[#e2e4ec]">
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
    </div>
  );
}
