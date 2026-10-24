import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Film,
  Camera,
  Music,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sliders,
  FileJson,
  Upload,
} from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { exportPipeline } from '../utils/exportPipeline';
import { toastError, toastSuccess } from '../store/toastStore';
import { useResponsive } from '../utils/useResponsive';
import { exportProjectToJson, parseProjectJson } from '../utils/storage';

export const ExportModal = () => {
  const { isExportModalOpen, setExportModalOpen, project, setProject } = useEditorStore();
  const { isMobile } = useResponsive();
  const jsonFileInputRef = useRef(null);

  const [settings, setSettings] = useState({
    resolution: isMobile ? '720p' : '1080p',
    fps: 30,
    format: 'mp4',
    quality: 'high',
    watermark: {
      enabled: true,
      text: 'ClipForge',
      position: 'bottom-right',
      opacity: 0.75,
    },
  });

  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(null);

  if (!isExportModalOpen) return null;

  // Pre-export safety checks: project length or 4K/2K resolution
  const isHighRes = settings.resolution === '4K' || settings.resolution === '2K';
  const isLongProject = project.duration > 180; // > 3 mins
  const showDeviceWarning = (isHighRes && isMobile) || (isHighRes && isLongProject);

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
      etaText: 'Calculating...',
      isComplete: false,
    });

    try {
      const resultUrl = await exportPipeline.exportProject(project, settings, (prog) => {
        setProgress(prog);
      });
      if (resultUrl) {
        toastSuccess('Video export completed successfully!', 'Export Finished');
      }
    } catch (err) {
      console.error('[ClipForge:Export] Export failed with error:', err);
      const isOOM =
        err?.name === 'QuotaExceededError' ||
        /memory|oom|allocation|heap|buffer|out of memory/i.test(err?.message || '');
      const errorMsg = isOOM
        ? 'Device ran out of memory during export. Please export at 720p or 1080p.'
        : (err?.message || 'Video export encountered an unexpected error');
      setProgress({
        percentage: 0,
        currentFrame: 0,
        totalFrames: 0,
        statusText: `Export failed: ${errorMsg}`,
        etaText: '',
        isComplete: false,
        error: errorMsg,
      });
      toastError(errorMsg, isOOM ? 'Out of Memory Warning' : 'Export Failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCancelExport = () => {
    exportPipeline.cancel();
    setIsExporting(false);
    setProgress(null);
  };

  const handleImportJson = async (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseProjectJson(file);
      setProject(parsed);
      toastSuccess(`Imported project "${parsed.name}"`);
      setExportModalOpen(false);
    } catch (err) {
      toastError(`Invalid project file: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[8px] w-full max-w-lg shadow-xl overflow-hidden select-none text-[#171717] dark:text-[#EDEDED] transition-colors max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="h-11 px-4 border-b border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center justify-between bg-[#FAFAFA] dark:bg-[#151515] shrink-0">
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
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
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

                    {/* Pre-export Hardware / Memory Safety Advisory */}
                    {showDeviceWarning && (
                      <div className="mt-2.5 p-2.5 rounded-[6px] bg-[#FAFAFA] dark:bg-[#151515] border border-amber-300 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 text-xs flex flex-col gap-1.5">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" strokeWidth={1.5} />
                          <div>
                            <strong>High Resolution Advisory:</strong> Rendering in {settings.resolution} for {project.duration.toFixed(0)}s requires significant memory. 1080p is recommended for stability.
                          </div>
                        </div>
                        <button
                          onClick={() => setSettings({ ...settings, resolution: '1080p' })}
                          className="self-start text-[11px] underline font-medium text-amber-800 dark:text-amber-300 hover:text-amber-950 dark:hover:text-amber-100 cursor-pointer"
                        >
                          Switch to Recommended (1080p)
                        </button>
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
                        { fps: 60, label: '60 FPS (Smooth)' },
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

                  {/* Optional Watermark Section */}
                  <div className="p-3 rounded-[6px] bg-[#FAFAFA] dark:bg-[#151515] border border-[#E5E5E5] dark:border-[#2A2A2A] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#171717] dark:text-[#EDEDED]">
                        Brand Watermark
                      </span>
                      <label className="flex items-center gap-2 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={settings.watermark.enabled}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              watermark: { ...settings.watermark, enabled: e.target.checked },
                            })
                          }
                          className="accent-[#3B82F6] rounded"
                        />
                        <span className="text-[11px] text-[#737373] dark:text-[#A1A1A1]">
                          {settings.watermark.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </label>
                    </div>

                    {settings.watermark.enabled && (
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#E5E5E5] dark:border-[#2A2A2A]">
                        <div>
                          <label className="text-[10px] text-[#737373] dark:text-[#A1A1A1] block mb-1">
                            Custom Text / Logo
                          </label>
                          <input
                            type="text"
                            value={settings.watermark.text}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                watermark: { ...settings.watermark, text: e.target.value },
                              })
                            }
                            placeholder="e.g. ClipForge or @channel"
                            className="w-full text-xs p-1.5 rounded-[4px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#171717] dark:text-[#EDEDED] outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[#737373] dark:text-[#A1A1A1] block mb-1">
                            Position
                          </label>
                          <select
                            value={settings.watermark.position}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                watermark: { ...settings.watermark, position: e.target.value },
                              })
                            }
                            className="w-full text-xs p-1.5 rounded-[4px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#171717] dark:text-[#EDEDED] outline-none"
                          >
                            <option value="bottom-right">Bottom Right</option>
                            <option value="top-right">Top Right</option>
                            <option value="bottom-left">Bottom Left</option>
                            <option value="top-left">Top Left</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Project JSON Save / Load Quick Utility */}
              <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center justify-between">
                <span className="text-[11px] text-[#737373] dark:text-[#A1A1A1]">Project File Backup</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => exportProjectToJson(project)}
                    className="px-2 py-1 rounded-[4px] border border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-[11px] text-[#171717] dark:text-[#EDEDED] flex items-center gap-1 cursor-pointer"
                    title="Save Project .JSON"
                  >
                    <FileJson className="w-3 h-3 text-[#737373] dark:text-[#A1A1A1]" />
                    <span>Save .JSON</span>
                  </button>
                  <input
                    type="file"
                    ref={jsonFileInputRef}
                    onChange={handleImportJson}
                    accept=".json"
                    className="hidden"
                  />
                  <button
                    onClick={() => jsonFileInputRef.current?.click()}
                    className="px-2 py-1 rounded-[4px] border border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-[11px] text-[#171717] dark:text-[#EDEDED] flex items-center gap-1 cursor-pointer"
                    title="Load Project .JSON"
                  >
                    <Upload className="w-3 h-3 text-[#737373] dark:text-[#A1A1A1]" />
                    <span>Load .JSON</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Progress State */
            <div className="py-6 space-y-4 text-center">
              {progress?.isComplete ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} />
                  <h3 className="text-sm font-medium text-[#171717] dark:text-[#EDEDED]">Export Successfully Finished</h3>
                  <p className="text-xs text-[#737373] dark:text-[#A1A1A1]">
                    Your file has been encoded cleanly and downloaded directly in your browser.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-10 h-10 mx-auto rounded-[6px] bg-[#F5F5F5] dark:bg-[#222222] flex items-center justify-center border border-[#E5E5E5] dark:border-[#2A2A2A]">
                    <Loader2 className="w-5 h-5 text-[#3B82F6] animate-spin" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xs font-medium text-[#171717] dark:text-[#EDEDED]">Encoding Timeline in Chunks...</h3>
                  <p className="text-xs text-[#737373] dark:text-[#A1A1A1] tabular-nums">{progress?.statusText}</p>

                  {/* Progress bar */}
                  <div className="w-full bg-[#E5E5E5] dark:bg-[#2A2A2A] rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#3B82F6] h-full transition-all duration-150"
                      style={{ width: `${progress?.percentage || 0}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#737373] dark:text-[#A1A1A1] pt-1">
                    <span className="tabular-nums font-mono text-[#3B82F6]">
                      {progress?.percentage}%
                    </span>
                    {progress?.etaText && (
                      <span className="tabular-nums font-mono">
                        {progress.etaText}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer CTAs */}
        <div className="h-12 px-4 border-t border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#FAFAFA] dark:bg-[#151515] flex items-center justify-end gap-2 shrink-0">
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
                className="px-4 py-1.5 rounded-[6px] bg-[#171717] hover:bg-[#262626] text-white dark:bg-[#EDEDED] dark:hover:bg-white dark:text-[#171717] text-xs font-normal transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
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
