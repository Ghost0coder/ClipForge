import React, { useState, useEffect } from 'react';
import { X, Volume2, VolumeX, Mic, Music, Sliders, Shield, Zap, Sparkles } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';

export const AudioMixerModal = () => {
  const {
    project,
    isMixerModalOpen,
    setMixerModalOpen,
    setTrackVolume,
    toggleTrackMute,
    updateProjectSettings,
    isPlaying,
  } = useEditorStore();

  const [soloTrackId, setSoloTrackId] = useState(null);
  const [meterLevels, setMeterLevels] = useState({});

  // Simulate live audio meter peak levels during playback
  useEffect(() => {
    if (!isMixerModalOpen) return;

    let animId;
    const updateMeters = () => {
      const newLevels = {};
      if (isPlaying) {
        project.tracks.forEach((t) => {
          if (t.muted || (soloTrackId && soloTrackId !== t.id)) {
            newLevels[t.id] = 0;
          } else {
            const vol = t.volume !== undefined ? t.volume : 1;
            // Generate lively natural VU meter oscillations
            const base = Math.sin(Date.now() * 0.01 + t.id.charCodeAt(0)) * 0.25 + 0.65;
            newLevels[t.id] = Math.min(100, Math.max(5, Math.round(base * vol * 90)));
          }
        });
        // Master meter level
        const masterVol = project.masterVolume !== undefined ? project.masterVolume : 1;
        newLevels['master'] = Math.min(100, Math.max(10, Math.round(masterVol * 80 + Math.random() * 8)));
      } else {
        project.tracks.forEach((t) => {
          newLevels[t.id] = 0;
        });
        newLevels['master'] = 0;
      }
      setMeterLevels(newLevels);
      animId = requestAnimationFrame(updateMeters);
    };

    animId = requestAnimationFrame(updateMeters);
    return () => cancelAnimationFrame(animId);
  }, [isMixerModalOpen, isPlaying, project.tracks, soloTrackId, project.masterVolume]);

  if (!isMixerModalOpen) return null;

  const masterVol = project.masterVolume !== undefined ? project.masterVolume : 1.0;
  const masterLimiter = project.masterLimiter !== undefined ? project.masterLimiter : true;
  const autoDucking = project.autoDucking || { enabled: false, amount: 60, fadeDuration: 0.4 };

  const handlePanChange = (trackId, val) => {
    const updatedTracks = project.tracks.map((t) =>
      t.id === trackId ? { ...t, pan: parseFloat(val) } : t
    );
    useEditorStore.setState((state) => ({
      project: { ...state.project, tracks: updatedTracks, updatedAt: Date.now() },
    }));
  };

  const handleSoloToggle = (trackId) => {
    setSoloTrackId((prev) => (prev === trackId ? null : trackId));
  };

  const handleMasterVolChange = (val) => {
    updateProjectSettings({ masterVolume: parseFloat(val) });
  };

  const handleLimiterToggle = (enabled) => {
    updateProjectSettings({ masterLimiter: enabled });
  };

  const handleAutoDuckingToggle = (enabled) => {
    updateProjectSettings({
      autoDucking: { ...autoDucking, enabled },
    });
  };

  const handleAutoDuckingChange = (key, val) => {
    updateProjectSettings({
      autoDucking: { ...autoDucking, [key]: val },
    });
  };

  // Helper to format dB readout from 0..2 linear volume
  const formatDb = (vol) => {
    if (vol <= 0.001) return '-inf';
    const db = 20 * Math.log10(vol);
    return (db > 0 ? `+${db.toFixed(1)}` : db.toFixed(1)) + ' dB';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-white dark:bg-[#1A1A1A] rounded-[8px] border border-[#E5E5E5] dark:border-[#2A2A2A] shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-[#171717] dark:text-[#EDEDED]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E5E5] dark:border-[#2A2A2A] shrink-0">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#3B82F6]" strokeWidth={1.5} />
            <h2 className="text-sm font-semibold">Audio Mixer & Master Limiter</h2>
            <span className="text-[11px] text-[#737373] dark:text-[#A1A1A1] ml-2 hidden sm:inline">
              Multi-channel track faders, panning, and clip safety
            </span>
          </div>
          <button
            onClick={() => setMixerModalOpen(false)}
            className="p-1 rounded-[6px] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] transition-colors cursor-pointer"
            aria-label="Close mixer"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Channels & Master Container */}
        <div className="flex-1 overflow-x-auto p-4 flex gap-4 min-h-[360px]">
          {/* Individual Track Strips */}
          <div className="flex-1 flex gap-2.5 overflow-x-auto pb-2">
            {project.tracks.map((track, idx) => {
              const vol = track.volume !== undefined ? track.volume : 1.0;
              const pan = track.pan !== undefined ? track.pan : 0;
              const isMuted = track.muted || (soloTrackId && soloTrackId !== track.id);
              const isSolo = soloTrackId === track.id;
              const meter = meterLevels[track.id] || 0;

              return (
                <div
                  key={track.id}
                  className={`w-28 sm:w-32 shrink-0 bg-[#FAFAFA] dark:bg-[#141414] rounded-[6px] border p-2.5 flex flex-col justify-between transition-colors ${
                    isSolo
                      ? 'border-amber-500/60 ring-1 ring-amber-500/30'
                      : 'border-[#E5E5E5] dark:border-[#2A2A2A]'
                  }`}
                >
                  {/* Track Label */}
                  <div className="text-center pb-2 border-b border-[#E5E5E5] dark:border-[#2A2A2A]">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      {track.type === 'audio' ? (
                        <Music className="w-3 h-3 text-emerald-500" strokeWidth={1.5} />
                      ) : (
                        <Volume2 className="w-3 h-3 text-[#3B82F6]" strokeWidth={1.5} />
                      )}
                      <span className="text-xs font-medium truncate max-w-[90px]" title={track.name}>
                        {track.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1] uppercase tracking-wider">
                      CH {idx + 1}
                    </span>
                  </div>

                  {/* Pan Knobs / Slider */}
                  <div className="py-2 text-center">
                    <div className="flex justify-between items-center text-[10px] text-[#737373] dark:text-[#A1A1A1] mb-1">
                      <span>PAN</span>
                      <span className="font-mono text-[10px] tabular-nums">
                        {pan === 0 ? 'C' : pan < 0 ? `L${Math.abs(Math.round(pan * 100))}` : `R${Math.round(pan * 100)}`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-1"
                      max="1"
                      step="0.05"
                      value={pan}
                      onChange={(e) => handlePanChange(track.id, e.target.value)}
                      onDoubleClick={() => handlePanChange(track.id, 0)}
                      title="Double click to center"
                      className="w-full h-1.5 bg-[#E5E5E5] dark:bg-[#2A2A2A] rounded-lg appearance-none cursor-pointer accent-[#3B82F6]"
                    />
                  </div>

                  {/* Fader & Meter Area */}
                  <div className="flex-1 flex items-center justify-center gap-3 py-3 min-h-[140px]">
                    {/* Vertical Fader */}
                    <div className="flex flex-col items-center h-full justify-center">
                      <input
                        type="range"
                        min="0"
                        max="1.5"
                        step="0.01"
                        value={vol}
                        onChange={(e) => setTrackVolume(track.id, parseFloat(e.target.value))}
                        className="h-28 w-2 appearance-none bg-[#E5E5E5] dark:bg-[#2A2A2A] rounded-full outline-none cursor-pointer accent-[#171717] dark:accent-[#EDEDED]"
                        style={{
                          writingMode: 'vertical-lr',
                          direction: 'rtl',
                        }}
                      />
                    </div>

                    {/* Peak Level Meter */}
                    <div className="w-3 h-28 bg-[#E5E5E5] dark:bg-[#2A2A2A] rounded-[2px] p-0.5 flex flex-col justify-end overflow-hidden">
                      <div
                        className="w-full rounded-[1px] transition-all duration-75"
                        style={{
                          height: `${meter}%`,
                          backgroundColor:
                            meter > 90 ? '#EF4444' : meter > 75 ? '#F59E0B' : '#10B981',
                        }}
                      />
                    </div>
                  </div>

                  {/* dB readout */}
                  <div className="text-center font-mono text-[11px] text-[#737373] dark:text-[#A1A1A1] tabular-nums mb-2">
                    {formatDb(vol)}
                  </div>

                  {/* Mute & Solo Buttons */}
                  <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A]">
                    <button
                      type="button"
                      onClick={() => toggleTrackMute(track.id)}
                      className={`py-1 text-[11px] font-medium rounded-[4px] border transition-colors cursor-pointer ${
                        track.muted
                          ? 'bg-red-500 text-white border-red-500'
                          : 'bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] text-[#737373] dark:text-[#A1A1A1] hover:bg-[#F5F5F5] dark:hover:bg-[#262626]'
                      }`}
                    >
                      MUTE
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSoloToggle(track.id)}
                      className={`py-1 text-[11px] font-medium rounded-[4px] border transition-colors cursor-pointer ${
                        isSolo
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] text-[#737373] dark:text-[#A1A1A1] hover:bg-[#F5F5F5] dark:hover:bg-[#262626]'
                      }`}
                    >
                      SOLO
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Master Strip */}
          <div className="w-32 sm:w-36 shrink-0 bg-blue-50/50 dark:bg-blue-950/20 rounded-[6px] border border-[#3B82F6]/30 p-2.5 flex flex-col justify-between">
            <div className="text-center pb-2 border-b border-[#3B82F6]/20">
              <span className="text-xs font-semibold text-[#3B82F6] block">MASTER</span>
              <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1]">OUTPUT BUS</span>
            </div>

            {/* Limiter Status Badge */}
            <div className="my-2 p-1.5 rounded-[4px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-[#3B82F6]" strokeWidth={1.5} />
                <span className="text-[10px] font-medium">Limiter</span>
              </div>
              <input
                type="checkbox"
                checked={masterLimiter}
                onChange={(e) => handleLimiterToggle(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-[#3B82F6] cursor-pointer"
                title="Prevent audio distortion and clipping in export"
              />
            </div>

            {/* Master Fader & Meter */}
            <div className="flex-1 flex items-center justify-center gap-3 py-3 min-h-[140px]">
              <div className="flex flex-col items-center h-full justify-center">
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.01"
                  value={masterVol}
                  onChange={(e) => handleMasterVolChange(e.target.value)}
                  className="h-28 w-2.5 appearance-none bg-[#E5E5E5] dark:bg-[#2A2A2A] rounded-full outline-none cursor-pointer accent-[#3B82F6]"
                  style={{
                    writingMode: 'vertical-lr',
                    direction: 'rtl',
                  }}
                />
              </div>

              {/* Master Stereo Peak Meter */}
              <div className="flex gap-1 h-28">
                <div className="w-2.5 h-full bg-[#E5E5E5] dark:bg-[#2A2A2A] rounded-[2px] p-0.5 flex flex-col justify-end overflow-hidden">
                  <div
                    className="w-full rounded-[1px] transition-all duration-75"
                    style={{
                      height: `${meterLevels['master'] || 0}%`,
                      backgroundColor:
                        (meterLevels['master'] || 0) > 95
                          ? '#EF4444'
                          : (meterLevels['master'] || 0) > 80
                          ? '#F59E0B'
                          : '#3B82F6',
                    }}
                  />
                </div>
                <div className="w-2.5 h-full bg-[#E5E5E5] dark:bg-[#2A2A2A] rounded-[2px] p-0.5 flex flex-col justify-end overflow-hidden">
                  <div
                    className="w-full rounded-[1px] transition-all duration-75"
                    style={{
                      height: `${Math.max(0, (meterLevels['master'] || 0) - 4)}%`,
                      backgroundColor:
                        (meterLevels['master'] || 0) > 95
                          ? '#EF4444'
                          : (meterLevels['master'] || 0) > 80
                          ? '#F59E0B'
                          : '#3B82F6',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Readout */}
            <div className="text-center font-mono text-[11px] text-[#3B82F6] font-medium tabular-nums mb-2">
              {formatDb(masterVol)}
            </div>

            <div className="pt-2 border-t border-[#3B82F6]/20 text-center">
              <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1]">
                {masterLimiter ? 'Soft Knee Limiter Active' : 'Limiter Bypassed'}
              </span>
            </div>
          </div>
        </div>

        {/* Auto-Ducking Toolbar Footer */}
        <div className="p-3 bg-[#FAFAFA] dark:bg-[#141414] border-t border-[#E5E5E5] dark:border-[#2A2A2A] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.5} />
            <span className="font-medium">Auto-Ducking:</span>
            <label className="flex items-center gap-1.5 cursor-pointer text-[#737373] dark:text-[#A1A1A1]">
              <input
                type="checkbox"
                checked={autoDucking.enabled}
                onChange={(e) => handleAutoDuckingToggle(e.target.checked)}
                className="rounded text-[#3B82F6]"
              />
              <span>Lower music when voice or speech is active</span>
            </label>
          </div>

          {autoDucking.enabled && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[#737373] dark:text-[#A1A1A1] text-[11px]">Ducking Amount:</span>
                <input
                  type="range"
                  min="20"
                  max="90"
                  value={autoDucking.amount}
                  onChange={(e) => handleAutoDuckingChange('amount', parseInt(e.target.value))}
                  className="w-24 accent-[#3B82F6] cursor-pointer"
                />
                <span className="font-mono text-[11px] tabular-nums">-{autoDucking.amount}%</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[#737373] dark:text-[#A1A1A1] text-[11px]">Fade Speed:</span>
                <input
                  type="range"
                  min="0.1"
                  max="1.5"
                  step="0.1"
                  value={autoDucking.fadeDuration}
                  onChange={(e) => handleAutoDuckingChange('fadeDuration', parseFloat(e.target.value))}
                  className="w-20 accent-[#3B82F6] cursor-pointer"
                />
                <span className="font-mono text-[11px] tabular-nums">{autoDucking.fadeDuration}s</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
