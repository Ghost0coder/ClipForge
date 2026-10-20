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
import { exportPipeline } from '../utils/exportPipeline';
import { toastError, toastSuccess } from '../store/toastStore';
import { useResponsive } from '../utils/useResponsive';

export const ExportModal = () => {
  const { isExportModalOpen, setExportModalOpen, project } = useEditorStore();
  const { isMobile } = useResponsive();

  const [settings, setSettings] = useState({
    resolution: isMobile ? '720p' : '1080p',
    fps: 30,
    format: 'mp4',
    quality: 'high',
  });

  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(null);

  if (!isExportModalOpen) return null;

  const handleStartExport = async () => {
    setIsExporting(true);
    console.log('[ClipForge:Export] handleStartExport invoked for project:', {
      name: project.name,
      duration: project.duration,
      settings,
    });

    setProgress({
      percentage: 0,
      currentFrame: 0,
      totalFrames: Math.floor(project.duration * settings.fps),
      statusText: 'Initializing video encoding pipeline...',
      isComplete: false,
    });

    try {
      const resultUrl = await exportPipeline.exportProject(project, settings, (prog) => {
        setProgress(prog);
      });
      if (resultUrl) {
        console.log('[ClipForge:Export] Export finished successfully! Download URL ready.');
        toastSuccess('Video export completed successfully!', 'Export Finished');
      }
    } catch (err) {
      console.error('[ClipForge:Export] Export failed with error:', err);
      const isOOM =
        err?.name === 'QuotaExceededError' ||
        /memory|oom|allocation|heap|buffer|out of memory/i.test(err?.message || '');
      const errorMsg = isOOM
        ? 'Device ran out of memory during export. Try exporting at 720p or reducing the project duration.'
        : (err?.message || 'Video export encountered an unexpected error');
      setProgress({
        percentage: 0,
        currentFrame: 0,
        totalFrames: 0,
        statusText: `Export failed: ${errorMsg}`,
        isComplete: false,
        error: errorMsg,
      });
      toastError(errorMsg, isOOM ? 'Out of Memory Error' : 'Export Failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCancelExport = () => {
    exportPipeline.cancel();
    setIsExporting(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] w-full max-w-lg shadow-lg overflow-hidden select-none text-[#171717] dark:text-[#EDEDED] transition-colors">
        {/* Header */}
        <div className="h-11 px-4 border-b border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center justify-between bg-[#FAFAFA] dark:bg-[#151515]">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} />
            <h2 className="text-xs font-medium text-[#171717] dark:text-[#EDEDED]">Export Video — {project.name}</h2>
          </div>
          {!isExporting && (
            <button
              onClick={() => setExportModalOpen(false)}
              className="p-1 text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] rounded-[4px] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {!isExporting && !progress?.isComplete ? (
            <>
              {/* Format selection */}
              <div>
                <span className="text-xs font-normal text-[#737373] dark:text-[#A1A1A1] block mb-2">Export Format</span>
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
                        onClick={() => setSettings({ ...settings, format: fmt.id })}
                        className={`p-2.5 rounded-[6px] border flex flex-col items-center gap-1 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#171717] border-[#171717] dark:border-[#EDEDED]'
                            : 'bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] text-[#737373] dark:text-[#A1A1A1] hover:bg-[#F5F5F5] dark:hover:bg-[#262626]'
                        }`}
                      >
                        <Icon className="w-4 h-4" strokeWidth={1.5} />
                        <span className="text-[11px] font-normal">{fmt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {settings.format !== 'png-frame' && settings.format !== 'mp3' && (
                <>
                  {/* Resolution selection */}
                  <div>
                    <span className="text-xs font-normal text-[#737373] dark:text-[#A1A1A1] block mb-2">Resolution</span>
                    <div className="grid grid-cols-5 gap-1.5">
                      {['480p', '720p', '1080p', '2K', '4K'].map((res) => (
                        <button
                          key={res}
                          onClick={() => setSettings({ ...settings, resolution: res })}
                          className={`py-1.5 rounded-[6px] border text-xs tabular-nums font-normal transition-colors cursor-pointer ${
                            settings.resolution === res
                              ? 'bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#171717] border-[#171717] dark:border-[#EDEDED]'
                              : 'bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] text-[#737373] dark:text-[#A1A1A1] hover:bg-[#F5F5F5] dark:hover:bg-[#262626]'
                          }`}
                        >
                          {res}
                        </button>
                      ))}
                    </div>

                    {/* 4K Mobile Warning */}
                    {settings.resolution === '4K' && (
                      <div className="mt-2.5 p-2.5 rounded-[6px] bg-[#FAFAFA] dark:bg-[#151515] border border-amber-300 dark:border-amber-900/50 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" strokeWidth={1.5} />
                        <div>
                          <strong>Warning for mobile devices:</strong> 4K encoding requires extreme GPU and heap memory and may fail on phones. 720p or 1080p is recommended.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Frame Rate selection */}
                  <div>
                    <span className="text-xs font-normal text-[#737373] dark:text-[#A1A1A1] block mb-2">Frame Rate (FPS)</span>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { fps: 24, label: '24 FPS (Cinematic)' },
                        { fps: 30, label: '30 FPS (Standard)' },
                        { fps: 60, label: '60 FPS (Ultra Smooth)' },
                      ].map((item) => (
                        <button
                          key={item.fps}
                          onClick={() => setSettings({ ...settings, fps: item.fps })}
                          className={`py-1.5 rounded-[6px] border text-xs font-normal transition-colors cursor-pointer ${
                            settings.fps === item.fps
                              ? 'bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#171717] border-[#171717] dark:border-[#EDEDED]'
                              : 'bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] text-[#737373] dark:text-[#A1A1A1] hover:bg-[#F5F5F5] dark:hover:bg-[#262626]'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quality Bitrate */}
                  <div>
                    <span className="text-xs font-normal text-[#737373] dark:text-[#A1A1A1] block mb-2">Quality & Bitrate</span>
                    <div className="grid grid-cols-4 gap-2">
                      {['low', 'medium', 'high', 'ultra'].map((q) => (
                        <button
                          key={q}
                          onClick={() => setSettings({ ...settings, quality: q })}
                          className={`py-1.5 rounded-[6px] border text-xs capitalize transition-colors cursor-pointer ${
                            settings.quality === q
                              ? 'bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#171717] border-[#171717] dark:border-[#EDEDED]'
                              : 'bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] text-[#737373] dark:text-[#A1A1A1] hover:bg-[#F5F5F5] dark:hover:bg-[#262626]'
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
              <div className="p-2.5 rounded-[6px] bg-[#FAFAFA] dark:bg-[#151515] border border-[#E5E5E5] dark:border-[#2A2A2A] text-[11px] text-[#737373] dark:text-[#A1A1A1] flex justify-between items-center">
                <span className="tabular-nums">Estimated duration: {project.duration.toFixed(1)}s</span>
                <span className="text-[#171717] dark:text-[#EDEDED]">100% Client-Side Render</span>
              </div>
            </>
          ) : (
            /* Progress State */
            <div className="py-6 space-y-4 text-center">
              {progress?.isComplete ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} />
                  <h3 className="text-sm font-medium text-[#171717] dark:text-[#EDEDED]">Video Successfully Exported</h3>
                  <p className="text-xs text-[#737373] dark:text-[#A1A1A1]">
                    File was rendered locally in your browser and automatically downloaded.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-10 h-10 mx-auto rounded-[6px] bg-[#F5F5F5] dark:bg-[#222222] flex items-center justify-center border border-[#E5E5E5] dark:border-[#2A2A2A]">
                    <Loader2 className="w-5 h-5 text-[#171717] dark:text-[#EDEDED] animate-spin" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xs font-medium text-[#171717] dark:text-[#EDEDED]">Encoding ClipForge Timeline...</h3>
                  <p className="text-xs text-[#737373] dark:text-[#A1A1A1] tabular-nums">{progress?.statusText}</p>

                  {/* Progress bar */}
                  <div className="w-full bg-[#E5E5E5] dark:bg-[#2A2A2A] rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#3B82F6] h-full transition-all duration-150"
                      style={{ width: `${progress?.percentage || 0}%` }}
                    />
                  </div>
                  <span className="text-xs tabular-nums text-[#3B82F6] font-normal">
                    {progress?.percentage}%
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer CTAs */}
        <div className="h-12 px-4 border-t border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#FAFAFA] dark:bg-[#151515] flex items-center justify-end gap-2">
          {isExporting ? (
            <button
              onClick={handleCancelExport}
              className="px-3 py-1.5 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-red-50 dark:hover:bg-red-950/30 text-xs text-red-600 dark:text-red-400 transition-colors cursor-pointer"
            >
              Cancel Export
            </button>
          ) : progress?.isComplete ? (
            <button
              onClick={() => {
                setProgress(null);
                setExportModalOpen(false);
              }}
              className="px-4 py-1.5 rounded-[6px] bg-[#171717] hover:bg-[#262626] text-white dark:bg-[#EDEDED] dark:hover:bg-white dark:text-[#171717] text-xs font-normal transition-colors cursor-pointer"
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={() => setExportModalOpen(false)}
                className="px-3 py-1.5 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-xs font-normal text-[#171717] dark:text-[#EDEDED] transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handleStartExport}
                className="px-4 py-1.5 rounded-[6px] bg-[#171717] hover:bg-[#262626] text-white dark:bg-[#EDEDED] dark:hover:bg-white dark:text-[#171717] text-xs font-normal transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
                Start Export
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
