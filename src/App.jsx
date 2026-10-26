import React, { useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { TopBar } from './components/TopBar';
import { LeftPanel } from './components/LeftPanel';
import { CenterPreview } from './components/CenterPreview';
import { RightInspector } from './components/RightInspector';
import { Timeline } from './components/Timeline';
import { ExportModal } from './components/ExportModal';
import { ProjectManagerModal } from './components/ProjectManagerModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { OnboardingModal } from './components/OnboardingModal';
import { TemplateModal } from './components/TemplateModal';
import { AudioMixerModal } from './components/AudioMixerModal';
import { ToastContainer } from './components/ToastContainer';
import { MobileBottomToolbar } from './components/MobileBottomToolbar';
import { AppNavigation } from './components/AppNavigation';
import { HomePage } from './components/HomePage';
import { ProjectsPage } from './components/ProjectsPage';
import { TemplatesPage } from './components/TemplatesPage';
import { AssetsPage } from './components/AssetsPage';
import { SettingsPage } from './components/SettingsPage';
import { HelpPage } from './components/HelpPage';
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
    isOnboardingOpen,
    closeOnboarding,
    route,
  } = useEditorStore();

  const { isMobile } = useResponsive();

  // On initial mount, attempt to recover last active project from IndexedDB
  useEffect(() => {
    async function initStorage() {
      try {
        const lastId = await getLastActiveProjectId();
        if (lastId) {
          const saved = await getProjectFromDB(lastId);
          if (saved) {
            const hasOldDemoClips = saved.tracks.some((t) =>
              t.clips.some((c) =>
                c.id.startsWith('clip_demo') ||
                c.id === 'clip_video_1' ||
                c.id === 'clip_video_2' ||
                c.name.toLowerCase().includes('demo')
              )
            );
            if (!hasOldDemoClips && saved.tracks.some((t) => t.clips.length > 0)) {
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

  // Periodic autosave every 5 seconds when in editor
  useEffect(() => {
    if (route !== 'editor') return;
    const timer = setInterval(() => {
      saveProjectToDB(project);
    }, 5000);

    return () => clearInterval(timer);
  }, [project, route]);

  // Initialize global hotkey manager
  useHotkeyManager();

  // If NOT in editor view, render Home / Projects / Templates / Assets / Settings / Help with AppNavigation shell
  if (route !== 'editor') {
    return (
      <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} h-[100dvh] h-screen max-h-[100dvh] w-screen overflow-hidden bg-[#FAFAFA] dark:bg-[#111111] text-[#171717] dark:text-[#EDEDED] font-sans select-none`}>
        {/* Navigation Sidebar / Bottom Bar */}
        <AppNavigation />

        {/* Active Page Route */}
        <main className={`flex-1 flex flex-col overflow-hidden relative ${!isMobile ? 'pl-14' : ''}`}>
          {route === 'home' && <HomePage />}
          {route === 'projects' && <ProjectsPage />}
          {route === 'templates' && <TemplatesPage />}
          {route === 'assets' && <AssetsPage />}
          {route === 'settings' && <SettingsPage />}
          {route === 'help' && <HelpPage />}
        </main>

        {/* Global Modals & Toasts */}
        <OnboardingModal isOpen={isOnboardingOpen} onClose={closeOnboarding} />
        <KeyboardShortcutsModal />
        <ToastContainer />
        <Analytics />
      </div>
    );
  }

  // MOBILE EDITOR LAYOUT
  if (isMobile) {
    return (
      <div className="flex flex-col h-[100dvh] max-h-[100dvh] w-screen overflow-hidden bg-[#FAFAFA] dark:bg-[#111111] text-[#171717] dark:text-[#EDEDED] select-none touch-manipulation overscroll-none font-sans">
        <TopBar />

        {/* Preview Player */}
        <div className="h-[38%] min-h-[190px] max-h-[42%] flex flex-col overflow-hidden shrink-0 relative bg-[#F0F0F0] dark:bg-[#0D0D0D]">
          <CenterPreview />
        </div>

        {/* Multi-Track Timeline */}
        <div className="flex-1 min-h-[150px] flex flex-col overflow-hidden relative">
          <Timeline />
        </div>

        <MobileBottomToolbar />

        {isMobileToolDrawerOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <div
              onClick={() => setMobileToolDrawerOpen(false)}
              className="absolute inset-0 bg-black/40 transition-opacity"
            />
            <div className="relative z-10 w-full h-[52vh] max-h-[80vh] bg-white dark:bg-[#1A1A1A] border-t border-[#E5E5E5] dark:border-[#2A2A2A] rounded-t-xl shadow-lg flex flex-col overflow-hidden pb-safe">
              <LeftPanel mobileDrawer onClose={() => setMobileToolDrawerOpen(false)} />
            </div>
          </div>
        )}

        {isMobileInspectorOpen && selectedClipIds.length > 0 && !isMobileToolDrawerOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <div
              onClick={() => {
                deselectAll();
                setMobileInspectorOpen(false);
              }}
              className="absolute inset-0 bg-black/40 transition-opacity"
            />
            <div className="relative z-10 w-full h-[52vh] max-h-[80vh] bg-white dark:bg-[#1A1A1A] border-t border-[#E5E5E5] dark:border-[#2A2A2A] rounded-t-xl shadow-lg flex flex-col overflow-hidden pb-safe">
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

        <ExportModal />
        <ProjectManagerModal />
        <KeyboardShortcutsModal />
        <OnboardingModal isOpen={isOnboardingOpen} onClose={closeOnboarding} />
        <TemplateModal />
        <ToastContainer />
        <Analytics />
      </div>
    );
  }

  // DESKTOP & TABLET EDITOR LAYOUT
  return (
    <div className="flex flex-col h-[100dvh] h-screen max-h-[100dvh] w-screen overflow-hidden bg-[#FAFAFA] dark:bg-[#111111] text-[#171717] dark:text-[#EDEDED] font-sans">
      <TopBar />

      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {!leftPanelCollapsed && <LeftPanel />}
        
        <button
          onClick={toggleLeftPanel}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-40 bg-white dark:bg-[#1A1A1A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] p-1 rounded-r-[6px] border-r border-y border-[#E5E5E5] dark:border-[#2A2A2A] text-[10px] shadow-sm transition-all cursor-pointer opacity-80 hover:opacity-100"
          style={{ left: leftPanelCollapsed ? '0px' : undefined }}
          title={leftPanelCollapsed ? 'Expand Tools Panel' : 'Collapse Tools Panel'}
        >
          {leftPanelCollapsed ? '▶' : '◀'}
        </button>

        <CenterPreview />

        <button
          onClick={toggleRightInspector}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-40 bg-white dark:bg-[#1A1A1A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] p-1 rounded-l-[6px] border-l border-y border-[#E5E5E5] dark:border-[#2A2A2A] text-[10px] shadow-sm transition-all cursor-pointer opacity-80 hover:opacity-100"
          style={{ right: rightInspectorCollapsed ? '0px' : undefined }}
          title={rightInspectorCollapsed ? 'Expand Inspector' : 'Collapse Inspector'}
        >
          {rightInspectorCollapsed ? '◀' : '▶'}
        </button>

        {!rightInspectorCollapsed && <RightInspector />}
      </div>

      <Timeline />

      <ExportModal />
      <ProjectManagerModal />
      <KeyboardShortcutsModal />
      <OnboardingModal isOpen={isOnboardingOpen} onClose={closeOnboarding} />
      <TemplateModal />
      <AudioMixerModal />
      <ToastContainer />
      <Analytics />
    </div>
  );
}
