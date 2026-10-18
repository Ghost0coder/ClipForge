import React from 'react';
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
} from 'lucide-react';
import { useEditorStore } from '../store/editorStore';









export const MobileBottomToolbar = () => {
  const {
    activeLeftTab,
    setActiveLeftTab,
    isMobileToolDrawerOpen,
    setMobileToolDrawerOpen,
  } = useEditorStore();

  const toolTabs = [
    { id: 'media', label: 'Media', icon: Video, color: 'text-violet-400' },
    { id: 'audio', label: 'Audio', icon: Music, color: 'text-cyan-400' },
    { id: 'text', label: 'Text', icon: Type, color: 'text-pink-400' },
    { id: 'stickers', label: 'Stickers', icon: Smile, color: 'text-amber-400' },
    { id: 'effects', label: 'Effects', icon: Zap, color: 'text-indigo-400' },
    { id: 'filters', label: 'Filters', icon: Palette, color: 'text-emerald-400' },
    { id: 'transitions', label: 'Transitions', icon: Shuffle, color: 'text-purple-400' },
    { id: 'captions', label: 'Captions', icon: Subtitles, color: 'text-blue-400' },
    { id: 'templates', label: 'Templates', icon: LayoutTemplate, color: 'text-teal-400' },
    { id: 'ai', label: 'AI Studio', icon: Sparkles, color: 'text-rose-400', highlight: true },
  ];

  const handleTabClick = (tabId) => {
    if (activeLeftTab === tabId && isMobileToolDrawerOpen) {
      // Toggle close if already open
      setMobileToolDrawerOpen(false);
    } else {
      setActiveLeftTab(tabId );
      setMobileToolDrawerOpen(true);
    }
  };

  return (
    <nav
      aria-label="Mobile Editing Tools"
      className="bg-[#12141c] border-t border-[#222638] flex items-center overflow-x-auto px-2 py-1 shrink-0 z-30 pb-safe select-none no-scrollbar touch-pan-x"
      style={{ minHeight: '56px' }}
    >
      <div className="flex items-center gap-1.5 min-w-full">
        {toolTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeLeftTab === tab.id && isMobileToolDrawerOpen;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] px-2.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'bg-violet-950/70 border border-violet-500/50 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 active:bg-[#1a1d2b]'
              } ${tab.highlight ? 'relative' : ''}`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-violet-300 scale-110' : tab.color} transition-transform`} />
                {tab.highlight && !isActive && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                )}
              </div>
              <span className="text-[10px] font-medium tracking-tight whitespace-nowrap">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
