import React, { useState } from 'react';
import { X, Keyboard, Search } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { HOTKEY_DEFINITIONS } from '../utils/useHotkeyManager';

export const KeyboardShortcutsModal = () => {
  const { isShortcutsModalOpen, setShortcutsModalOpen } = useEditorStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  if (!isShortcutsModalOpen) return null;

  const categories = ['all', ...HOTKEY_DEFINITIONS.map((g) => g.category)];

  const filteredGroups = HOTKEY_DEFINITIONS.map((group) => {
    if (selectedCategory !== 'all' && group.category !== selectedCategory) {
      return null;
    }
    const filteredShortcuts = group.shortcuts.filter((s) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchDesc = s.description.toLowerCase().includes(q);
      const matchKeys = s.keys.some((k) => k.toLowerCase().includes(q));
      return matchDesc || matchKeys;
    });

    if (filteredShortcuts.length === 0) return null;
    return {
      ...group,
      shortcuts: filteredShortcuts,
    };
  }).filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] shadow-lg overflow-hidden flex flex-col max-h-[85vh] text-[#171717] dark:text-[#EDEDED] transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#FAFAFA] dark:bg-[#151515]">
          <div className="flex items-center gap-2.5">
            <Keyboard className="w-4 h-4 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} />
            <div>
              <h2 className="text-xs font-medium text-[#171717] dark:text-[#EDEDED] flex items-center gap-2">
                Keyboard Shortcuts
                <span className="text-[10px] font-normal text-[#737373] dark:text-[#A1A1A1] px-1.5 py-0.5 rounded-[4px] bg-[#F5F5F5] dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#2A2A2A]">
                  Desktop Controls
                </span>
              </h2>
            </div>
          </div>
          <button
            onClick={() => setShortcutsModalOpen(false)}
            className="p-1 text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] rounded-[4px] transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-4 py-2.5 border-b border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] flex flex-col sm:flex-row items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} />
            <input
              type="text"
              placeholder="Search shortcut by name or key..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#FAFAFA] dark:bg-[#151515] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] pl-8 pr-3 py-1.5 text-xs text-[#171717] dark:text-[#EDEDED] placeholder-[#A3A3A3] dark:placeholder-[#737373] outline-none focus:border-[#171717] dark:focus:border-[#EDEDED] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#171717] dark:hover:text-[#EDEDED]"
              >
                <X className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto no-scrollbar py-0.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-1 text-xs font-normal rounded-[4px] whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#171717]'
                    : 'text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] hover:bg-[#F5F5F5] dark:hover:bg-[#222222]'
                }`}
              >
                {cat === 'all' ? 'All' : cat.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Shortcuts List Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FAFAFA] dark:bg-[#111111]">
          {filteredGroups.length === 0 ? (
            <div className="py-12 text-center text-[#737373] dark:text-[#A1A1A1] text-xs">
              No shortcuts found matching &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.category} className="space-y-2">
                <h3 className="text-xs font-normal text-[#737373] dark:text-[#A1A1A1]">
                  {group.category}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {group.shortcuts.map((shortcut, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] transition-colors"
                    >
                      <span className="text-xs text-[#171717] dark:text-[#EDEDED] pr-2 font-normal">
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {shortcut.keys.map((k, kIdx) => (
                          <kbd
                            key={kIdx}
                            className="inline-flex items-center justify-center min-w-[22px] px-1.5 py-0.5 text-[11px] tabular-nums font-normal text-[#171717] dark:text-[#EDEDED] bg-[#F5F5F5] dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[4px]"
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#FAFAFA] dark:bg-[#151515] flex items-center justify-between text-xs text-[#737373] dark:text-[#A1A1A1]">
          <span>Hotkeys active across timeline and preview. Press ? anytime.</span>
          <button
            onClick={() => setShortcutsModalOpen(false)}
            className="px-3 py-1.5 rounded-[6px] bg-[#171717] hover:bg-[#262626] text-white dark:bg-[#EDEDED] dark:hover:bg-white dark:text-[#171717] text-xs font-normal transition-colors cursor-pointer"
          >
            Got it (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
