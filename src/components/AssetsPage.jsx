import React, { useState } from 'react';
import { Box, Upload, Film, Music, Image as ImageIcon, Sparkles, Trash2 } from 'lucide-react';
import { toastSuccess } from '../store/toastStore';

export const AssetsPage = () => {
  const [activeTab, setActiveTab] = useState('uploads'); // 'uploads' | 'luts' | 'fonts' | 'stickers'

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#FAFAFA] dark:bg-[#111111] text-[#171717] dark:text-[#EDEDED] select-none p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#171717] dark:text-[#EDEDED]">
            Assets Manager
          </h1>
          <p className="text-xs text-[#737373] dark:text-[#A1A1A1] mt-0.5">
            Manage your custom media uploads, color LUTs, fonts, and saved stickers.
          </p>
        </div>

        <label className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-medium shadow-sm transition-colors cursor-pointer">
          <Upload className="w-4 h-4" strokeWidth={1.5} />
          <span>Upload Asset</span>
          <input
            type="file"
            onChange={() => toastSuccess('Asset uploaded successfully', 'Upload Complete')}
            className="hidden"
          />
        </label>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E5E5E5] dark:border-[#2A2A2A] pb-3">
        {[
          { id: 'uploads', label: 'My Uploads', count: 12 },
          { id: 'luts', label: 'Color LUTs', count: 8 },
          { id: 'fonts', label: 'Custom Fonts', count: 5 },
          { id: 'stickers', label: 'Saved Stickers', count: 14 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-[6px] text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === tab.id
                ? 'bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#171717]'
                : 'text-[#737373] dark:text-[#A1A1A1] hover:bg-[#F5F5F5] dark:hover:bg-[#262626]'
            }`}
          >
            <span>{tab.label}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[10px] overflow-hidden p-3 flex flex-col justify-between group shadow-xs"
          >
            <div className="h-28 bg-[#F5F5F5] dark:bg-[#0D0D0D] rounded-[6px] flex items-center justify-center relative overflow-hidden mb-3">
              <Film className="w-8 h-8 text-[#A3A3A3] group-hover:scale-110 transition-transform" strokeWidth={1.5} />
              <button
                onClick={() => toastSuccess('Deleted asset', 'Asset Removed')}
                className="absolute top-2 right-2 p-1 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-rose-600"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#171717] dark:text-[#EDEDED] truncate">Asset_File_{i}.mp4</p>
              <p className="text-[10px] text-[#737373] mt-0.5">14.2 MB • Video</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
