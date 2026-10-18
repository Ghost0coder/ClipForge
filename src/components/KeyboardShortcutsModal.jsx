import React, { useState } from 'react';
import { X, Keyboard, Search, Sparkles, Sliders } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-2xl bg-[#13151f] border border-[#272b3c] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222638] bg-[#161824]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Keyboard Shortcuts
                <span className="text-[11px] font-normal text-violet-400 px-2 py-0.5 rounded-full bg-violet-950/60 border border-violet-800/40">
                  Global NLE Controls
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Speed up editing with professional desktop shortcuts. Press <span className="font-mono text-slate-300">?</span> anytime.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShortcutsModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#202434] transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-6 py-3 border-b border-[#1f2334] bg-[#11131c] flex flex-col sm:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search shortcut by name or key (e.g. Space, Delete, Split)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#181b27] border border-[#282d3f] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-violet-500/60 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto scrollbar-none py-0.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-violet-600/30 text-violet-300 border border-violet-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#1b1f2e]'
                }`}
              >
                {cat === 'all' ? 'All' : cat.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Shortcuts List Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-700">
          {filteredGroups.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No shortcuts found matching &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.category} className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {group.category}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {group.shortcuts.map((shortcut, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#171a26] border border-[#242838] hover:border-violet-500/30 transition-colors"
                    >
                      <span className="text-xs text-slate-300 pr-2">
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {shortcut.keys.map((k, kIdx) => (
                          <kbd
                            key={kIdx}
                            className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-1 text-[11px] font-mono font-semibold text-slate-200 bg-[#202536] border border-[#2f354c] rounded-md shadow-sm"
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
        <div className="px-6 py-3 border-t border-[#222638] bg-[#141622] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Hotkeys are always active across timeline and preview.</span>
          </div>
          <button
            onClick={() => setShortcutsModalOpen(false)}
            className="px-3 py-1.5 rounded-lg bg-[#222638] hover:bg-[#2c3148] text-white text-xs font-medium transition-colors cursor-pointer"
          >
            Got it (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
