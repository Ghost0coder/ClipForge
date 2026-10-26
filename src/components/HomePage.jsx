import React, { useState, useEffect } from 'react';
import { Plus, Search, Sparkles, Mic, FileText, Upload, Film, ArrowRight, Clock, Star, Play } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { getAllProjectsFromDB, saveProjectToDB } from '../utils/storage';
import { createDefaultProject } from '../utils/sampleData';
import { AspectRatioModal } from './AspectRatioModal';
import { toastSuccess } from '../store/toastStore';

export const HomePage = () => {
  const { setProject, setRoute, openTemplateModal } = useEditorStore();
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAspectRatioModalOpen, setIsAspectRatioModalOpen] = useState(false);

  useEffect(() => {
    async function loadProjects() {
      const list = await getAllProjectsFromDB();
      setProjects(list);
    }
    loadProjects();
  }, []);

  const handleQuickStart = async (mode) => {
    const newProj = createDefaultProject();
    newProj.id = `project_${Date.now()}`;
    newProj.name = `${mode} Project`;
    newProj.updatedAt = Date.now();
    await saveProjectToDB(newProj);
    setProject(newProj);
    setRoute('editor');
    toastSuccess(`Started ${mode} project`, 'Quick Start');
  };

  const templates = [
    { id: 'cinematic', name: 'Cinematic Travel Vlog', ratio: '16:9', duration: '0:45', desc: 'Moody grading & cinematic dissolves' },
    { id: 'tiktok', name: 'Viral TikTok / Reels', ratio: '9:16', duration: '0:30', desc: 'Fast cuts, pop animations & auto captions' },
    { id: 'podcast', name: 'Studio Podcast Clip', ratio: '16:9', duration: '1:00', desc: 'Waveform visualizer & multi-cam switch' },
    { id: 'minimal', name: 'Minimal Product Showcase', ratio: '1:1', duration: '0:20', desc: 'Clean typography & smooth zooms' },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#FAFAFA] dark:bg-[#111111] text-[#171717] dark:text-[#EDEDED] select-none p-6 lg:p-8 space-y-8">
      {/* Top Header / Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#171717] dark:text-[#EDEDED]">
            Welcome back, Creator
          </h1>
          <p className="text-xs text-[#737373] dark:text-[#A1A1A1] mt-0.5">
            Create high-impact video masterpieces with pro editing tools and AI assistance.
          </p>
        </div>

        {/* Search Projects & Templates */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737373]" strokeWidth={1.5} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects & templates..."
            className="w-full bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[8px] pl-9 pr-3 py-2 text-xs text-[#171717] dark:text-[#EDEDED] outline-none focus:border-[#3B82F6] shadow-xs"
          />
        </div>
      </div>

      {/* Hero New Project & Quick-Starts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* New Project Card */}
        <div
          onClick={() => setIsAspectRatioModalOpen(true)}
          className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[12px] p-6 text-white flex flex-col justify-between cursor-pointer shadow-lg hover:shadow-xl transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-[8px] bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Plus className="w-5 h-5 text-white group-hover:scale-110 transition-transform" strokeWidth={2} />
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/20 text-white/90">
              Blank Canvas
            </span>
          </div>
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-1">New Project</h2>
            <p className="text-xs text-white/80">Start from scratch with custom aspect ratios & frame rates.</p>
          </div>
          <div className="mt-6 flex items-center gap-1 text-xs font-medium text-white/90 group-hover:translate-x-1 transition-transform">
            <span>Create project</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Quick-Start Cards */}
        <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-2 gap-3">
          {[
            { id: 'captions', title: 'Auto Captions', desc: 'Speech-to-text subtitles', icon: Sparkles, color: 'text-amber-500 bg-amber-500/10' },
            { id: 'script', title: 'Script to Video', desc: 'AI storyboard generator', icon: FileText, color: 'text-blue-500 bg-blue-500/10' },
            { id: 'voiceover', title: 'Record Voiceover', desc: 'Mic recording & narration', icon: Mic, color: 'text-rose-500 bg-rose-500/10' },
            { id: 'import', title: 'Import Media', desc: 'Upload videos, audio & imgs', icon: Upload, color: 'text-emerald-500 bg-emerald-500/10' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleQuickStart(item.title)}
                className="bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[10px] p-4 text-left flex flex-col justify-between hover:border-[#3B82F6] transition-all cursor-pointer group shadow-xs"
              >
                <div className={`w-8 h-8 rounded-[6px] ${item.color} flex items-center justify-center mb-3`}>
                  <Icon className="w-4 h-4" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-[#171717] dark:text-[#EDEDED] group-hover:text-[#3B82F6] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-[10px] text-[#737373] dark:text-[#A1A1A1] mt-0.5">{item.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Projects Row */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#171717] dark:text-[#EDEDED] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#737373]" strokeWidth={1.5} />
            <span>Recent Projects</span>
          </h2>
          <button
            onClick={() => setRoute('projects')}
            className="text-xs font-medium text-[#3B82F6] hover:underline cursor-pointer"
          >
            View all ({projects.length})
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[10px] p-8 text-center">
            <Film className="w-8 h-8 text-[#A3A3A3] mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-xs font-medium text-[#171717] dark:text-[#EDEDED]">No recent projects yet</p>
            <p className="text-[10px] text-[#737373] mt-1">Create your first video project to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {projects.slice(0, 4).map((p) => (
              <div
                key={p.id}
                onClick={async () => {
                  setProject(p);
                  setRoute('editor');
                }}
                className="bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[10px] overflow-hidden hover:border-[#3B82F6] transition-all cursor-pointer group shadow-xs flex flex-col"
              >
                <div className="h-32 bg-[#F0F0F0] dark:bg-[#0D0D0D] relative flex items-center justify-center overflow-hidden">
                  <Film className="w-8 h-8 text-[#A3A3A3] group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                  <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-mono">
                    {p.aspectRatio || '16:9'}
                  </span>
                </div>
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-[#171717] dark:text-[#EDEDED] truncate">{p.name}</h3>
                    <p className="text-[10px] text-[#737373] mt-0.5">
                      Edited {new Date(p.updatedAt || Date.now()).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Templates For You */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#171717] dark:text-[#EDEDED] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#737373]" strokeWidth={1.5} />
            <span>Templates For You</span>
          </h2>
          <button
            onClick={() => setRoute('templates')}
            className="text-xs font-medium text-[#3B82F6] hover:underline cursor-pointer"
          >
            Explore all templates
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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
              className="bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[10px] overflow-hidden hover:border-[#3B82F6] transition-all cursor-pointer group shadow-xs p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F5F5F5] dark:bg-[#262626] text-[#737373]">
                    {t.ratio}
                  </span>
                  <span className="text-[10px] text-[#737373]">{t.duration}</span>
                </div>
                <h3 className="text-xs font-semibold text-[#171717] dark:text-[#EDEDED] group-hover:text-[#3B82F6] transition-colors">
                  {t.name}
                </h3>
                <p className="text-[10px] text-[#737373] dark:text-[#A1A1A1] mt-1">{t.desc}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center justify-between text-[11px] font-medium text-[#3B82F6]">
                <span>Use template</span>
                <Play className="w-3 h-3 fill-current" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Aspect Ratio Modal */}
      <AspectRatioModal
        isOpen={isAspectRatioModalOpen}
        onClose={() => setIsAspectRatioModalOpen(false)}
      />
    </div>
  );
};
