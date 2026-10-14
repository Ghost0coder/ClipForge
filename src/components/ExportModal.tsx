import React, { useState } from 'react';
import {
  X,
  Download,
  Film,
  Camera,
  Music,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { exportPipeline, ExportProgress } from '../utils/exportPipeline';
import { ExportSettings } from '../types/editor';

export const ExportModal: React.FC = () => {
  const { isExportModalOpen, setExportModalOpen, project } = useEditorStore();

  const [settings, setSettings] = useState<ExportSettings>({
    resolution: '1080p',
    fps: 30,
    format: 'mp4',
    quality: 'high',
  });

  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);

  if (!isExportModalOpen) return null;

  const handleStartExport = async () => {
    setIsExporting(true);
    setProgress({
      percentage: 0,
      currentFrame: 0,
      totalFrames: Math.floor(project.duration * settings.fps),
      statusText: 'Initializing video encoding pipeline...',
      isComplete: false,
    });

    try {
      await exportPipeline.exportProject(project, settings, (prog) => {
        setProgress(prog);
      });
    } catch (err: any) {
      setProgress({
        percentage: 0,
        currentFrame: 0,
        totalFrames: 0,
        statusText: `Export failed: ${err.message || 'Unknown error'}`,
        isComplete: false,
        error: err.message,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCancelExport = () => {
    exportPipeline.cancel();
    setIsExporting(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#141620] border border-[#272b3c] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden select-none">
        {/* Header */}
        <div className="h-12 px-5 border-b border-[#222638] flex items-center justify-between bg-[#10121a]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-violet-600 to-cyan-400 flex items-center justify-center">
              <Download className="w-3.5 h-3.5 text-white" />
            </div>
            <h2 className="text-sm font-bold text-white">Export Video — {project.name}</h2>
          </div>
          {!isExporting && (
            <button
              onClick={() => setExportModalOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {!isExporting && !progress?.isComplete ? (
            <>
              {/* Format selection */}
              <div>
                <span className="text-xs font-semibold text-slate-300 block mb-2">Export Format</span>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'mp4', label: 'MP4 / WebM', icon: Film },
                    { id: 'gif', label: 'Animated GIF', icon: Film },
                    { id: 'mp3', label: 'Audio MP3', icon: Music },
                    { id: 'png-frame', label: 'PNG Snapshot', icon: Camera },
                  ].map((fmt) => {
                    const Icon = fmt.icon;
                    const isSelected = settings.format === fmt.id;
                    return (
                      <button
                        key={fmt.id}
                        onClick={() => setSettings({ ...settings, format: fmt.id as any })}
                        className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                          isSelected
                            ? 'bg-violet-950/60 border-violet-500 text-white shadow-md shadow-violet-500/20'
                            : 'bg-[#181b26] border-[#272b3c] text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[11px] font-semibold">{fmt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {settings.format !== 'png-frame' && settings.format !== 'mp3' && (
                <>
                  {/* Resolution selection */}
                  <div>
                    <span className="text-xs font-semibold text-slate-300 block mb-2">Resolution</span>
                    <div className="grid grid-cols-5 gap-1.5">
                      {['480p', '720p', '1080p', '2K', '4K'].map((res) => (
                        <button
                          key={res}
                          onClick={() => setSettings({ ...settings, resolution: res as any })}
                          className={`py-2 rounded-lg border text-xs font-mono font-bold transition-all ${
                            settings.resolution === res
                              ? 'bg-violet-600 text-white border-violet-500'
                              : 'bg-[#181b26] border-[#272b3c] text-slate-400 hover:text-white'
                          }`}
                        >
                          {res}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Frame Rate selection */}
                  <div>
                    <span className="text-xs font-semibold text-slate-300 block mb-2">Frame Rate (FPS)</span>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { fps: 24, label: '24 FPS (Cinematic)' },
                        { fps: 30, label: '30 FPS (Standard)' },
                        { fps: 60, label: '60 FPS (Ultra Smooth)' },
                      ].map((item) => (
                        <button
                          key={item.fps}
                          onClick={() => setSettings({ ...settings, fps: item.fps as any })}
                          className={`py-2 rounded-lg border text-xs font-medium transition-all ${
                            settings.fps === item.fps
                              ? 'bg-cyan-900/60 text-cyan-300 border-cyan-500'
                              : 'bg-[#181b26] border-[#272b3c] text-slate-400 hover:text-white'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quality Bitrate */}
                  <div>
                    <span className="text-xs font-semibold text-slate-300 block mb-2">Quality & Bitrate</span>
                    <div className="grid grid-cols-4 gap-2">
                      {['low', 'medium', 'high', 'ultra'].map((q) => (
                        <button
                          key={q}
                          onClick={() => setSettings({ ...settings, quality: q as any })}
                          className={`py-1.5 rounded-lg border text-xs capitalize transition-all ${
                            settings.quality === q
                              ? 'bg-violet-600 text-white border-violet-500'
                              : 'bg-[#181b26] border-[#272b3c] text-slate-400 hover:text-white'
                          }`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Summary spec */}
              <div className="p-3 rounded-xl bg-[#10121a] border border-[#222638] text-[11px] text-slate-400 flex justify-between items-center">
                <span>Estimated duration: {project.duration.toFixed(1)}s</span>
                <span className="font-mono text-cyan-400 font-bold">100% Client-Side Render</span>
              </div>
            </>
          ) : (
            /* Progress State */
            <div className="py-6 space-y-4 text-center">
              {progress?.isComplete ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
                  <h3 className="text-base font-bold text-white">Video Successfully Exported!</h3>
                  <p className="text-xs text-slate-400">
                    File was rendered locally in your browser and automatically downloaded.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-10 h-10 mx-auto rounded-full bg-violet-950 flex items-center justify-center border border-violet-500/40">
                    <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Encoding ClipForge Timeline...</h3>
                  <p className="text-xs font-mono text-slate-400">{progress?.statusText}</p>

                  {/* Progress bar */}
                  <div className="w-full bg-[#1e2233] rounded-full h-3 overflow-hidden border border-[#2a2f46]">
                    <div
                      className="bg-gradient-to-r from-violet-600 to-cyan-400 h-full transition-all duration-150"
                      style={{ width: `${progress?.percentage || 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono font-bold text-cyan-400">
                    {progress?.percentage}%
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer CTAs */}
        <div className="h-14 px-5 border-t border-[#222638] bg-[#10121a] flex items-center justify-end gap-2">
          {isExporting ? (
            <button
              onClick={handleCancelExport}
              className="px-4 py-2 rounded-xl bg-[#1e2233] hover:bg-rose-950 hover:text-rose-400 text-xs font-semibold text-slate-300 transition-colors"
            >
              Cancel Export
            </button>
          ) : progress?.isComplete ? (
            <button
              onClick={() => {
                setProgress(null);
                setExportModalOpen(false);
              }}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-colors"
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={() => setExportModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#1a1d29] hover:bg-[#232738] text-xs font-semibold text-slate-300 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleStartExport}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:opacity-95 text-white text-xs font-bold transition-all shadow-md shadow-violet-500/25 flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Start Export
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
