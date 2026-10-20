import React, { useState } from 'react';
import { Download, Share2, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../utils/usePWAInstall';

export const PWAInstallButton = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed, don't show
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={`flex items-center gap-1.5 rounded-[6px] bg-white dark:bg-[#1A1A1A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-[#171717] dark:text-[#EDEDED] border border-[#E5E5E5] dark:border-[#2A2A2A] font-normal transition-colors cursor-pointer ${
          compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1 text-xs'
        }`}
        title="Install ClipForge as a desktop/mobile app"
      >
        <Download className="w-3.5 h-3.5 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 rounded-[6px] border border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-[#171717] dark:text-[#EDEDED] font-normal transition-colors cursor-pointer ${
            compact ? 'px-2 py-1 text-xs' : 'px-2.5 py-1 text-xs'
          }`}
          title="Install ClipForge on Home Screen"
        >
          <Smartphone className="w-3.5 h-3.5 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} />
          <span>Install</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] p-4 shadow-lg text-[#171717] dark:text-[#EDEDED]">
              <div className="flex items-center justify-between mb-3 border-b border-[#E5E5E5] dark:border-[#2A2A2A] pb-2.5">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} />
                  <h3 className="text-xs font-medium text-[#171717] dark:text-[#EDEDED]">Install on iPhone / iPad</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] rounded transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>

              <div className="space-y-2.5 text-xs text-[#737373] dark:text-[#A1A1A1] my-2">
                <div className="flex items-start gap-2.5 p-2 rounded-[6px] bg-[#FAFAFA] dark:bg-[#151515] border border-[#E5E5E5] dark:border-[#2A2A2A]">
                  <span className="w-5 h-5 rounded-full bg-[#E5E5E5] dark:bg-[#2A2A2A] text-[#171717] dark:text-[#EDEDED] flex items-center justify-center font-normal shrink-0 text-[11px]">
                    1
                  </span>
                  <span>
                    Tap the <strong className="text-[#171717] dark:text-[#EDEDED]">Share</strong> button <Share2 className="w-3.5 h-3.5 inline mx-1 text-[#3B82F6]" strokeWidth={1.5} /> in Safari.
                  </span>
                </div>

                <div className="flex items-start gap-2.5 p-2 rounded-[6px] bg-[#FAFAFA] dark:bg-[#151515] border border-[#E5E5E5] dark:border-[#2A2A2A]">
                  <span className="w-5 h-5 rounded-full bg-[#E5E5E5] dark:bg-[#2A2A2A] text-[#171717] dark:text-[#EDEDED] flex items-center justify-center font-normal shrink-0 text-[11px]">
                    2
                  </span>
                  <span>
                    Scroll down and tap <strong className="text-[#171717] dark:text-[#EDEDED]">Add to Home Screen</strong>.
                  </span>
                </div>

                <div className="flex items-start gap-2.5 p-2 rounded-[6px] bg-[#FAFAFA] dark:bg-[#151515] border border-[#E5E5E5] dark:border-[#2A2A2A]">
                  <span className="w-5 h-5 rounded-full bg-[#E5E5E5] dark:bg-[#2A2A2A] text-[#171717] dark:text-[#EDEDED] flex items-center justify-center font-normal shrink-0 text-[11px]">
                    3
                  </span>
                  <span>
                    Launch ClipForge from your home screen for clean distraction-free editing.
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-3 w-full py-2 rounded-[6px] bg-[#171717] hover:bg-[#262626] text-white dark:bg-[#EDEDED] dark:hover:bg-white dark:text-[#171717] text-xs font-normal transition-colors cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
