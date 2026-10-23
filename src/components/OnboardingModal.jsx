import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Film,
  Move,
  Layers,
  Download,
  ArrowRight,
  ArrowLeft,
  Check,
  HelpCircle,
} from 'lucide-react';

const ONBOARDING_STEPS = [
  {
    step: 1,
    title: 'Welcome to ClipForge',
    subtitle: 'Minimalist, powerful creator studio',
    description:
      'ClipForge is an ultra-fast, CapCut-inspired browser video editor. Everything runs 100% locally with multi-track editing, undo/redo, and zero watermarks required.',
    icon: Film,
    badge: 'Step 1 of 5',
    features: ['Non-destructive editing', 'Autosaved every 5 seconds', 'Offline PWA ready'],
  },
  {
    step: 2,
    title: 'Media & Gemini AI Studio',
    subtitle: 'Import footage or generate scenes',
    description:
      'Upload videos, photos, and music in the Media tab, or switch to AI Studio to turn scripts into scenes, generate realistic voiceovers, and remove audio silence with one tap.',
    icon: Sparkles,
    badge: 'Step 2 of 5',
    features: ['Script-to-Video generation', 'Multi-lingual Text-to-Speech', 'Smart highlight detection'],
  },
  {
    step: 3,
    title: 'Direct Manipulation & Masks',
    subtitle: 'Interact directly on the preview',
    description:
      'Click or tap any clip on the preview to drag, scale, and rotate with corner handles. Use the eyedropper for chroma key, shape masks, and background removal.',
    icon: Move,
    badge: 'Step 3 of 5',
    features: ['Corner resize & rotation', 'Center & edge snapping guides', 'Green screen chroma key'],
  },
  {
    step: 4,
    title: 'Multi-Track Timeline',
    subtitle: 'Precision slicing & beat sync',
    description:
      'Split clips with "S", trim with touch or mouse handles, add keyframe diamond animations, view audio waveforms, and snap edits to rhythmic beat markers.',
    icon: Layers,
    badge: 'Step 4 of 5',
    features: ['Waveform visualizations', 'Auto beat detection (128 BPM)', 'Keyframe opacity & motion'],
  },
  {
    step: 5,
    title: 'Export & Project Management',
    subtitle: 'Full HD & 4K with custom watermark',
    description:
      'Render videos in MP4, WebM, GIF, or audio MP3 with accurate ETA. Save and load project JSON files, and toggle an optional brand watermark.',
    icon: Download,
    badge: 'Step 5 of 5',
    features: ['Up to 4K 60FPS export', 'Export current frame as PNG', 'Batch memory protection'],
  },
];

export const OnboardingModal = ({ isOpen, onClose }) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setCurrentStepIdx(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentStep = ONBOARDING_STEPS[currentStepIdx];
  const StepIcon = currentStep.icon;
  const isLast = currentStepIdx === ONBOARDING_STEPS.length - 1;

  const handleFinish = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem('clipforge_onboarding_completed', 'true');
      } catch (e) {}
    }
    onClose();
  };

  const handleNext = () => {
    if (isLast) {
      handleFinish();
    } else {
      setCurrentStepIdx((prev) => Math.min(ONBOARDING_STEPS.length - 1, prev + 1));
    }
  };

  const handlePrev = () => {
    setCurrentStepIdx((prev) => Math.max(0, prev - 1));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div
        className="bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[8px] w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-[#171717] dark:text-[#EDEDED] transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-11 px-4 border-b border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center justify-between bg-[#FAFAFA] dark:bg-[#151515]">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-[#3B82F6]" strokeWidth={1.5} />
            <span className="text-xs font-medium text-[#171717] dark:text-[#EDEDED]">
              ClipForge Quick Tour
            </span>
          </div>
          <button
            onClick={handleFinish}
            className="p-1 text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] rounded-[4px] transition-colors cursor-pointer"
            title="Skip Tour"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Visual Step Icon & Badge */}
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-[8px] bg-[#F5F5F5] dark:bg-[#242424] border border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center justify-center text-[#171717] dark:text-[#EDEDED]">
              <StepIcon className="w-6 h-6 text-[#3B82F6]" strokeWidth={1.5} />
            </div>
            <span className="text-[10px] font-medium text-[#737373] dark:text-[#A1A1A1] bg-[#F5F5F5] dark:bg-[#222222] px-2 py-0.5 rounded-full border border-[#E5E5E5] dark:border-[#2A2A2A]">
              {currentStep.badge}
            </span>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#171717] dark:text-[#EDEDED]">
              {currentStep.title}
            </h3>
            <p className="text-xs text-[#3B82F6] font-medium mt-0.5">
              {currentStep.subtitle}
            </p>
            <p className="text-xs text-[#737373] dark:text-[#A1A1A1] leading-relaxed mt-2">
              {currentStep.description}
            </p>
          </div>

          {/* Key Feature highlights */}
          <div className="p-3 rounded-[6px] bg-[#FAFAFA] dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#2A2A2A] space-y-1.5">
            {currentStep.features.map((feat, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-[#171717] dark:text-[#EDEDED]">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={2} />
                <span>{feat}</span>
              </div>
            ))}
          </div>

          {/* Step Progress Indicators */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5">
              {ONBOARDING_STEPS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStepIdx(idx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === currentStepIdx
                      ? 'w-6 bg-[#3B82F6]'
                      : 'w-1.5 bg-[#E5E5E5] dark:bg-[#333333] hover:bg-[#A3A3A3]'
                  }`}
                  aria-label={`Go to step ${idx + 1}`}
                />
              ))}
            </div>

            <label className="flex items-center gap-1.5 text-[11px] text-[#737373] dark:text-[#A1A1A1] cursor-pointer">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="rounded-[3px] accent-[#3B82F6] cursor-pointer"
              />
              <span>Don't show on launch</span>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="h-13 px-4 border-t border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#FAFAFA] dark:bg-[#151515] flex items-center justify-between">
          <button
            onClick={handleFinish}
            className="text-xs text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] py-2 px-2 transition-colors cursor-pointer"
          >
            Skip
          </button>

          <div className="flex items-center gap-2">
            {currentStepIdx > 0 && (
              <button
                onClick={handlePrev}
                className="min-h-[40px] px-3 rounded-[6px] border border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-xs text-[#171717] dark:text-[#EDEDED] font-normal transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Back</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="min-h-[40px] px-4 rounded-[6px] bg-[#171717] hover:bg-[#262626] text-white dark:bg-[#EDEDED] dark:hover:bg-white dark:text-[#171717] text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>{isLast ? 'Get Started' : 'Next'}</span>
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
