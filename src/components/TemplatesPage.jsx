import React from 'react';
import { LayoutTemplate, Play, Sparkles } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { createDefaultProject } from '../utils/sampleData';
import { toastSuccess } from '../store/toastStore';

export const TemplatesPage = () => {
  const { setProject, setRoute } = useEditorStore();

  const templates = [
    { id: 'cinematic', name: 'Cinematic Travel Vlog', ratio: '16:9', duration: '0:45', desc: 'Moody grading & cinematic dissolves' },
    { id: 'tiktok', name: 'Viral TikTok / Reels', ratio: '9:16', duration: '0:30', desc: 'Fast cuts, pop animations & auto captions' },
    { id: 'podcast', name: 'Studio Podcast Clip', ratio: '16:9', duration: '1:00', desc: 'Waveform visualizer & multi-cam switch' },
    { id: 'minimal', name: 'Minimal Product Showcase', ratio: '1:1', duration: '0:20', desc: 'Clean typography & smooth zooms' },
    { id: 'gaming', name: 'Gaming Montage 4K', ratio: '16:9', duration: '0:50', desc: 'Glitch effects & fast-paced beats' },
    { id: 'tutorial', name: 'Tech Tutorial Screencast', ratio: '16:9', duration: '2:00', desc: 'Zoom blur & structured callouts' },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#FAFAFA] dark:bg-[#111111] text-[#171717] dark:text-[#EDEDED] select-none p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#171717] dark:text-[#EDEDED]">
          Templates Gallery
        </h1>
        <p className="text-xs text-[#737373] dark:text-[#A1A1A1] mt-0.5">
          Kickstart your project with professionally designed video templates and styles.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {templates.map((t) => (
          <div
            key={t.id}
            onClick={() => {
              const newProj = createDefaultProject();
              newProj.id = `project_template_${Date.now()}`;
              newProj.name = t.name;
              newProj.aspectRatio = t.ratio;
              setProject(newProj);
              setRoute('editor');
              toastSuccess(`Opened template "${t.name}"`, 'Template Loaded');
            }}
            className="bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[10px] overflow-hidden hover:border-[#3B82F6] transition-all cursor-pointer group shadow-xs p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F5F5F5] dark:bg-[#262626] text-[#737373]">
                  {t.ratio}
                </span>
                <span className="text-[10px] text-[#737373]">{t.duration}</span>
              </div>
              <h3 className="text-sm font-semibold text-[#171717] dark:text-[#EDEDED] group-hover:text-[#3B82F6] transition-colors">
                {t.name}
              </h3>
              <p className="text-xs text-[#737373] dark:text-[#A1A1A1] mt-1.5">{t.desc}</p>
            </div>
            <div className="mt-6 pt-3 border-t border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center justify-between text-xs font-medium text-[#3B82F6]">
              <span>Use template</span>
              <Play className="w-3.5 h-3.5 fill-current" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
