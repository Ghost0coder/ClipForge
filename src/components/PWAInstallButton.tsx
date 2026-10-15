import React, { useState } from 'react';
import { Download, Share2, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../utils/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
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
        className={`flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium shadow-md shadow-violet-950/40 transition-all cursor-pointer ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-1.5 text-xs'
        }`}
        title="Install ClipForge as a desktop/mobile app"
      >
        <Download className="w-3.5 h-3.5 text-white" />
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
          className={`flex items-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-950/30 hover:bg-violet-900/40 text-violet-200 font-medium transition-all cursor-pointer ${
            compact ? 'px-2 py-1.5 text-xs' : 'px-2.5 py-1.5 text-xs'
          }`}
          title="Install ClipForge on Home Screen"
        >
          <Smartphone className="w-3.5 h-3.5 text-violet-400" />
          <span>Install</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[#141620] border border-[#272b3c] p-5 shadow-2xl text-slate-200">
              <div className="flex items-center justify-between mb-3 border-b border-[#232738] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-400 flex items-center justify-center">
                    <Smartphone className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Install on iPhone / iPad</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-slate-400 hover:text-white rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-300 leading-relaxed my-2">
                <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#181b26] border border-white/5">
                  <span className="w-5 h-5 rounded-full bg-violet-600/30 text-violet-300 flex items-center justify-center font-bold shrink-0">
                    1
                  </span>
                  <span>
                    Tap the <strong className="text-white">Share</strong> button <Share2 className="w-3.5 h-3.5 inline mx-1 text-cyan-400" /> in the Safari toolbar.
                  </span>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#181b26] border border-white/5">
                  <span className="w-5 h-5 rounded-full bg-violet-600/30 text-violet-300 flex items-center justify-center font-bold shrink-0">
                    2
                  </span>
                  <span>
                    Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.
                  </span>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#181b26] border border-white/5">
                  <span className="w-5 h-5 rounded-full bg-violet-600/30 text-violet-300 flex items-center justify-center font-bold shrink-0">
                    3
                  </span>
                  <span>
                    Launch ClipForge from your home screen for full-screen editing!
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-xs font-bold text-white transition-colors cursor-pointer"
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
