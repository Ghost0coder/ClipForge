 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import React, { useState } from 'react';
import {
  X,
  Sliders,

  Crop,


  Volume2,
  Key,
  FlipHorizontal,
  FlipVertical,


  Trash2,


} from 'lucide-react';
import { useEditorStore } from '../store/editorStore';

import { FILTERS_LIST, GOOGLE_FONTS } from '../utils/sampleData';






export const RightInspector = ({ mobileDrawer = false, onClose }) => {
  const {
    getSelectedClip,
    updateClip,
    deselectAll,
    currentTime,
    addKeyframe,
    removeKeyframe,
    extractAudioFromClip,
    autoReframe,
  } = useEditorStore();

  const [activeTab, setActiveTab] = useState('transform');

  const clip = getSelectedClip();

  if (!clip) {
    if (mobileDrawer) return null;
    return (
      <aside className="w-72 md:w-80 border-l border-[#222638] bg-[#12141c] p-6 flex flex-col items-center justify-center text-center text-slate-500 select-none shrink-0 h-full overflow-hidden">
        <Sliders className="w-8 h-8 text-slate-600 mb-2" />
        <h3 className="text-sm font-semibold text-slate-400">No Clip Selected</h3>
        <p className="text-xs text-slate-600 mt-1 max-w-[200px]">
          Click on any video, text, sticker or audio clip on the timeline to inspect and edit properties.
        </p>
      </aside>
    );
  }

  const isText = clip.type === 'text';
  const isAudioOrVideo = clip.type === 'audio' || clip.type === 'video';
  const isVisual = clip.type !== 'audio';

  const inspectorContent = (
    <>
      {/* Inspector Header */}
      <div className="h-11 px-3 border-b border-[#222638] flex items-center justify-between shrink-0 bg-[#10121a]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-violet-950 text-violet-300 border border-violet-500/30 shrink-0">
            {clip.type}
          </span>
          <span className="text-xs font-bold text-slate-200 truncate">{clip.name}</span>
        </div>
        <button
          onClick={() => {
            deselectAll();
            _optionalChain([onClose, 'optionalCall', _ => _()]);
          }}
          className="p-1.5 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
          title="Deselect"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Selector Strip */}
      <div className="flex border-b border-[#222638] bg-[#0e1017] p-1 gap-1 overflow-x-auto text-xs shrink-0">
        {isVisual && (
          <button
            onClick={() => setActiveTab('transform')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              activeTab === 'transform' ? 'bg-[#1e2233] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Transform
          </button>
        )}
        {isText && (
          <button
            onClick={() => setActiveTab('text')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              activeTab === 'text' ? 'bg-[#1e2233] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Text
          </button>
        )}
        {isVisual && (
          <button
            onClick={() => setActiveTab('color')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              activeTab === 'color' ? 'bg-[#1e2233] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Color/Filter
          </button>
        )}
        {isAudioOrVideo && (
          <button
            onClick={() => setActiveTab('audio')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              activeTab === 'audio' ? 'bg-[#1e2233] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Audio
          </button>
        )}
        {isVisual && (
          <button
            onClick={() => setActiveTab('speed')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              activeTab === 'speed' ? 'bg-[#1e2233] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Speed
          </button>
        )}
        {isVisual && (
          <button
            onClick={() => setActiveTab('mask')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              activeTab === 'mask' ? 'bg-[#1e2233] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Mask/Chroma
          </button>
        )}
        <button
          onClick={() => setActiveTab('keyframes')}
          className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
            activeTab === 'keyframes' ? 'bg-[#1e2233] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Keyframes
        </button>
      </div>

      {/* Tab Panels Body */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4 min-h-0">
        {/* TRANSFORM TAB */}
        {activeTab === 'transform' && isVisual && (
          <div className="space-y-3.5 text-xs">
            {/* Position X & Y */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Position X / Y</span>
                <span className="font-mono text-slate-400">
                  {clip.x}%, {clip.y}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={clip.x}
                  onChange={(e) => updateClip(clip.id, { x: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={clip.y}
                  onChange={(e) => updateClip(clip.id, { y: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>

            {/* Scale */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Scale Size</span>
                <span className="font-mono text-slate-400">{clip.scale.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.05"
                value={clip.scale}
                onChange={(e) => updateClip(clip.id, { scale: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>

            {/* Rotation */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Rotation Angle</span>
                <span className="font-mono text-slate-400">{clip.rotation}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                value={clip.rotation}
                onChange={(e) => updateClip(clip.id, { rotation: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            {/* Opacity */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Opacity</span>
                <span className="font-mono text-slate-400">{Math.round(clip.opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={clip.opacity}
                onChange={(e) => updateClip(clip.id, { opacity: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>

            {/* Flip Controls */}
            <div className="pt-2 border-t border-[#232738] flex items-center justify-between">
              <span className="text-slate-300">Flip / Mirror</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => updateClip(clip.id, { flipH: !clip.flipH })}
                  className={`p-1.5 rounded-md border border-[#232738] transition-colors ${
                    clip.flipH ? 'bg-violet-600 text-white' : 'bg-[#181b26] text-slate-400 hover:text-white'
                  }`}
                  title="Flip Horizontal"
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => updateClip(clip.id, { flipV: !clip.flipV })}
                  className={`p-1.5 rounded-md border border-[#232738] transition-colors ${
                    clip.flipV ? 'bg-violet-600 text-white' : 'bg-[#181b26] text-slate-400 hover:text-white'
                  }`}
                  title="Flip Vertical"
                >
                  <FlipVertical className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Blend Mode */}
            <div className="pt-2 border-t border-[#232738]">
              <span className="text-slate-300 block mb-1.5">Blend Mode</span>
              <select
                value={clip.blendMode || 'normal'}
                onChange={(e) => updateClip(clip.id, { blendMode: e.target.value  })}
                className="w-full bg-[#181b26] border border-[#232738] rounded-lg px-2 py-1.5 text-xs text-slate-200 outline-none"
              >
                <option value="normal">Normal</option>
                <option value="screen">Screen (Lighten overlay)</option>
                <option value="multiply">Multiply (Darken overlay)</option>
                <option value="overlay">Overlay (High contrast)</option>
                <option value="lighten">Lighten</option>
                <option value="darken">Darken</option>
                <option value="color-dodge">Color Dodge</option>
                <option value="difference">Difference</option>
              </select>
            </div>

            {/* Crop Margins */}
            <div className="pt-2 border-t border-[#232738] space-y-2">
              <span className="text-slate-300 block font-semibold">Crop Insets (%)</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500">Top ({_optionalChain([clip, 'access', _2 => _2.crop, 'optionalAccess', _3 => _3.top]) || 0}%)</span>
                  <input
                    type="range"
                    min="0"
                    max="45"
                    value={_optionalChain([clip, 'access', _4 => _4.crop, 'optionalAccess', _5 => _5.top]) || 0}
                    onChange={(e) =>
                      updateClip(clip.id, {
                        crop: {
                          top: parseInt(e.target.value),
                          bottom: _optionalChain([clip, 'access', _6 => _6.crop, 'optionalAccess', _7 => _7.bottom]) || 0,
                          left: _optionalChain([clip, 'access', _8 => _8.crop, 'optionalAccess', _9 => _9.left]) || 0,
                          right: _optionalChain([clip, 'access', _10 => _10.crop, 'optionalAccess', _11 => _11.right]) || 0,
                        },
                      })
                    }
                    className="w-full"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">Bottom ({_optionalChain([clip, 'access', _12 => _12.crop, 'optionalAccess', _13 => _13.bottom]) || 0}%)</span>
                  <input
                    type="range"
                    min="0"
                    max="45"
                    value={_optionalChain([clip, 'access', _14 => _14.crop, 'optionalAccess', _15 => _15.bottom]) || 0}
                    onChange={(e) =>
                      updateClip(clip.id, {
                        crop: {
                          top: _optionalChain([clip, 'access', _16 => _16.crop, 'optionalAccess', _17 => _17.top]) || 0,
                          bottom: parseInt(e.target.value),
                          left: _optionalChain([clip, 'access', _18 => _18.crop, 'optionalAccess', _19 => _19.left]) || 0,
                          right: _optionalChain([clip, 'access', _20 => _20.crop, 'optionalAccess', _21 => _21.right]) || 0,
                        },
                      })
                    }
                    className="w-full"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">Left ({_optionalChain([clip, 'access', _22 => _22.crop, 'optionalAccess', _23 => _23.left]) || 0}%)</span>
                  <input
                    type="range"
                    min="0"
                    max="45"
                    value={_optionalChain([clip, 'access', _24 => _24.crop, 'optionalAccess', _25 => _25.left]) || 0}
                    onChange={(e) =>
                      updateClip(clip.id, {
                        crop: {
                          top: _optionalChain([clip, 'access', _26 => _26.crop, 'optionalAccess', _27 => _27.top]) || 0,
                          bottom: _optionalChain([clip, 'access', _28 => _28.crop, 'optionalAccess', _29 => _29.bottom]) || 0,
                          left: parseInt(e.target.value),
                          right: _optionalChain([clip, 'access', _30 => _30.crop, 'optionalAccess', _31 => _31.right]) || 0,
                        },
                      })
                    }
                    className="w-full"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">Right ({_optionalChain([clip, 'access', _32 => _32.crop, 'optionalAccess', _33 => _33.right]) || 0}%)</span>
                  <input
                    type="range"
                    min="0"
                    max="45"
                    value={_optionalChain([clip, 'access', _34 => _34.crop, 'optionalAccess', _35 => _35.right]) || 0}
                    onChange={(e) =>
                      updateClip(clip.id, {
                        crop: {
                          top: _optionalChain([clip, 'access', _36 => _36.crop, 'optionalAccess', _37 => _37.top]) || 0,
                          bottom: _optionalChain([clip, 'access', _38 => _38.crop, 'optionalAccess', _39 => _39.bottom]) || 0,
                          left: _optionalChain([clip, 'access', _40 => _40.crop, 'optionalAccess', _41 => _41.left]) || 0,
                          right: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Quick Actions: Auto-Reframe & Extract Audio */}
            <div className="pt-2 border-t border-[#232738] space-y-1.5">
              <button
                onClick={autoReframe}
                className="w-full py-1.5 px-2 rounded-lg bg-[#181b26] hover:bg-[#202436] border border-[#272b3c] text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Crop className="w-3.5 h-3.5 text-cyan-400" /> Auto-Reframe for Aspect Ratio
              </button>

              {clip.type === 'video' && (
                <button
                  onClick={() => extractAudioFromClip(clip.id)}
                  className="w-full py-1.5 px-2 rounded-lg bg-[#181b26] hover:bg-[#202436] border border-[#272b3c] text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> Extract Audio to Dedicated Track
                </button>
              )}
            </div>
          </div>
        )}

        {/* TEXT TAB */}
        {activeTab === 'text' && isText && clip.textProps && (
          <div className="space-y-3.5 text-xs">
            {/* Text Input */}
            <div>
              <span className="text-slate-300 block mb-1">Text Content</span>
              <textarea
                value={clip.textProps.text}
                onChange={(e) => updateClip(clip.id, { textProps: { text: e.target.value } })}
                className="w-full h-18 bg-[#181b26] border border-[#232738] rounded-lg p-2 text-xs text-white outline-none resize-none focus:border-violet-500/50"
              />
            </div>

            {/* Font Family (50+ Google Fonts) */}
            <div>
              <span className="text-slate-300 block mb-1">Font Family</span>
              <select
                value={clip.textProps.fontFamily}
                onChange={(e) => updateClip(clip.id, { textProps: { fontFamily: e.target.value } })}
                className="w-full bg-[#181b26] border border-[#232738] rounded-lg px-2 py-1.5 text-xs text-white outline-none"
              >
                {GOOGLE_FONTS.map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.name} ({f.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Font Size */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Font Size</span>
                <span className="font-mono text-slate-400">{clip.textProps.fontSize}px</span>
              </div>
              <input
                type="range"
                min="18"
                max="140"
                value={clip.textProps.fontSize}
                onChange={(e) =>
                  updateClip(clip.id, { textProps: { fontSize: parseInt(e.target.value) } })
                }
                className="w-full"
              />
            </div>

            {/* Colors: Text & Gradient */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-300 block mb-1">Text Color</span>
                <div className="flex items-center gap-1.5 bg-[#181b26] border border-[#232738] rounded-lg p-1">
                  <input
                    type="color"
                    value={clip.textProps.color}
                    onChange={(e) => updateClip(clip.id, { textProps: { color: e.target.value } })}
                    className="w-6 h-6 rounded border-none bg-transparent cursor-pointer"
                  />
                  <span className="font-mono text-[11px] text-slate-300 uppercase">
                    {clip.textProps.color}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-300 block mb-1">Stroke Color</span>
                <div className="flex items-center gap-1.5 bg-[#181b26] border border-[#232738] rounded-lg p-1">
                  <input
                    type="color"
                    value={clip.textProps.strokeColor || '#000000'}
                    onChange={(e) =>
                      updateClip(clip.id, {
                        textProps: { strokeColor: e.target.value, strokeWidth: _optionalChain([clip, 'access', _42 => _42.textProps, 'optionalAccess', _43 => _43.strokeWidth]) || 2 },
                      })
                    }
                    className="w-6 h-6 rounded border-none bg-transparent cursor-pointer"
                  />
                  <span className="font-mono text-[11px] text-slate-300 uppercase">
                    {clip.textProps.strokeColor || '#000000'}
                  </span>
                </div>
              </div>
            </div>

            {/* Text Animation */}
            <div>
              <span className="text-slate-300 block mb-1">Text Animation</span>
              <select
                value={clip.textProps.animation || 'none'}
                onChange={(e) =>
                  updateClip(clip.id, { textProps: { animation: e.target.value  } })
                }
                className="w-full bg-[#181b26] border border-[#232738] rounded-lg px-2 py-1.5 text-xs text-white outline-none"
              >
                <option value="none">None (Static)</option>
                <option value="typewriter">Typewriter (Character by character)</option>
                <option value="bounce">Bounce In (Kinetic impact)</option>
                <option value="glow">Neon Glow Pulse</option>
                <option value="karaoke">Karaoke Word Highlight</option>
              </select>
            </div>
          </div>
        )}

        {/* COLOR & FILTERS TAB */}
        {activeTab === 'color' && isVisual && (
          <div className="space-y-3.5 text-xs">
            {/* Filter Selector */}
            <div>
              <span className="text-slate-300 block mb-1">Filter Preset</span>
              <select
                value={clip.filter || 'none'}
                onChange={(e) => updateClip(clip.id, { filter: e.target.value })}
                className="w-full bg-[#181b26] border border-[#232738] rounded-lg px-2 py-1.5 text-xs text-white outline-none"
              >
                {FILTERS_LIST.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.category})
                  </option>
                ))}
              </select>
            </div>

            {clip.filter && clip.filter !== 'none' && (
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Filter Intensity</span>
                  <span className="font-mono text-slate-400">{clip.filterIntensity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={clip.filterIntensity}
                  onChange={(e) =>
                    updateClip(clip.id, { filterIntensity: parseInt(e.target.value) })
                  }
                  className="w-full"
                />
              </div>
            )}

            {/* Adjustments */}
            <div className="pt-2 border-t border-[#232738] space-y-3">
              <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
                Manual Color Adjustments
              </span>

              {/* Brightness */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Brightness</span>
                  <span className="font-mono text-slate-400">{_optionalChain([clip, 'access', _44 => _44.adjustments, 'optionalAccess', _45 => _45.brightness]) || 0}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={_optionalChain([clip, 'access', _46 => _46.adjustments, 'optionalAccess', _47 => _47.brightness]) || 0}
                  onChange={(e) =>
                    updateClip(clip.id, {
                      adjustments: { ...clip.adjustments, brightness: parseInt(e.target.value) },
                    })
                  }
                  className="w-full"
                />
              </div>

              {/* Contrast */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Contrast</span>
                  <span className="font-mono text-slate-400">{_optionalChain([clip, 'access', _48 => _48.adjustments, 'optionalAccess', _49 => _49.contrast]) || 0}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={_optionalChain([clip, 'access', _50 => _50.adjustments, 'optionalAccess', _51 => _51.contrast]) || 0}
                  onChange={(e) =>
                    updateClip(clip.id, {
                      adjustments: { ...clip.adjustments, contrast: parseInt(e.target.value) },
                    })
                  }
                  className="w-full"
                />
              </div>

              {/* Saturation */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Saturation</span>
                  <span className="font-mono text-slate-400">{_optionalChain([clip, 'access', _52 => _52.adjustments, 'optionalAccess', _53 => _53.saturation]) || 0}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={_optionalChain([clip, 'access', _54 => _54.adjustments, 'optionalAccess', _55 => _55.saturation]) || 0}
                  onChange={(e) =>
                    updateClip(clip.id, {
                      adjustments: { ...clip.adjustments, saturation: parseInt(e.target.value) },
                    })
                  }
                  className="w-full"
                />
              </div>

              {/* Vignette */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Vignette Edge</span>
                  <span className="font-mono text-slate-400">{_optionalChain([clip, 'access', _56 => _56.adjustments, 'optionalAccess', _57 => _57.vignette]) || 0}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={_optionalChain([clip, 'access', _58 => _58.adjustments, 'optionalAccess', _59 => _59.vignette]) || 0}
                  onChange={(e) =>
                    updateClip(clip.id, {
                      adjustments: { ...clip.adjustments, vignette: parseInt(e.target.value) },
                    })
                  }
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* AUDIO TAB */}
        {activeTab === 'audio' && isAudioOrVideo && (
          <div className="space-y-3.5 text-xs">
            {/* Volume */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Volume</span>
                <span className="font-mono text-slate-400">
                  {Math.round((_nullishCoalesce(_optionalChain([clip, 'access', _60 => _60.audioProps, 'optionalAccess', _61 => _61.volume]), () => ( 1))) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={_nullishCoalesce(_optionalChain([clip, 'access', _62 => _62.audioProps, 'optionalAccess', _63 => _63.volume]), () => ( 1))}
                onChange={(e) =>
                  updateClip(clip.id, { audioProps: { volume: parseFloat(e.target.value) } })
                }
                className="w-full"
              />
            </div>

            {/* Fade In & Out */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-300 block mb-1">Fade In (s)</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={_optionalChain([clip, 'access', _64 => _64.audioProps, 'optionalAccess', _65 => _65.fadeIn]) || 0}
                  onChange={(e) =>
                    updateClip(clip.id, { audioProps: { fadeIn: parseFloat(e.target.value) } })
                  }
                  className="w-full bg-[#181b26] border border-[#232738] rounded-lg p-1.5 text-xs text-white"
                />
              </div>
              <div>
                <span className="text-slate-300 block mb-1">Fade Out (s)</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={_optionalChain([clip, 'access', _66 => _66.audioProps, 'optionalAccess', _67 => _67.fadeOut]) || 0}
                  onChange={(e) =>
                    updateClip(clip.id, { audioProps: { fadeOut: parseFloat(e.target.value) } })
                  }
                  className="w-full bg-[#181b26] border border-[#232738] rounded-lg p-1.5 text-xs text-white"
                />
              </div>
            </div>

            {/* Pitch Shift */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Pitch Shift</span>
                <span className="font-mono text-slate-400">{_optionalChain([clip, 'access', _68 => _68.audioProps, 'optionalAccess', _69 => _69.pitchShift]) || 0} st</span>
              </div>
              <input
                type="range"
                min="-12"
                max="12"
                value={_optionalChain([clip, 'access', _70 => _70.audioProps, 'optionalAccess', _71 => _71.pitchShift]) || 0}
                onChange={(e) =>
                  updateClip(clip.id, { audioProps: { pitchShift: parseInt(e.target.value) } })
                }
                className="w-full"
              />
            </div>

            {/* 3-Band Equalizer */}
            <div className="pt-2 border-t border-[#232738] space-y-2">
              <span className="text-slate-300 block font-semibold">3-Band Graphic Equalizer</span>
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-0.5">
                  <span>Bass</span>
                  <span className="font-mono">{_optionalChain([clip, 'access', _72 => _72.audioProps, 'optionalAccess', _73 => _73.equalizer, 'optionalAccess', _74 => _74.bass]) || 0} dB</span>
                </div>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  value={_optionalChain([clip, 'access', _75 => _75.audioProps, 'optionalAccess', _76 => _76.equalizer, 'optionalAccess', _77 => _77.bass]) || 0}
                  onChange={(e) =>
                    updateClip(clip.id, {
                      audioProps: {
                        equalizer: {
                          bass: parseInt(e.target.value),
                          mid: _optionalChain([clip, 'access', _78 => _78.audioProps, 'optionalAccess', _79 => _79.equalizer, 'optionalAccess', _80 => _80.mid]) || 0,
                          treble: _optionalChain([clip, 'access', _81 => _81.audioProps, 'optionalAccess', _82 => _82.equalizer, 'optionalAccess', _83 => _83.treble]) || 0,
                        },
                      },
                    })
                  }
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-0.5">
                  <span>Mid</span>
                  <span className="font-mono">{_optionalChain([clip, 'access', _84 => _84.audioProps, 'optionalAccess', _85 => _85.equalizer, 'optionalAccess', _86 => _86.mid]) || 0} dB</span>
                </div>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  value={_optionalChain([clip, 'access', _87 => _87.audioProps, 'optionalAccess', _88 => _88.equalizer, 'optionalAccess', _89 => _89.mid]) || 0}
                  onChange={(e) =>
                    updateClip(clip.id, {
                      audioProps: {
                        equalizer: {
                          bass: _optionalChain([clip, 'access', _90 => _90.audioProps, 'optionalAccess', _91 => _91.equalizer, 'optionalAccess', _92 => _92.bass]) || 0,
                          mid: parseInt(e.target.value),
                          treble: _optionalChain([clip, 'access', _93 => _93.audioProps, 'optionalAccess', _94 => _94.equalizer, 'optionalAccess', _95 => _95.treble]) || 0,
                        },
                      },
                    })
                  }
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-0.5">
                  <span>Treble</span>
                  <span className="font-mono">{_optionalChain([clip, 'access', _96 => _96.audioProps, 'optionalAccess', _97 => _97.equalizer, 'optionalAccess', _98 => _98.treble]) || 0} dB</span>
                </div>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  value={_optionalChain([clip, 'access', _99 => _99.audioProps, 'optionalAccess', _100 => _100.equalizer, 'optionalAccess', _101 => _101.treble]) || 0}
                  onChange={(e) =>
                    updateClip(clip.id, {
                      audioProps: {
                        equalizer: {
                          bass: _optionalChain([clip, 'access', _102 => _102.audioProps, 'optionalAccess', _103 => _103.equalizer, 'optionalAccess', _104 => _104.bass]) || 0,
                          mid: _optionalChain([clip, 'access', _105 => _105.audioProps, 'optionalAccess', _106 => _106.equalizer, 'optionalAccess', _107 => _107.mid]) || 0,
                          treble: parseInt(e.target.value),
                        },
                      },
                    })
                  }
                  className="w-full"
                />
              </div>
            </div>

            {/* Voice Changer Presets */}
            <div className="pt-2 border-t border-[#232738]">
              <span className="text-slate-300 block mb-1 font-semibold">Voice Changer Preset</span>
              <select
                value={_optionalChain([clip, 'access', _108 => _108.audioProps, 'optionalAccess', _109 => _109.voiceChanger]) || 'none'}
                onChange={(e) =>
                  updateClip(clip.id, { audioProps: { voiceChanger: e.target.value  } })
                }
                className="w-full bg-[#181b26] border border-[#232738] rounded-lg px-2 py-1.5 text-xs text-white outline-none"
              >
                <option value="none">None (Natural Voice)</option>
                <option value="chipmunk">Chipmunk (High pitch)</option>
                <option value="deep">Deep Cinematic (Low pitch)</option>
                <option value="robot">Robot Synthesizer</option>
                <option value="radio">Vintage Radio Walkie-Talkie</option>
                <option value="echo">Echo & Reverb</option>
              </select>
            </div>
          </div>
        )}

        {/* SPEED TAB */}
        {activeTab === 'speed' && isVisual && (
          <div className="space-y-3.5 text-xs">
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Speed Factor</span>
                <span className="font-mono text-slate-400">{clip.speed}x</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="10"
                step="0.1"
                value={clip.speed}
                onChange={(e) => updateClip(clip.id, { speed: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[0.5, 1.0, 2.0, 4.0].map((s) => (
                <button
                  key={s}
                  onClick={() => updateClip(clip.id, { speed: s })}
                  className={`py-1 rounded text-xs font-mono font-bold border transition-colors ${
                    clip.speed === s
                      ? 'bg-violet-600 text-white border-violet-500'
                      : 'bg-[#181b26] text-slate-400 border-[#232738] hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Speed Curves */}
            <div className="pt-2 border-t border-[#232738] space-y-1.5">
              <span className="text-slate-300 block font-semibold">Speed Curves</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'constant', label: 'Constant' },
                  { id: 'flash-in', label: 'Flash In' },
                  { id: 'flash-out', label: 'Flash Out' },
                  { id: 'bullet', label: 'Bullet Time' },
                  { id: 'hero', label: 'Hero Moment' },
                  { id: 'jump', label: 'Jump Cut' },
                ].map((curve) => (
                  <button
                    key={curve.id}
                    onClick={() => updateClip(clip.id, { speedCurve: curve.id  })}
                    className={`py-1.5 px-1 text-[10px] rounded-lg border font-medium transition-all ${
                      (clip.speedCurve || 'constant') === curve.id
                        ? 'bg-cyan-900/60 border-cyan-400 text-white'
                        : 'bg-[#181b26] border-[#272b3c] text-slate-400 hover:text-white'
                    }`}
                  >
                    {curve.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-[#232738] space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={clip.reverse || false}
                  onChange={(e) => updateClip(clip.id, { reverse: e.target.checked })}
                  className="rounded border-[#2a2f42] bg-[#181b26] text-violet-600"
                />
                <span className="text-slate-300">Reverse Playback</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={clip.freezeFrame || false}
                  onChange={(e) => updateClip(clip.id, { freezeFrame: e.target.checked })}
                  className="rounded border-[#2a2f42] bg-[#181b26] text-violet-600"
                />
                <span className="text-slate-300">Freeze Frame</span>
              </label>
            </div>
          </div>
        )}

        {/* MASK & CHROMA TAB */}
        {activeTab === 'mask' && isVisual && (
          <div className="space-y-4 text-xs">
            {/* Shape Mask */}
            <div>
              <span className="text-slate-300 block mb-1 font-semibold">Shape Mask</span>
              <select
                value={_optionalChain([clip, 'access', _110 => _110.mask, 'optionalAccess', _111 => _111.type]) || 'none'}
                onChange={(e) =>
                  updateClip(clip.id, {
                    mask: {
                      type: e.target.value ,
                      size: _optionalChain([clip, 'access', _112 => _112.mask, 'optionalAccess', _113 => _113.size]) || 50,
                      feather: _optionalChain([clip, 'access', _114 => _114.mask, 'optionalAccess', _115 => _115.feather]) || 10,
                      x: _optionalChain([clip, 'access', _116 => _116.mask, 'optionalAccess', _117 => _117.x]) || 0,
                      y: _optionalChain([clip, 'access', _118 => _118.mask, 'optionalAccess', _119 => _119.y]) || 0,
                    },
                  })
                }
                className="w-full bg-[#181b26] border border-[#232738] rounded-lg px-2 py-1.5 text-xs text-white outline-none"
              >
                <option value="none">None</option>
                <option value="circle">Circle Mask</option>
                <option value="rectangle">Rectangle Mask</option>
                <option value="heart">Heart Shape</option>
                <option value="star">Star Shape</option>
              </select>
            </div>

            {clip.mask && clip.mask.type !== 'none' && (
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Mask Radius Size</span>
                    <span className="font-mono text-slate-400">{clip.mask.size}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={clip.mask.size}
                    onChange={(e) =>
                      updateClip(clip.id, { mask: { ...clip.mask, size: parseInt(e.target.value) } })
                    }
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* Chroma Key (Green Screen) */}
            <div className="pt-2 border-t border-[#232738] space-y-2">
              <span className="text-slate-300 block font-semibold">Chroma Key (Green Screen)</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={_optionalChain([clip, 'access', _120 => _120.chromaKey, 'optionalAccess', _121 => _121.enabled]) || false}
                  onChange={(e) =>
                    updateClip(clip.id, {
                      chromaKey: {
                        enabled: e.target.checked,
                        keyColor: _optionalChain([clip, 'access', _122 => _122.chromaKey, 'optionalAccess', _123 => _123.keyColor]) || '#00ff00',
                        similarity: _optionalChain([clip, 'access', _124 => _124.chromaKey, 'optionalAccess', _125 => _125.similarity]) || 40,
                        smoothness: _optionalChain([clip, 'access', _126 => _126.chromaKey, 'optionalAccess', _127 => _127.smoothness]) || 10,
                      },
                    })
                  }
                  className="rounded border-[#2a2f42] bg-[#181b26] text-violet-600"
                />
                <span className="text-slate-300">Enable Chroma Key Removal</span>
              </label>

              {_optionalChain([clip, 'access', _128 => _128.chromaKey, 'optionalAccess', _129 => _129.enabled]) && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Key Color:</span>
                    <input
                      type="color"
                      value={clip.chromaKey.keyColor}
                      onChange={(e) =>
                        updateClip(clip.id, {
                          chromaKey: { ...clip.chromaKey, keyColor: e.target.value },
                        })
                      }
                      className="w-7 h-7 rounded border-none cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* KEYFRAMES TAB */}
        {activeTab === 'keyframes' && (
          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-cyan-400" /> Keyframe Animation
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                At {(currentTime - clip.start).toFixed(2)}s
              </span>
            </div>

            <p className="text-[11px] text-slate-400">
              Animate clip position, scale, rotation, or opacity smoothly across time.
            </p>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => addKeyframe(clip.id, 'scale', clip.scale)}
                className="py-1.5 px-2 rounded-lg bg-[#181b26] border border-[#232738] hover:border-violet-500/50 text-[11px] text-slate-200 flex items-center justify-between"
              >
                <span>+ Scale Key</span>
                <Key className="w-3 h-3 text-violet-400" />
              </button>
              <button
                onClick={() => addKeyframe(clip.id, 'opacity', clip.opacity)}
                className="py-1.5 px-2 rounded-lg bg-[#181b26] border border-[#232738] hover:border-violet-500/50 text-[11px] text-slate-200 flex items-center justify-between"
              >
                <span>+ Opacity Key</span>
                <Key className="w-3 h-3 text-violet-400" />
              </button>
              <button
                onClick={() => addKeyframe(clip.id, 'rotation', clip.rotation)}
                className="py-1.5 px-2 rounded-lg bg-[#181b26] border border-[#232738] hover:border-violet-500/50 text-[11px] text-slate-200 flex items-center justify-between"
              >
                <span>+ Rotation Key</span>
                <Key className="w-3 h-3 text-violet-400" />
              </button>
              <button
                onClick={() => addKeyframe(clip.id, 'x', clip.x)}
                className="py-1.5 px-2 rounded-lg bg-[#181b26] border border-[#232738] hover:border-violet-500/50 text-[11px] text-slate-200 flex items-center justify-between"
              >
                <span>+ Pos X Key</span>
                <Key className="w-3 h-3 text-violet-400" />
              </button>
            </div>

            {/* List of Existing Keyframes */}
            <div className="pt-2 border-t border-[#232738]">
              <span className="text-slate-400 block mb-1.5 text-[10px] uppercase font-bold tracking-wider">
                Active Keyframes ({_optionalChain([clip, 'access', _130 => _130.keyframes, 'optionalAccess', _131 => _131.length]) || 0})
              </span>
              {(!clip.keyframes || clip.keyframes.length === 0) ? (
                <p className="text-[11px] text-slate-600 italic">No keyframes added to this clip yet.</p>
              ) : (
                <div className="space-y-1">
                  {clip.keyframes.map((kf) => (
                    <div
                      key={kf.id}
                      className="flex items-center justify-between p-1.5 rounded bg-[#181b26] border border-[#232738] text-[11px]"
                    >
                      <span className="font-mono text-cyan-400">
                        {kf.property}: {kf.value.toFixed(1)} @ {kf.time.toFixed(2)}s
                      </span>
                      <button
                        onClick={() => removeKeyframe(clip.id, kf.id)}
                        className="p-1 hover:text-rose-400 text-slate-500 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );

  if (mobileDrawer) {
    return (
      <div className="w-full flex flex-col h-full select-none shrink-0 overflow-hidden bg-[#141620]">
        {/* Mobile Drag Handle */}
        <div className="w-10 h-1 bg-slate-600/80 rounded-full mx-auto my-2 shrink-0 cursor-grab" />
        {inspectorContent}
      </div>
    );
  }

  return (
    <aside className="w-72 md:w-80 border-l border-[#222638] bg-[#12141c] flex flex-col h-full select-none shrink-0 overflow-hidden">
      {inspectorContent}
    </aside>
  );
};
