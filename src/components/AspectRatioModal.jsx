import React, { useState } from 'react';
import { X, Monitor, Smartphone, Square, Image as ImageIcon, Tv, Sliders } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { createDefaultProject } from '../utils/sampleData';
import { saveProjectToDB } from '../utils/storage';
import { toastSuccess } from '../store/toastStore';

export const AspectRatioModal = ({ isOpen, onClose, onCreated }) => {
  const { setProject, setRoute } = useEditorStore();
  const [projectName, setProjectName] = useState('Untitled Project');
  const [selectedRatio, setSelectedRatio] = useState('16:9');
  const [fps, setFps] = useState(30);
  const [isCustom, setIsCustom] = useState(false);
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);

  if (!isOpen) return null;

  const ratios = [
    { id: '16:9', name: 'YouTube / Landscape', desc: '1920 x 1080', icon: Monitor },
    { id: '9:16', name: 'Reels / TikTok / Shorts', desc: '1080 x 1920', icon: Smartphone },
    { id: '1:1', name: 'Square / Instagram', desc: '1080 x 1080', icon: Square },
    { id: '4:5', name: 'Portrait Post', desc: '1080 x 1350', icon: ImageIcon },
    { id: '21:9', name: 'Cinematic Widescreen', desc: '2560 x 1080', icon: Tv },
  ];

  const handleCreate = async () => {
    const newProj = createDefaultProject();
    newProj.id = `project_${Date.now()}`;
    newProj.name = projectName.trim() || 'Untitled Project';
    newProj.aspectRatio = selectedRatio;
    newProj.fps = Number(fps);
    if (isCustom) {
      newProj.customWidth = Number(customWidth) || 1920;
      newProj.customHeight = Number(customHeight) || 1080;
    }
    newProj.updatedAt = Date.now();
    newProj.createdAt = Date.now();

    await saveProjectToDB(newProj);
    setProject(newProj);
    setRoute('editor');
    toastSuccess(`Created project "${newProj.name}"`, 'New Project');
    onClose();
    if (onCreated) onCreated(newProj.id);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[10px] shadow-2xl w-full max-w-lg flex flex-col select-none overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-14 px-5 border-b border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center justify-between bg-[#FAFAFA] dark:bg-[#151515]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[6px] bg-[#3B82F6]/10 text-[#3B82F6] flex items-center justify-center">
              <Monitor className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#171717] dark:text-[#EDEDED]">Create New Project</h2>
              <p className="text-[11px] text-[#737373] dark:text-[#A1A1A1]">Choose aspect ratio & frame rate</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[6px] text-[#737373] hover:text-[#171717] dark:hover:text-[#EDEDED] cursor-pointer"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Project Name */}
          <div>
            <label className="block text-xs font-medium text-[#171717] dark:text-[#EDEDED] mb-1">
              Project Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full bg-[#FAFAFA] dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] px-3 py-2 text-xs text-[#171717] dark:text-[#EDEDED] outline-none focus:border-[#3B82F6]"
              placeholder="My awesome video..."
            />
          </div>

          {/* Aspect Ratios Grid */}
          <div>
            <label className="block text-xs font-medium text-[#171717] dark:text-[#EDEDED] mb-2">
              Aspect Ratio
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ratios.map((r) => {
                const IconComponent = r.icon;
                const isSelected = !isCustom && selectedRatio === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setIsCustom(false);
                      setSelectedRatio(r.id);
                    }}
                    className={`p-3 rounded-[8px] border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/50 dark:bg-blue-950/30 border-[#3B82F6] ring-1 ring-[#3B82F6]'
                        : 'bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] hover:border-[#3B82F6]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <IconComponent className={`w-4 h-4 ${isSelected ? 'text-[#3B82F6]' : 'text-[#737373]'}`} />
                      <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-[#F5F5F5] dark:bg-[#262626] text-[#737373] dark:text-[#A1A1A1]">
                        {r.id}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#171717] dark:text-[#EDEDED] truncate">{r.name}</p>
                      <p className="text-[10px] text-[#737373] dark:text-[#A1A1A1]">{r.desc}</p>
                    </div>
                  </button>
                );
              })}

              {/* Custom Size Option */}
              <button
                type="button"
                onClick={() => setIsCustom(true)}
                className={`p-3 rounded-[8px] border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  isCustom
                    ? 'bg-blue-50/50 dark:bg-blue-950/30 border-[#3B82F6] ring-1 ring-[#3B82F6]'
                    : 'bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] hover:border-[#3B82F6]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Sliders className={`w-4 h-4 ${isCustom ? 'text-[#3B82F6]' : 'text-[#737373]'}`} />
                  <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-[#F5F5F5] dark:bg-[#262626] text-[#737373] dark:text-[#A1A1A1]">
                    Custom
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-[#171717] dark:text-[#EDEDED]">Custom Size</p>
                  <p className="text-[10px] text-[#737373] dark:text-[#A1A1A1]">Set width & height</p>
                </div>
              </button>
            </div>
          </div>

          {/* Custom Width & Height Inputs if Custom selected */}
          {isCustom && (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-[6px] bg-[#FAFAFA] dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#2A2A2A]">
              <div>
                <label className="block text-[10px] text-[#737373] dark:text-[#A1A1A1] mb-1">Width (px)</label>
                <input
                  type="number"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(parseInt(e.target.value) || 1920)}
                  className="w-full bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[4px] px-2 py-1 text-xs text-[#171717] dark:text-[#EDEDED]"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[#737373] dark:text-[#A1A1A1] mb-1">Height (px)</label>
                <input
                  type="number"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(parseInt(e.target.value) || 1080)}
                  className="w-full bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[4px] px-2 py-1 text-xs text-[#171717] dark:text-[#EDEDED]"
                />
              </div>
            </div>
          )}

          {/* Frame Rate Selector */}
          <div>
            <label className="block text-xs font-medium text-[#171717] dark:text-[#EDEDED] mb-1.5">
              Frame Rate (FPS)
            </label>
            <div className="flex gap-2">
              {[24, 30, 60].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFps(f)}
                  className={`flex-1 py-1.5 rounded-[6px] border text-xs font-medium transition-colors cursor-pointer ${
                    fps === f
                      ? 'bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#171717] border-[#171717] dark:border-[#EDEDED]'
                      : 'bg-white dark:bg-[#1A1A1A] text-[#737373] dark:text-[#A1A1A1] border-[#E5E5E5] dark:border-[#2A2A2A]'
                  }`}
                >
                  {f} FPS
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-14 px-5 border-t border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center justify-end gap-2 bg-[#FAFAFA] dark:bg-[#151515]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-[6px] text-xs font-medium text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="px-4 py-2 rounded-[6px] bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-medium shadow-sm transition-colors cursor-pointer"
          >
            Create Project
          </button>
        </div>
      </div>
    </div>
  );
};
