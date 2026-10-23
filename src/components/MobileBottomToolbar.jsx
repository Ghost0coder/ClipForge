import {
  Video,
  Music,
  Type,
  Smile,
  Zap,
  Palette,
  Shuffle,
  Subtitles,
  LayoutTemplate,
  Sparkles,
  Paintbrush,
} from 'lucide-react';
import { useEditorStore } from '../store/editorStore';

export const MobileBottomToolbar = () => {
  const {
    activeLeftTab,
    setActiveLeftTab,
    isMobileToolDrawerOpen,
    setMobileToolDrawerOpen,
    isDrawingMode,
    toggleDrawingMode,
  } = useEditorStore();

  const toolTabs = [
    { id: 'media', label: 'Media', icon: Video },
    { id: 'audio', label: 'Audio', icon: Music },
    { id: 'text', label: 'Text', icon: Type },
    { id: 'stickers', label: 'Stickers', icon: Smile },
    { id: 'draw', label: 'Draw', icon: Paintbrush },
    { id: 'effects', label: 'Effects', icon: Zap },
    { id: 'filters', label: 'Filters', icon: Palette },
    { id: 'transitions', label: 'Transitions', icon: Shuffle },
    { id: 'captions', label: 'Captions', icon: Subtitles },
    { id: 'templates', label: 'Templates', icon: LayoutTemplate },
    { id: 'ai', label: 'AI Studio', icon: Sparkles },
  ];

  const handleTabClick = (tabId) => {
    if (tabId === 'draw') {
      toggleDrawingMode();
      setMobileToolDrawerOpen(false);
      return;
    }
    if (activeLeftTab === tabId && isMobileToolDrawerOpen) {
      setMobileToolDrawerOpen(false);
    } else {
      setActiveLeftTab(tabId);
      setMobileToolDrawerOpen(true);
    }
  };

  return (
    <nav
      aria-label="Mobile Editing Tools"
      className="bg-white dark:bg-[#1A1A1A] border-t border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center overflow-x-auto px-2 py-1 shrink-0 z-30 pb-safe select-none no-scrollbar touch-pan-x transition-colors"
      style={{ minHeight: '56px' }}
    >
      <div className="flex items-center gap-1 min-w-full">
        {toolTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeLeftTab === tab.id && isMobileToolDrawerOpen;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex flex-col items-center justify-center min-w-[54px] min-h-[44px] px-2 py-1 rounded-[6px] transition-colors cursor-pointer relative ${
                isActive
                  ? 'bg-[#F5F5F5] dark:bg-[#262626] text-[#171717] dark:text-[#EDEDED]'
                  : 'text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] hover:bg-[#FAFAFA] dark:hover:bg-[#222222]'
              }`}
            >
              <Icon
                className={`w-4 h-4 mb-0.5 ${
                  isActive ? 'text-[#3B82F6]' : 'text-[#737373] dark:text-[#A1A1A1]'
                }`}
                strokeWidth={1.5}
              />
              <span className="text-[10px] font-normal tracking-normal whitespace-nowrap">
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0.5 left-3 right-3 h-[1.5px] bg-[#3B82F6] rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
