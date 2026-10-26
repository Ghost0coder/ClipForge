import React from 'react';
import { Settings, Sun, Moon, Monitor, Shield, HardDrive, RefreshCw } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { toastSuccess } from '../store/toastStore';

export const SettingsPage = () => {
  const { theme, toggleTheme } = useEditorStore();

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#FAFAFA] dark:bg-[#111111] text-[#171717] dark:text-[#EDEDED] select-none p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#171717] dark:text-[#EDEDED]">
          Editor Settings
        </h1>
        <p className="text-xs text-[#737373] dark:text-[#A1A1A1] mt-0.5">
          Configure application theme, performance settings, hardware acceleration, and storage.
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Appearance */}
        <div className="bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[10px] p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-semibold text-[#171717] dark:text-[#EDEDED]">Appearance</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[#171717] dark:text-[#EDEDED]">Interface Theme</p>
              <p className="text-[10px] text-[#737373]">Switch between minimalist light and dark themes.</p>
            </div>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3 py-1.5 rounded-[6px] border border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#FAFAFA] dark:bg-[#111111] text-xs font-medium cursor-pointer"
            >
              {theme === 'dark' ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
              <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
            </button>
          </div>
        </div>

        {/* Performance */}
        <div className="bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[10px] p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-semibold text-[#171717] dark:text-[#EDEDED]">Performance & Proxy</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[#171717] dark:text-[#EDEDED]">Hardware Acceleration</p>
              <p className="text-[10px] text-[#737373]">Use WebGL / GPU canvas acceleration for smooth playback.</p>
            </div>
            <input type="checkbox" defaultChecked className="w-4 h-4 accent-[#3B82F6]" />
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-[#E5E5E5] dark:border-[#2A2A2A]">
            <div>
              <p className="text-xs font-medium text-[#171717] dark:text-[#EDEDED]">Preview Proxy Resolution</p>
              <p className="text-[10px] text-[#737373]">Render timeline at 720p for lag-free 60fps scrubbing.</p>
            </div>
            <select defaultValue="Proxy (720p)" className="bg-[#FAFAFA] dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] px-2 py-1 text-xs outline-none">
              <option value="Full (1080p)">Full (1080p)</option>
              <option value="Proxy (720p)">Proxy (720p)</option>
              <option value="Draft (480p)">Draft (480p)</option>
            </select>
          </div>
        </div>

        {/* Storage */}
        <div className="bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[10px] p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-semibold text-[#171717] dark:text-[#EDEDED]">Storage & Cache</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[#171717] dark:text-[#EDEDED]">IndexedDB Local Cache</p>
              <p className="text-[10px] text-[#737373]">Auto-saves project states and media records locally.</p>
            </div>
            <button
              onClick={() => toastSuccess('Cleared browser cache successfully', 'Cache Cleared')}
              className="px-3 py-1.5 rounded-[6px] bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 text-xs font-medium cursor-pointer"
            >
              Clear Cache
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
