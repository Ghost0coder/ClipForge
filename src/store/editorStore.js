import { create } from 'zustand';

import { createDefaultProject } from '../utils/sampleData';
import { saveProjectToDB, deleteMediaBlobFromDB } from '../utils/storage';
import { audioEngine } from '../utils/audioEngine';
import { pauseAllVideos } from '../utils/previewRenderer';
import { toastSuccess, toastWarning, toastInfo } from './toastStore';

 












































































































export const useEditorStore = create((set, get) => {
  const initialProject = createDefaultProject();

  // Helper to push history
  const pushHistory = () => {
    const { project, undoStack } = get();
    // Keep max 30 history states
    const newStack = [...undoStack.slice(-29), JSON.parse(JSON.stringify(project))];
    set({ undoStack: newStack, redoStack: [] });
  };

  // Recalculate project duration based on clips
  const recalculateDuration = (project) => {
    let maxEnd = 5;
    project.tracks.forEach((track) => {
      track.clips.forEach((clip) => {
        const end = clip.start + clip.duration;
        if (end > maxEnd) maxEnd = end;
      });
    });
    return Math.max(maxEnd + 1, 5);
  };

  return {
    project: initialProject,
    undoStack: [],
    redoStack: [],
    copiedClips: [],

    currentTime: 0,
    isPlaying: false,
    selectedClipIds: [],
    selectedAssetIds: [],
    selectAsset: (id, multi = false, shift = false) => {
      console.log('[ClipForge:Asset] selectAsset:', id, { multi, shift });
      set((state) => {
        const currentSelected = state.selectedAssetIds;
        const library = state.project.mediaLibrary || [];
        if (shift && currentSelected.length > 0) {
          const lastId = currentSelected[currentSelected.length - 1];
          const lastIdx = library.findIndex((a) => a.id === lastId);
          const currIdx = library.findIndex((a) => a.id === id);
          if (lastIdx !== -1 && currIdx !== -1) {
            const start = Math.min(lastIdx, currIdx);
            const end = Math.max(lastIdx, currIdx);
            const rangeIds = library.slice(start, end + 1).map((a) => a.id);
            return { selectedAssetIds: Array.from(new Set([...currentSelected, ...rangeIds])) };
          }
        }
        if (multi) {
          const exists = currentSelected.includes(id);
          const next = exists ? currentSelected.filter((i) => i !== id) : [...currentSelected, id];
          return { selectedAssetIds: next };
        }
        return { selectedAssetIds: [id] };
      });
    },
    deselectAsset: (id) => {
      console.log('[ClipForge:Asset] deselectAsset:', id);
      set((state) => ({ selectedAssetIds: state.selectedAssetIds.filter((i) => i !== id) }));
    },
    clearAssetSelection: () => {
      console.log('[ClipForge:Asset] clearAssetSelection');
      set({ selectedAssetIds: [] });
    },
    addMediaAsset: (asset) => {
      console.log('[ClipForge:Asset] addMediaAsset:', asset);
      const { project } = get();
      const library = project.mediaLibrary || [];
      const updatedProject = {
        ...project,
        mediaLibrary: [asset, ...library],
        updatedAt: Date.now(),
      };
      set({ project: updatedProject });
      saveProjectToDB(updatedProject);
    },
    deleteAssets: async (assetIds, removeClips = true) => {
      console.log('[ClipForge:Asset] deleteAssets:', assetIds, { removeClips });
      pushHistory();
      const { project } = get();
      const library = project.mediaLibrary || [];
      const assetsToDelete = library.filter((a) => assetIds.includes(a.id));
      const remainingLibrary = library.filter((a) => !assetIds.includes(a.id));

      let updatedTracks = project.tracks;
      if (removeClips) {
        const mediaKeysToDelete = new Set(assetsToDelete.map((a) => a.mediaId || a.id));
        updatedTracks = project.tracks.map((track) => ({
          ...track,
          clips: track.clips.filter((c) => !mediaKeysToDelete.has(c.mediaId) && !mediaKeysToDelete.has(c.id)),
        }));
      }

      const updatedProject = {
        ...project,
        mediaLibrary: remainingLibrary,
        tracks: updatedTracks,
        updatedAt: Date.now(),
      };

      set({ project: updatedProject, selectedAssetIds: [] });
      saveProjectToDB(updatedProject);

      for (const asset of assetsToDelete) {
        try {
          if (asset.mediaId) {
            await deleteMediaBlobFromDB(asset.mediaId);
          }
          if (asset.url && asset.url.startsWith('blob:')) {
            URL.revokeObjectURL(asset.url);
          }
        } catch (e) {
          console.error('[ClipForge:Asset] Error deleting asset blob:', asset.id, e);
        }
      }

      toastSuccess(`Deleted ${assetsToDelete.length} asset(s)`, 'Asset Deleted');
    },

    zoom: 45,
    snapping: true,
    magneticTimeline: false,
    showSafeGuides: false,
    showGrid: false,
    activeLeftTab: 'media',

    isMixerModalOpen: false,
    setMixerModalOpen: (isMixerModalOpen) => set({ isMixerModalOpen }),
    toggleMixerModal: () => set((state) => ({ isMixerModalOpen: !state.isMixerModalOpen })),

    activeCompoundClipId: null,
    enterCompoundClip: (clipId) => set({ activeCompoundClipId: clipId, selectedClipIds: [] }),
    exitCompoundClip: () => set({ activeCompoundClipId: null, selectedClipIds: [] }),

    trackHeightMode: 'medium',
    setTrackHeightMode: (trackHeightMode) => set({ trackHeightMode }),

    compareOriginal: false,
    setCompareOriginal: (compareOriginal) => {
      set({ compareOriginal });
      window.dispatchEvent(new CustomEvent('clipforge:redraw'));
    },

    isExportModalOpen: false,
    isProjectManagerOpen: false,
    isShortcutsModalOpen: false,
    setShortcutsModalOpen: (isShortcutsModalOpen) => set({ isShortcutsModalOpen }),
    toggleShortcutsModal: () => set((state) => ({ isShortcutsModalOpen: !state.isShortcutsModalOpen })),
    sidebarPinned: typeof window !== 'undefined' ? localStorage.getItem('clipforge_sidebar_pinned') === 'true' : false,
    setSidebarPinned: (pinned) => {
      try { localStorage.setItem('clipforge_sidebar_pinned', pinned); } catch(e){}
      set({ sidebarPinned: pinned });
    },
    leftPanelCollapsed: typeof window !== 'undefined' ? localStorage.getItem('clipforge_left_collapsed') === 'true' : false,
    rightInspectorCollapsed: typeof window !== 'undefined' ? localStorage.getItem('clipforge_right_collapsed') === 'true' : false,
    leftPanelAutoHide: typeof window !== 'undefined' ? localStorage.getItem('clipforge_left_autohide') === 'true' : false,
    rightInspectorAutoHide: typeof window !== 'undefined' ? localStorage.getItem('clipforge_right_autohide') === 'true' : false,
    toggleLeftPanel: () => {
      const next = !get().leftPanelCollapsed;
      try { localStorage.setItem('clipforge_left_collapsed', next); } catch(e){}
      set({ leftPanelCollapsed: next });
    },
    toggleRightInspector: () => {
      const next = !get().rightInspectorCollapsed;
      try { localStorage.setItem('clipforge_right_collapsed', next); } catch(e){}
      set({ rightInspectorCollapsed: next });
    },
    toggleLeftAutoHide: () => {
      const next = !get().leftPanelAutoHide;
      try { localStorage.setItem('clipforge_left_autohide', next); } catch(e){}
      set({ leftPanelAutoHide: next });
    },
    toggleRightAutoHide: () => {
      const next = !get().rightInspectorAutoHide;
      try { localStorage.setItem('clipforge_right_autohide', next); } catch(e){}
      set({ rightInspectorAutoHide: next });
    },
    resetLayout: () => {
      try {
        localStorage.removeItem('clipforge_left_collapsed');
        localStorage.removeItem('clipforge_right_collapsed');
        localStorage.removeItem('clipforge_left_autohide');
        localStorage.removeItem('clipforge_right_autohide');
        localStorage.removeItem('clipforge_sidebar_pinned');
      } catch(e){}
      set({ leftPanelCollapsed: false, rightInspectorCollapsed: false, leftPanelAutoHide: false, rightInspectorAutoHide: false, sidebarPinned: false, zoom: 45 });
    },

    devMobilePreview: false,
    toggleDevMobilePreview: () => set((state) => ({ devMobilePreview: !state.devMobilePreview })),
    isMobileToolDrawerOpen: false,
    setMobileToolDrawerOpen: (open) => set({ isMobileToolDrawerOpen: open }),
    isMobileInspectorOpen: false,
    setMobileInspectorOpen: (open) => set({ isMobileInspectorOpen: open }),
    selectedKeyframeId: null,
    setSelectedKeyframeId: (selectedKeyframeId) => set({ selectedKeyframeId }),

    isDrawingMode: false,
    setIsDrawingMode: (isDrawingMode) => set({ isDrawingMode }),
    toggleDrawingMode: () => set((state) => ({ isDrawingMode: !state.isDrawingMode })),
    snapToBeats: false,
    toggleSnapToBeats: () => set((state) => ({ snapToBeats: !state.snapToBeats })),
    eyedropperActive: false,
    setEyedropperActive: (eyedropperActive) => set({ eyedropperActive }),

    isOnboardingOpen: typeof window !== 'undefined' ? (localStorage.getItem('clipforge_onboarding_completed') !== 'true') : false,
    openOnboarding: () => set({ isOnboardingOpen: true }),
    closeOnboarding: () => set({ isOnboardingOpen: false }),

    route: typeof window !== 'undefined' ? (localStorage.getItem('clipforge_route') || 'home') : 'home',
    setRoute: (route) => {
      try {
        localStorage.setItem('clipforge_route', route);
      } catch (e) {}
      set({ route });
    },

    usePreviewProxy: true,
    togglePreviewProxy: () => set((state) => ({ usePreviewProxy: !state.usePreviewProxy })),

    isTemplateModalOpen: false,
    templateModalData: null,
    openTemplateModal: (templateModalData) => set({ isTemplateModalOpen: true, templateModalData }),
    closeTemplateModal: () => set({ isTemplateModalOpen: false, templateModalData: null }),

    theme: typeof window !== 'undefined' ? (localStorage.getItem('clipforge_theme') || 'light') : 'light',
    toggleTheme: () => {
      const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('clipforge_theme', nextTheme);
        if (nextTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } catch (e) {}
      set({ theme: nextTheme });
    },
    setTheme: (theme) => {
      try {
        localStorage.setItem('clipforge_theme', theme);
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } catch (e) {}
      set({ theme });
    },

    setProject: (project) => {
      pushHistory();
      set({ project, currentTime: 0, selectedClipIds: [] });
      saveProjectToDB(project);
    },

    updateProjectName: (name) => {
      const { project } = get();
      const updated = { ...project, name, updatedAt: Date.now() };
      set({ project: updated });
      saveProjectToDB(updated);
    },

    setAspectRatio: (aspectRatio) => {
      pushHistory();
      const { project } = get();
      const updated = { ...project, aspectRatio, updatedAt: Date.now() };
      set({ project: updated });
      saveProjectToDB(updated);
    },

    setBackgroundColor: (color) => {
      pushHistory();
      const { project } = get();
      const updated = {
        ...project,
        background: { ...project.background, color },
        updatedAt: Date.now(),
      };
      set({ project: updated });
      saveProjectToDB(updated);
    },

    play: () => {
      const { project, currentTime } = get();
      console.log('[ClipForge:Play] Initiating playback at time:', currentTime, 'Duration:', project.duration);

      const totalClips = project.tracks.reduce((acc, t) => acc + t.clips.length, 0);
      if (totalClips === 0) {
        console.log('[ClipForge:Play] Notice: Timeline has no clips');
        toastInfo('Timeline is empty. Upload or load a sample video to start playing.', 'Playback Notice');
      }

      if (currentTime >= project.duration) {
        set({ currentTime: 0 });
      }
      set({ isPlaying: true });
      audioEngine.syncPlayback(project.tracks, get().currentTime, true);
    },

    pause: () => {
      const { currentTime } = get();
      console.log('[ClipForge:Pause] Playback paused at time:', currentTime);
      set({ isPlaying: false });
      audioEngine.stopAll();
      pauseAllVideos();
    },

    togglePlay: () => {
      const { isPlaying, play, pause } = get();
      if (isPlaying) pause();
      else play();
    },

    seek: (time) => {
      const { project, isPlaying } = get();
      const clamped = Math.max(0, Math.min(time, project.duration));
      set({ currentTime: clamped });
      audioEngine.syncPlayback(project.tracks, clamped, isPlaying);
    },

    stepForward: (frames = 1) => {
      const { currentTime, project, seek } = get();
      const dt = frames / (project.fps || 30);
      seek(currentTime + dt);
    },

    stepBackward: (frames = 1) => {
      const { currentTime, project, seek } = get();
      const dt = frames / (project.fps || 30);
      seek(currentTime - dt);
    },

    selectClip: (clipId, multi = false) => {
      set((state) => ({
        selectedClipIds: multi
          ? state.selectedClipIds.includes(clipId)
            ? state.selectedClipIds.filter((id) => id !== clipId)
            : [...state.selectedClipIds, clipId]
          : [clipId],
        isMobileInspectorOpen: true,
        rightInspectorCollapsed: false,
      }));
    },

    deselectAll: () => {
      set({ selectedClipIds: [], isMobileInspectorOpen: false });
    },

    getSelectedClip: () => {
      const { project, selectedClipIds } = get();
      if (selectedClipIds.length === 0) return null;
      const targetId = selectedClipIds[0];
      for (const track of project.tracks) {
        const found = track.clips.find((c) => c.id === targetId);
        if (found) return found;
      }
      return null;
    },

    setZoom: (zoom) => set({ zoom: Math.max(10, Math.min(zoom, 250)) }),
    toggleSnapping: () => set((state) => ({ snapping: !state.snapping })),
    toggleMagnetic: () => set((state) => ({ magneticTimeline: !state.magneticTimeline })),
    toggleSafeGuides: () => set((state) => ({ showSafeGuides: !state.showSafeGuides })),
    toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
    setActiveLeftTab: (activeLeftTab) => set({ activeLeftTab }),

    setExportModalOpen: (isExportModalOpen) => set({ isExportModalOpen }),
    setProjectManagerOpen: (isProjectManagerOpen) => set({ isProjectManagerOpen }),

    addTrack: (type) => {
      pushHistory();
      const { project } = get();
      const newTrack = {
        id: `track_${type}_${Date.now()}`,
        name: `${type.charAt(0).toUpperCase() + type.slice(1)} Track ${project.tracks.length + 1}`,
        type,
        clips: [],
        locked: false,
        hidden: false,
        muted: false,
        volume: 1,
      };
      const updated = {
        ...project,
        tracks: [newTrack, ...project.tracks],
        updatedAt: Date.now(),
      };
      set({ project: updated });
      saveProjectToDB(updated);
    },

    removeTrack: (trackId) => {
      pushHistory();
      const { project } = get();
      const updated = {
        ...project,
        tracks: project.tracks.filter((t) => t.id !== trackId),
        updatedAt: Date.now(),
      };
      set({ project: updated });
      saveProjectToDB(updated);
    },

    toggleTrackLock: (trackId) => {
      const { project } = get();
      const updated = {
        ...project,
        tracks: project.tracks.map((t) => (t.id === trackId ? { ...t, locked: !t.locked } : t)),
      };
      set({ project: updated });
    },

    toggleTrackHide: (trackId) => {
      const { project } = get();
      const updated = {
        ...project,
        tracks: project.tracks.map((t) => (t.id === trackId ? { ...t, hidden: !t.hidden } : t)),
      };
      set({ project: updated });
    },

    toggleTrackMute: (trackId) => {
      const { project } = get();
      const updated = {
        ...project,
        tracks: project.tracks.map((t) => (t.id === trackId ? { ...t, muted: !t.muted } : t)),
      };
      set({ project: updated });
    },

    setTrackVolume: (trackId, volume) => {
      const { project } = get();
      const updated = {
        ...project,
        tracks: project.tracks.map((t) => (t.id === trackId ? { ...t, volume } : t)),
      };
      set({ project: updated });
    },

    addClipToTrack: (trackId, clip) => {
      pushHistory();
      const { project } = get();
      const updatedTracks = project.tracks.map((track) => {
        if (track.id === trackId) {
          return { ...track, clips: [...track.clips, clip] };
        }
        return track;
      });

      const updatedProject = {
        ...project,
        tracks: updatedTracks,
        duration: recalculateDuration({ ...project, tracks: updatedTracks }),
        updatedAt: Date.now(),
      };

      set({ project: updatedProject, selectedClipIds: [clip.id] });
      saveProjectToDB(updatedProject);
    },

    updateClip: (clipId, updates) => {
      const { project, currentTime } = get();
      let changed = false;

      const updatedTracks = project.tracks.map((track) => {
        const clipIdx = track.clips.findIndex((c) => c.id === clipId);
        if (clipIdx !== -1) {
          changed = true;
          const current = track.clips[clipIdx];
          let updatedKeyframes = current.keyframes ? [...current.keyframes] : [];
          const relTime = Math.max(0, Math.min(current.duration, currentTime - current.start));
          const isPlayheadOverClip = currentTime >= current.start - 0.05 && currentTime <= current.start + current.duration + 0.05;

          // CapCut logic: Once a property has at least one keyframe, changing its value
          // at a playhead time automatically updates or creates a keyframe there.
          const handleAutoKeyframe = (prop, newVal) => {
            if (newVal === undefined || !isPlayheadOverClip) return;
            const hasExistingPropKeyframe = updatedKeyframes.some((k) => k.property === prop);
            if (hasExistingPropKeyframe) {
              const existingIdx = updatedKeyframes.findIndex(
                (k) => k.property === prop && Math.abs(k.time - relTime) <= 0.04
              );
              if (existingIdx !== -1) {
                updatedKeyframes[existingIdx] = {
                  ...updatedKeyframes[existingIdx],
                  value: Number(newVal),
                };
              } else {
                updatedKeyframes.push({
                  id: `kf_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                  time: Math.round(relTime * 1000) / 1000,
                  property: prop,
                  value: Number(newVal),
                  easing: 'easeInOut',
                });
                updatedKeyframes.sort((a, b) => a.time - b.time);
              }
            }
          };

          if (updates.x !== undefined) handleAutoKeyframe('x', updates.x);
          if (updates.y !== undefined) handleAutoKeyframe('y', updates.y);
          if (updates.scale !== undefined) handleAutoKeyframe('scale', updates.scale);
          if (updates.rotation !== undefined) handleAutoKeyframe('rotation', updates.rotation);
          if (updates.opacity !== undefined) handleAutoKeyframe('opacity', updates.opacity);
          if (updates.audioProps && updates.audioProps.volume !== undefined) {
            handleAutoKeyframe('volume', updates.audioProps.volume);
          }

          const updatedClips = [...track.clips];
          updatedClips[clipIdx] = {
            ...current,
            ...updates,
            keyframes: updatedKeyframes,
            adjustments: updates.adjustments
              ? { ...current.adjustments, ...updates.adjustments }
              : current.adjustments,
            textProps: updates.textProps
              ? { ...current.textProps, ...updates.textProps } 
              : current.textProps,
            audioProps: updates.audioProps
              ? ({ ...current.audioProps, ...updates.audioProps } )
              : current.audioProps,
          };
          return { ...track, clips: updatedClips };
        }
        return track;
      });

      if (changed) {
        const updatedProject = {
          ...project,
          tracks: updatedTracks,
          duration: recalculateDuration({ ...project, tracks: updatedTracks }),
          updatedAt: Date.now(),
        };
        set({ project: updatedProject });
        saveProjectToDB(updatedProject);
        window.dispatchEvent(new CustomEvent('clipforge:redraw'));
      }
    },

    splitClipAtPlayhead: (clipId) => {
      const { project, currentTime, selectedClipIds } = get();
      let targetId = clipId || selectedClipIds[0];
      console.log('[ClipForge:Split] Split requested at playhead:', currentTime, 'Target clip ID:', targetId);

      // If no clip explicitly selected, find the first clip under the playhead
      if (!targetId) {
        for (const track of project.tracks) {
          if (track.hidden || track.locked) continue;
          const found = track.clips.find(
            (c) => currentTime >= c.start && currentTime <= c.start + c.duration
          );
          if (found) {
            targetId = found.id;
            break;
          }
        }
      }
      if (!targetId) {
        console.warn('[ClipForge:Split] Split failed: No clip selected or found under playhead');
        toastWarning('Please select a clip on the timeline to split it.', 'Split Notice');
        return;
      }

      // Find the target clip
      let foundClip = null;
      for (const track of project.tracks) {
        const c = track.clips.find((clip) => clip.id === targetId);
        if (c) {
          foundClip = c;
          break;
        }
      }
      if (!foundClip) {
        console.warn('[ClipForge:Split] Split failed: Target clip not found in project tracks');
        toastWarning('Clip not found to split.', 'Split Notice');
        return;
      }
      if (foundClip.duration < 0.2) {
        console.warn('[ClipForge:Split] Split failed: Clip duration is too short (<0.2s):', foundClip.duration);
        toastWarning('Clip is too short to be split (< 0.2s).', 'Split Notice');
        return;
      }

      // If playhead is inside clip bounds, split at playhead; otherwise split at the midpoint of the selected clip
      let splitTime = currentTime;
      if (splitTime <= foundClip.start + 0.05 || splitTime >= foundClip.start + foundClip.duration - 0.05) {
        splitTime = foundClip.start + foundClip.duration / 2;
      }

      pushHistory();

      let createdClipId = '';

      const updatedTracks = project.tracks.map((track) => {
        const clipIdx = track.clips.findIndex((c) => c.id === targetId);
        if (clipIdx === -1) return track;

        const clip = track.clips[clipIdx];
        const firstDuration = splitTime - clip.start;
        const secondDuration = clip.duration - firstDuration;

        const clip1 = {
          ...clip,
          duration: firstDuration,
          keyframes: (clip.keyframes || []).filter((k) => k.time < firstDuration),
        };

        createdClipId = `clip_${Date.now()}_split`;
        const clip2 = {
          ...clip,
          id: createdClipId,
          start: splitTime,
          duration: secondDuration,
          sourceStart: clip.sourceStart + firstDuration * clip.speed,
          keyframes: (clip.keyframes || [])
            .filter((k) => k.time >= firstDuration)
            .map((k) => ({
              ...k,
              id: `kf_${Date.now()}_${Math.random()}`,
              time: Math.max(0, k.time - firstDuration),
            })),
        };

        const newClips = [...track.clips];
        newClips.splice(clipIdx, 1, clip1, clip2);
        return { ...track, clips: newClips };
      });

      const updatedProject = {
        ...project,
        tracks: updatedTracks,
        duration: recalculateDuration({ ...project, tracks: updatedTracks }),
        updatedAt: Date.now(),
      };
      set({ project: updatedProject, selectedClipIds: createdClipId ? [createdClipId] : [] });
      saveProjectToDB(updatedProject);
      console.log('[ClipForge:Split] Successfully split clip:', targetId, 'at time:', splitTime, 'into new clip:', createdClipId);
      toastSuccess('Clip successfully split at playhead', 'Split Complete');
      window.dispatchEvent(new CustomEvent('clipforge:redraw'));
    },

    deleteClip: (clipId, ripple = undefined) => {
      const { project, selectedClipIds, magneticTimeline } = get();
      const targetId = clipId || selectedClipIds[0];
      if (!targetId) return;

      const isRipple = ripple !== undefined ? ripple : magneticTimeline;
      pushHistory();

      let deletedClipDuration = 0;
      let deletedClipStart = 0;

      const updatedTracks = project.tracks.map((track) => {
        const clip = track.clips.find((c) => c.id === targetId);
        if (!clip) return track;

        deletedClipDuration = clip.duration;
        deletedClipStart = clip.start;

        const remaining = track.clips.filter((c) => c.id !== targetId);
        if (isRipple) {
          return {
            ...track,
            clips: remaining.map((c) =>
              c.start > deletedClipStart
                ? { ...c, start: Math.max(0, c.start - deletedClipDuration) }
                : c
            ),
          };
        }
        return { ...track, clips: remaining };
      });

      const updatedProject = {
        ...project,
        tracks: updatedTracks,
        duration: recalculateDuration({ ...project, tracks: updatedTracks }),
        updatedAt: Date.now(),
      };
      set({ project: updatedProject, selectedClipIds: [] });
      saveProjectToDB(updatedProject);
      window.dispatchEvent(new CustomEvent('clipforge:redraw'));
    },

    deleteSelectedClips: (ripple = false) => {
      const { project, selectedClipIds } = get();
      if (!selectedClipIds || selectedClipIds.length === 0) return;

      pushHistory();

      const idsToDelete = new Set(selectedClipIds);
      let countDeleted = 0;

      const updatedTracks = project.tracks.map((track) => {
        const remaining = track.clips.filter((c) => !idsToDelete.has(c.id));
        const deletedInTrack = track.clips.filter((c) => idsToDelete.has(c.id));
        countDeleted += deletedInTrack.length;

        if (deletedInTrack.length === 0) return track;

        if (ripple && deletedInTrack.length > 0) {
          const totalDuration = deletedInTrack.reduce((sum, c) => sum + c.duration, 0);
          const minStart = Math.min(...deletedInTrack.map((c) => c.start));
          return {
            ...track,
            clips: remaining.map((c) =>
              c.start > minStart
                ? { ...c, start: Math.max(0, c.start - totalDuration) }
                : c
            ),
          };
        }
        return { ...track, clips: remaining };
      });

      const updatedProject = {
        ...project,
        tracks: updatedTracks,
        duration: recalculateDuration({ ...project, tracks: updatedTracks }),
        updatedAt: Date.now(),
      };
      set({ project: updatedProject, selectedClipIds: [], isMobileInspectorOpen: false });
      saveProjectToDB(updatedProject);
      window.dispatchEvent(new CustomEvent('clipforge:redraw'));
      toastSuccess(`Deleted ${countDeleted} clip${countDeleted > 1 ? 's' : ''}`, 'Deleted');
    },

    selectAllClips: () => {
      const { project } = get();
      const allIds = [];
      project.tracks.forEach((track) => {
        if (!track.locked && !track.hidden) {
          track.clips.forEach((c) => allIds.push(c.id));
        }
      });
      if (allIds.length > 0) {
        set({ selectedClipIds: allIds });
        toastInfo(`Selected ${allIds.length} clip${allIds.length > 1 ? 's' : ''}`, 'Selected All');
      }
    },

    cutSelected: () => {
      const { copySelected, deleteSelectedClips } = get();
      copySelected();
      deleteSelectedClips(false);
    },

    jumpToPrevCut: () => {
      const { project, currentTime, seek } = get();
      const cutPoints = new Set([0]);
      project.tracks.forEach((track) => {
        if (!track.hidden) {
          track.clips.forEach((c) => {
            cutPoints.add(c.start);
            cutPoints.add(c.start + c.duration);
          });
        }
      });
      const sorted = Array.from(cutPoints).sort((a, b) => a - b);
      const prev = sorted.filter((t) => t < currentTime - 0.05).pop();
      seek(prev !== undefined ? prev : 0);
    },

    jumpToNextCut: () => {
      const { project, currentTime, seek } = get();
      const cutPoints = new Set([project.duration]);
      project.tracks.forEach((track) => {
        if (!track.hidden) {
          track.clips.forEach((c) => {
            cutPoints.add(c.start);
            cutPoints.add(c.start + c.duration);
          });
        }
      });
      const sorted = Array.from(cutPoints).sort((a, b) => a - b);
      const next = sorted.find((t) => t > currentTime + 0.05);
      seek(next !== undefined ? next : project.duration);
    },

    duplicateClip: (clipId) => {
      const { project, selectedClipIds } = get();
      const targetId = clipId || selectedClipIds[0];
      if (!targetId) return;

      pushHistory();

      let duplicatedClipId = '';

      const updatedTracks = project.tracks.map((track) => {
        const clip = track.clips.find((c) => c.id === targetId);
        if (!clip) return track;

        duplicatedClipId = `clip_${Date.now()}_dup`;
        const newClip = {
          ...clip,
          id: duplicatedClipId,
          name: `${clip.name} (Copy)`,
          start: clip.start + clip.duration,
          keyframes: (clip.keyframes || []).map((k) => ({
            ...k,
            id: `kf_${Date.now()}_${Math.random()}`,
          })),
        };

        return { ...track, clips: [...track.clips, newClip] };
      });

      const updatedProject = {
        ...project,
        tracks: updatedTracks,
        duration: recalculateDuration({ ...project, tracks: updatedTracks }),
        updatedAt: Date.now(),
      };
      set({ project: updatedProject, selectedClipIds: duplicatedClipId ? [duplicatedClipId] : [] });
      saveProjectToDB(updatedProject);
      window.dispatchEvent(new CustomEvent('clipforge:redraw'));
    },

    moveClip: (clipId, targetTrackId, newStart) => {
      const { project, magneticTimeline } = get();
      let targetClip = null;

      // Remove from source track
      const tracksWithoutClip = project.tracks.map((track) => {
        const found = track.clips.find((c) => c.id === clipId);
        if (found) {
          targetClip = { ...found, trackId: targetTrackId, start: Math.max(0, newStart) };
          return { ...track, clips: track.clips.filter((c) => c.id !== clipId) };
        }
        return track;
      });

      if (!targetClip) return;

      // Add to destination track
      let updatedTracks = tracksWithoutClip.map((track) => {
        if (track.id === targetTrackId) {
          return { ...track, clips: [...track.clips, targetClip] };
        }
        return track;
      });

      // Magnetic timeline: snap clips sequentially with no gaps on the main track
      if (magneticTimeline) {
        updatedTracks = updatedTracks.map((track) => {
          if (track.type === 'video' || track.id === targetTrackId) {
            const sorted = [...track.clips].sort((a, b) => a.start - b.start);
            let cur = 0;
            const packed = sorted.map((c) => {
              const res = { ...c, start: cur };
              cur += c.duration;
              return res;
            });
            return { ...track, clips: packed };
          }
          return track;
        });
      }

      const updatedProject = {
        ...project,
        tracks: updatedTracks,
        duration: recalculateDuration({ ...project, tracks: updatedTracks }),
        updatedAt: Date.now(),
      };
      set({ project: updatedProject });
      saveProjectToDB(updatedProject);
      window.dispatchEvent(new CustomEvent('clipforge:redraw'));
    },

    trimClip: (clipId, newStart, newDuration) => {
      const { project, magneticTimeline } = get();
      let updatedTracks = project.tracks.map((track) => {
        const clipIdx = track.clips.findIndex((c) => c.id === clipId);
        if (clipIdx !== -1) {
          const current = track.clips[clipIdx];
          const startDelta = newStart - current.start;
          const updatedClips = [...track.clips];
          updatedClips[clipIdx] = {
            ...current,
            start: Math.max(0, newStart),
            duration: Math.max(0.1, newDuration),
            sourceStart: Math.max(0, current.sourceStart + startDelta * current.speed),
          };
          return { ...track, clips: updatedClips };
        }
        return track;
      });

      // Magnetic timeline: close gaps if trimming on main track
      if (magneticTimeline) {
        updatedTracks = updatedTracks.map((track) => {
          if (track.clips.some((c) => c.id === clipId) && (track.type === 'video' || track.id === 'track_video_1')) {
            const sorted = [...track.clips].sort((a, b) => a.start - b.start);
            let cur = 0;
            const packed = sorted.map((c) => {
              const res = { ...c, start: cur };
              cur += c.duration;
              return res;
            });
            return { ...track, clips: packed };
          }
          return track;
        });
      }

      const updatedProject = {
        ...project,
        tracks: updatedTracks,
        duration: recalculateDuration({ ...project, tracks: updatedTracks }),
        updatedAt: Date.now(),
      };
      set({ project: updatedProject });
      saveProjectToDB(updatedProject);
      window.dispatchEvent(new CustomEvent('clipforge:redraw'));
    },

    groupSelectedIntoCompoundClip: () => {
      const { project, selectedClipIds } = get();
      if (!selectedClipIds || selectedClipIds.length === 0) {
        toastWarning('Please select clips to create a compound clip.', 'Compound Clip');
        return;
      }
      pushHistory();

      // Collect all selected clips
      const selectedClips = [];
      project.tracks.forEach((t) => {
        t.clips.forEach((c) => {
          if (selectedClipIds.includes(c.id)) {
            selectedClips.push({ ...c, originalTrackId: t.id, originalTrackType: t.type });
          }
        });
      });

      if (selectedClips.length === 0) return;

      const minStart = Math.min(...selectedClips.map((c) => c.start));
      const maxEnd = Math.max(...selectedClips.map((c) => c.start + c.duration));
      const compoundDuration = Math.max(0.5, maxEnd - minStart);

      // Create compound tracks preserving relative timing
      const nestedTracks = project.tracks
        .map((t) => ({
          ...t,
          clips: t.clips
            .filter((c) => selectedClipIds.includes(c.id))
            .map((c) => ({ ...c, start: c.start - minStart })),
        }))
        .filter((t) => t.clips.length > 0);

      const compoundId = `clip_compound_${Date.now()}`;
      const compoundClip = {
        id: compoundId,
        name: `Compound Clip (${selectedClips.length} items)`,
        type: 'compound',
        start: minStart,
        duration: compoundDuration,
        sourceStart: 0,
        sourceDuration: compoundDuration,
        speed: 1,
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
        opacity: 1,
        colorLabel: 'purple',
        compoundData: {
          tracks: nestedTracks,
          duration: compoundDuration,
        },
        keyframes: [],
      };

      // Place compound clip on the first affected track or video track
      const targetTrackId = selectedClips[0].originalTrackId || project.tracks[0].id;
      const idsToRemove = new Set(selectedClipIds);

      const updatedTracks = project.tracks.map((track) => {
        const remaining = track.clips.filter((c) => !idsToRemove.has(c.id));
        if (track.id === targetTrackId) {
          return { ...track, clips: [...remaining, compoundClip] };
        }
        return { ...track, clips: remaining };
      });

      const updatedProject = {
        ...project,
        tracks: updatedTracks,
        duration: recalculateDuration({ ...project, tracks: updatedTracks }),
        updatedAt: Date.now(),
      };

      set({ project: updatedProject, selectedClipIds: [compoundId] });
      saveProjectToDB(updatedProject);
      window.dispatchEvent(new CustomEvent('clipforge:redraw'));
      toastSuccess('Grouped into Compound Clip', 'Compound Clip Created');
    },

    setClipColorLabel: (clipId, colorLabel) => {
      get().updateClip(clipId, { colorLabel });
    },

    updateProjectSettings: (newSettings) => {
      const { project } = get();
      const updated = { ...project, ...newSettings, updatedAt: Date.now() };
      set({ project: updated });
      saveProjectToDB(updated);
      window.dispatchEvent(new CustomEvent('clipforge:redraw'));
    },

    freezeFrame: (clipId) => {
      const { project, currentTime, selectedClipIds } = get();
      const targetId = clipId || selectedClipIds[0];
      if (!targetId) return;

      pushHistory();

      const updatedTracks = project.tracks.map((track) => {
        const clipIdx = track.clips.findIndex((c) => c.id === targetId);
        if (clipIdx !== -1) {
          const current = track.clips[clipIdx];
          const updatedClips = [...track.clips];
          const isCurrentlyFrozen = !current.freezeFrame;
          // When freezing, freeze at the playhead position into the clip
          const freezeTime = (currentTime >= current.start && currentTime <= current.start + current.duration)
            ? (currentTime - current.start) * current.speed + current.sourceStart
            : current.sourceStart;
          updatedClips[clipIdx] = {
            ...current,
            freezeFrame: isCurrentlyFrozen,
            sourceStart: isCurrentlyFrozen ? freezeTime : current.sourceStart,
            name: isCurrentlyFrozen
              ? (current.name.includes('(Frozen)') ? current.name : `${current.name} (Frozen)`)
              : current.name.replace(' (Frozen)', ''),
          };
          return { ...track, clips: updatedClips };
        }
        return track;
      });

      const updatedProject = {
        ...project,
        tracks: updatedTracks,
        updatedAt: Date.now(),
      };
      set({ project: updatedProject });
      saveProjectToDB(updatedProject);
      window.dispatchEvent(new CustomEvent('clipforge:redraw'));
    },

    reverseClip: (clipId) => {
      pushHistory();
      const { project } = get();
      const updatedTracks = project.tracks.map((track) => {
        const clipIdx = track.clips.findIndex((c) => c.id === clipId);
        if (clipIdx !== -1) {
          const current = track.clips[clipIdx];
          const updatedClips = [...track.clips];
          updatedClips[clipIdx] = { ...current, reverse: !current.reverse };
          return { ...track, clips: updatedClips };
        }
        return track;
      });
      set({ project: { ...project, tracks: updatedTracks } });
    },

    extractAudioFromClip: (clipId) => {
      const { project, selectedClipIds } = get();
      const targetId = clipId || selectedClipIds[0];
      if (!targetId) return;

      pushHistory();
      let targetClip = null;
      for (const track of project.tracks) {
        const found = track.clips.find((c) => c.id === targetId);
        if (found) {
          targetClip = found;
          break;
        }
      }
      if (!targetClip) return;

      let audioTrack = project.tracks.find((t) => t.type === 'audio');
      let updatedTracks = [...project.tracks];
      if (!audioTrack) {
        audioTrack = {
          id: `track_audio_${Date.now()}`,
          name: 'Audio Track',
          type: 'audio',
          locked: false,
          hidden: false,
          muted: false,
          volume: 1,
          clips: [],
        };
        updatedTracks.push(audioTrack);
      }

      const extractedClipId = `clip_audio_${Date.now()}_extracted`;
      const newAudioClip = {
        id: extractedClipId,
        trackId: audioTrack.id,
        type: 'audio',
        name: `${targetClip.name} (Audio)`,
        mediaUrl: targetClip.mediaUrl,
        start: targetClip.start,
        duration: targetClip.duration,
        sourceStart: targetClip.sourceStart || 0,
        sourceDuration: targetClip.sourceDuration || targetClip.duration,
        speed: targetClip.speed || 1,
        audioProps: {
          volume: (targetClip.audioProps && targetClip.audioProps.volume != null) ? targetClip.audioProps.volume : 1,
          fadeIn: 0,
          fadeOut: 0,
          mute: false,
          pitchShift: 0,
          noiseReduction: false,
          noiseStrength: 50,
          equalizer: { bass: 0, mid: 0, treble: 0, preset: 'normal' },
          voiceChanger: 'none',
        },
        keyframes: [],
      };

      updatedTracks = updatedTracks.map((track) => {
        if (track.id === audioTrack.id) {
          return {
            ...track,
            clips: [...track.clips, newAudioClip],
          };
        }
        return {
          ...track,
          clips: track.clips.map((c) => {
            if (c.id === targetId) {
              return {
                ...c,
                audioProps: {
                  ...(c.audioProps || {}),
                  mute: true,
                },
              };
            }
            return c;
          }),
        };
      });

      const updatedProject = {
        ...project,
        tracks: updatedTracks,
        duration: recalculateDuration({ ...project, tracks: updatedTracks }),
        updatedAt: Date.now(),
      };

      set({ project: updatedProject, selectedClipIds: [extractedClipId] });
      saveProjectToDB(updatedProject);
      toastSuccess('Audio extracted to independent audio track', 'Audio Extracted');
      window.dispatchEvent(new CustomEvent('clipforge:redraw'));
    },

    addKeyframe: (clipId, prop, value, easing = 'easeInOut', targetTime = null) => {
      pushHistory();
      const { project, currentTime } = get();
      let newId = '';
      const updatedTracks = project.tracks.map((track) => {
        const clipIdx = track.clips.findIndex((c) => c.id === clipId);
        if (clipIdx !== -1) {
          const clip = track.clips[clipIdx];
          const relTime = targetTime !== null ? Math.max(0, targetTime) : Math.max(0, Math.min(clip.duration, currentTime - clip.start));
          newId = `kf_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          const newKf = {
            id: newId,
            time: Math.round(relTime * 1000) / 1000,
            property: prop,
            value: Number(value),
            easing,
          };
          const filtered = (clip.keyframes || []).filter(
            (k) => !(k.property === prop && Math.abs(k.time - relTime) <= 0.04)
          );
          const updatedClips = [...track.clips];
          updatedClips[clipIdx] = {
            ...clip,
            keyframes: [...filtered, newKf].sort((a, b) => a.time - b.time),
          };
          return { ...track, clips: updatedClips };
        }
        return track;
      });
      const updatedProject = {
        ...project,
        tracks: updatedTracks,
        updatedAt: Date.now(),
      };
      set({ project: updatedProject, selectedKeyframeId: newId });
      saveProjectToDB(updatedProject);
      window.dispatchEvent(new CustomEvent('clipforge:redraw'));
    },

    addPositionKeyframe: (clipId, xVal, yVal, easing = 'easeInOut', targetTime = null) => {
      pushHistory();
      const { project, currentTime } = get();
      let createdId = '';
      const updatedTracks = project.tracks.map((track) => {
        const clipIdx = track.clips.findIndex((c) => c.id === clipId);
        if (clipIdx !== -1) {
          const clip = track.clips[clipIdx];
          const relTime = targetTime !== null ? Math.max(0, targetTime) : Math.max(0, Math.min(clip.duration, currentTime - clip.start));
          const roundedTime = Math.round(relTime * 1000) / 1000;
          createdId = `kf_${Date.now()}_x`;
          const newKfX = {
            id: createdId,
            time: roundedTime,
            property: 'x',
            value: Number(xVal),
            easing,
          };
          const newKfY = {
            id: `kf_${Date.now()}_y`,
            time: roundedTime,
            property: 'y',
            value: Number(yVal),
            easing,
          };
          const filtered = (clip.keyframes || []).filter(
            (k) => !((k.property === 'x' || k.property === 'y') && Math.abs(k.time - relTime) <= 0.04)
          );
          const updatedClips = [...track.clips];
          updatedClips[clipIdx] = {
            ...clip,
            keyframes: [...filtered, newKfX, newKfY].sort((a, b) => a.time - b.time),
          };
          return { ...track, clips: updatedClips };
        }
        return track;
      });
      const updatedProject = {
        ...project,
        tracks: updatedTracks,
        updatedAt: Date.now(),
      };
      set({ project: updatedProject, selectedKeyframeId: createdId });
      saveProjectToDB(updatedProject);
      window.dispatchEvent(new CustomEvent('clipforge:redraw'));
    },

    removeKeyframe: (clipId, keyframeId) => {
      pushHistory();
      const { project, selectedKeyframeId } = get();
      const updatedTracks = project.tracks.map((track) => {
        const clipIdx = track.clips.findIndex((c) => c.id === clipId);
        if (clipIdx !== -1) {
          const clip = track.clips[clipIdx];
          const updatedClips = [...track.clips];
          updatedClips[clipIdx] = {
            ...clip,
            keyframes: (clip.keyframes || []).filter((k) => k.id !== keyframeId),
          };
          return { ...track, clips: updatedClips };
        }
        return track;
      });
      const updatedProject = {
        ...project,
        tracks: updatedTracks,
        updatedAt: Date.now(),
      };
      set({
        project: updatedProject,
        selectedKeyframeId: selectedKeyframeId === keyframeId ? null : selectedKeyframeId,
      });
      saveProjectToDB(updatedProject);
      window.dispatchEvent(new CustomEvent('clipforge:redraw'));
    },

    removeKeyframeAtTime: (clipId, prop, targetTime = null) => {
      pushHistory();
      const { project, currentTime, selectedKeyframeId } = get();
      const updatedTracks = project.tracks.map((track) => {
        const clipIdx = track.clips.findIndex((c) => c.id === clipId);
        if (clipIdx !== -1) {
          const clip = track.clips[clipIdx];
          const relTime = targetTime !== null ? targetTime : Math.max(0, Math.min(clip.duration, currentTime - clip.start));
          const updatedClips = [...track.clips];
          const remaining = (clip.keyframes || []).filter((k) => {
            if (prop === 'position') {
              return !((k.property === 'x' || k.property === 'y') && Math.abs(k.time - relTime) <= 0.04);
            }
            return !(k.property === prop && Math.abs(k.time - relTime) <= 0.04);
          });
          updatedClips[clipIdx] = {
            ...clip,
            keyframes: remaining,
          };
          return { ...track, clips: updatedClips };
        }
        return track;
      });
      const updatedProject = {
        ...project,
        tracks: updatedTracks,
        updatedAt: Date.now(),
      };
      set({ project: updatedProject });
      saveProjectToDB(updatedProject);
      window.dispatchEvent(new CustomEvent('clipforge:redraw'));
    },

    removeKeyframesAtTimeGroup: (clipId, targetTime) => {
      pushHistory();
      const { project } = get();
      const updatedTracks = project.tracks.map((track) => {
        const clipIdx = track.clips.findIndex((c) => c.id === clipId);
        if (clipIdx !== -1) {
          const clip = track.clips[clipIdx];
          const updatedClips = [...track.clips];
          updatedClips[clipIdx] = {
            ...clip,
            keyframes: (clip.keyframes || []).filter((k) => Math.abs(k.time - targetTime) > 0.04),
          };
          return { ...track, clips: updatedClips };
        }
        return track;
      });
      const updatedProject = {
        ...project,
        tracks: updatedTracks,
        updatedAt: Date.now(),
      };
      set({ project: updatedProject, selectedKeyframeId: null });
      saveProjectToDB(updatedProject);
      window.dispatchEvent(new CustomEvent('clipforge:redraw'));
    },

    updateKeyframe: (clipId, keyframeId, updates) => {
      pushHistory();
      const { project } = get();
      const updatedTracks = project.tracks.map((track) => {
        const clipIdx = track.clips.findIndex((c) => c.id === clipId);
        if (clipIdx !== -1) {
          const clip = track.clips[clipIdx];
          const updatedKfs = (clip.keyframes || []).map((k) => {
            if (k.id === keyframeId) {
              return { ...k, ...updates };
            }
            return k;
          });
          const updatedClips = [...track.clips];
          updatedClips[clipIdx] = {
            ...clip,
            keyframes: updatedKfs,
          };
          return { ...track, clips: updatedClips };
        }
        return track;
      });
      const updatedProject = {
        ...project,
        tracks: updatedTracks,
        updatedAt: Date.now(),
      };
      set({ project: updatedProject });
      saveProjectToDB(updatedProject);
      window.dispatchEvent(new CustomEvent('clipforge:redraw'));
    },

    updateKeyframeTime: (clipId, keyframeId, newTime) => {
      const { project } = get();
      const updatedTracks = project.tracks.map((track) => {
        const clipIdx = track.clips.findIndex((c) => c.id === clipId);
        if (clipIdx !== -1) {
          const clip = track.clips[clipIdx];
          const clampedTime = Math.max(0, Math.min(clip.duration, Math.round(newTime * 1000) / 1000));
          const targetKf = (clip.keyframes || []).find((k) => k.id === keyframeId);
          if (!targetKf) return track;
          const origTime = targetKf.time;
          
          // Move this keyframe and any keyframe sharing the same original timestamp (e.g. x and y pair)
          const updatedKfs = (clip.keyframes || []).map((k) => {
            if (k.id === keyframeId || Math.abs(k.time - origTime) <= 0.02) {
              return { ...k, time: clampedTime };
            }
            return k;
          }).sort((a, b) => a.time - b.time);

          const updatedClips = [...track.clips];
          updatedClips[clipIdx] = {
            ...clip,
            keyframes: updatedKfs,
          };
          return { ...track, clips: updatedClips };
        }
        return track;
      });
      const updatedProject = {
        ...project,
        tracks: updatedTracks,
        updatedAt: Date.now(),
      };
      set({ project: updatedProject });
      saveProjectToDB(updatedProject);
      window.dispatchEvent(new CustomEvent('clipforge:redraw'));
    },

    addMarker: (time, label = 'Marker', color = '#8b5cf6') => {
      const { project, currentTime } = get();
      const markerTime = time !== undefined ? time : currentTime;
      const newMarker = {
        id: `marker_${Date.now()}`,
        time: markerTime,
        label,
        color,
      };
      set({
        project: {
          ...project,
          markers: [...(project.markers || []), newMarker].sort((a, b) => a.time - b.time),
        },
      });
    },

    removeMarker: (markerId) => {
      const { project } = get();
      set({
        project: {
          ...project,
          markers: (project.markers || []).filter((m) => m.id !== markerId),
        },
      });
    },

    undo: () => {
      const { undoStack, redoStack, project } = get();
      if (undoStack.length === 0) return;

      const previous = undoStack[undoStack.length - 1];
      const newUndoStack = undoStack.slice(0, -1);
      const newRedoStack = [JSON.parse(JSON.stringify(project)), ...redoStack];

      set({
        project: previous,
        undoStack: newUndoStack,
        redoStack: newRedoStack,
      });
      saveProjectToDB(previous);
      window.dispatchEvent(new CustomEvent('clipforge:redraw'));
    },

    redo: () => {
      const { undoStack, redoStack, project } = get();
      if (redoStack.length === 0) return;

      const next = redoStack[0];
      const newRedoStack = redoStack.slice(1);
      const newUndoStack = [...undoStack, JSON.parse(JSON.stringify(project))];

      set({
        project: next,
        undoStack: newUndoStack,
        redoStack: newRedoStack,
      });
      saveProjectToDB(next);
      window.dispatchEvent(new CustomEvent('clipforge:redraw'));
    },

    pushHistory,

    copySelected: () => {
      const { project, selectedClipIds } = get();
      if (!selectedClipIds || selectedClipIds.length === 0) return;
      const copied = [];
      project.tracks.forEach((track) => {
        track.clips.forEach((clip) => {
          if (selectedClipIds.includes(clip.id)) {
            copied.push(JSON.parse(JSON.stringify(clip)));
          }
        });
      });
      if (copied.length > 0) {
        set({ copiedClips: copied });
        toastSuccess(`Copied ${copied.length} clip${copied.length > 1 ? 's' : ''}`, 'Copied');
      }
    },

    extractAudioFromClip: (clipId) => {
      pushHistory();
      const { project, addClipToTrack, addTrack } = get();
      let targetClip = null;
      for (const track of project.tracks) {
        const found = track.clips.find((c) => c.id === clipId);
        if (found) {
          targetClip = found;
          break;
        }
      }
      if (!targetClip) return;

      let audioTrack = project.tracks.find((t) => t.type === 'audio');
      if (!audioTrack) {
        const newTrackId = `track_audio_${Date.now()}`;
        addTrack('audio');
        audioTrack = get().project.tracks.find((t) => t.type === 'audio');
      }

      if (audioTrack) {
        const extractedClip = {
          ...targetClip,
          id: `clip_audio_ext_${Date.now()}`,
          trackId: audioTrack.id,
          type: 'audio',
          name: `Audio: ${targetClip.name}`,
          audioProps: {
            volume: 1.0,
            fadeIn: 0.1,
            fadeOut: 0.2,
            mute: false,
            pitchShift: 0,
          },
          keyframes: [],
        };
        addClipToTrack(audioTrack.id, extractedClip);
      }
    },

    autoCutSilence: () => {
      pushHistory();
      const { project } = get();
      // Remove gaps between clips and tighten tracks
      const updatedTracks = project.tracks.map((track) => {
        let currentPos = 0;
        const sortedClips = [...track.clips].sort((a, b) => a.start - b.start);
        const tightened = sortedClips.map((clip) => {
          const newStart = currentPos;
          currentPos += clip.duration;
          return { ...clip, start: newStart };
        });
        return { ...track, clips: tightened };
      });

      const updatedProject = {
        ...project,
        tracks: updatedTracks,
        duration: recalculateDuration({ ...project, tracks: updatedTracks }),
        updatedAt: Date.now(),
      };
      set({ project: updatedProject });
      saveProjectToDB(updatedProject);
    },

    performAutoCutSilence: (clipId, silenceGaps = []) => {
      pushHistory();
      const { project } = get();
      if (!clipId || !silenceGaps || silenceGaps.length === 0) return;

      let foundClip = null;
      let targetTrackId = null;

      for (const t of project.tracks) {
        const c = t.clips.find((item) => item.id === clipId);
        if (c) {
          foundClip = c;
          targetTrackId = t.id;
          break;
        }
      }

      if (!foundClip) return;

      // Calculate audible segments between silence gaps
      // Silence gaps are relative to clip start [gap.start, gap.end] in seconds
      const sortedGaps = [...silenceGaps]
        .map((g) => ({
          start: Math.max(0, Math.min(foundClip.duration, g.start)),
          end: Math.max(0, Math.min(foundClip.duration, g.end)),
        }))
        .filter((g) => g.end > g.start)
        .sort((a, b) => a.start - b.start);

      if (sortedGaps.length === 0) return;

      const audibleSegments = [];
      let currentRelStart = 0;

      sortedGaps.forEach((gap) => {
        if (gap.start - currentRelStart > 0.15) {
          audibleSegments.push({
            start: currentRelStart,
            end: gap.start,
            duration: gap.start - currentRelStart,
          });
        }
        currentRelStart = Math.max(currentRelStart, gap.end);
      });

      if (foundClip.duration - currentRelStart > 0.15) {
        audibleSegments.push({
          start: currentRelStart,
          end: foundClip.duration,
          duration: foundClip.duration - currentRelStart,
        });
      }

      if (audibleSegments.length === 0) return;

      // Build replacement clips
      let currentTimelinePos = foundClip.start;
      const replacementClips = audibleSegments.map((seg, idx) => {
        const segDuration = seg.duration;
        const newClip = {
          ...foundClip,
          id: `${foundClip.id}_cut_${idx}_${Date.now()}`,
          start: currentTimelinePos,
          duration: segDuration,
          sourceStart: foundClip.sourceStart + seg.start * (foundClip.speed || 1),
          sourceDuration: segDuration,
          keyframes: (foundClip.keyframes || [])
            .filter((k) => k.time >= seg.start && k.time <= seg.end)
            .map((k) => ({ ...k, id: `kf_${Date.now()}_${Math.random()}`, time: k.time - seg.start })),
        };
        currentTimelinePos += segDuration;
        return newClip;
      });

      const totalRemovedSilence = foundClip.duration - (currentTimelinePos - foundClip.start);

      // Replace in tracks and ripple subsequent clips
      const updatedTracks = project.tracks.map((track) => {
        if (track.id !== targetTrackId) {
          // Ripple other tracks if magnetic
          return track;
        }
        const clipIdx = track.clips.findIndex((c) => c.id === clipId);
        if (clipIdx === -1) return track;

        const newClips = [...track.clips];
        newClips.splice(clipIdx, 1, ...replacementClips);

        // Ripple clips that started after this clip on this track
        const finalClips = newClips.map((c) => {
          if (c.start > foundClip.start + foundClip.duration - 0.05) {
            return {
              ...c,
              start: Math.max(0, c.start - totalRemovedSilence),
            };
          }
          return c;
        });

        return { ...track, clips: finalClips };
      });

      const updatedProject = {
        ...project,
        tracks: updatedTracks,
        duration: recalculateDuration({ ...project, tracks: updatedTracks }),
        updatedAt: Date.now(),
      };

      set({
        project: updatedProject,
        selectedClipIds: replacementClips.length > 0 ? [replacementClips[0].id] : [],
      });
      saveProjectToDB(updatedProject);
      window.dispatchEvent(new CustomEvent('clipforge:redraw'));
    },

    autoReframe: () => {
      pushHistory();
      const { project } = get();
      // Auto reframe scale based on aspect ratio
      const isVertical = project.aspectRatio === '9:16' || project.aspectRatio === '4:5';
      const updatedTracks = project.tracks.map((track) => {
        if (track.type === 'video') {
          return {
            ...track,
            clips: track.clips.map((clip) => ({
              ...clip,
              scale: isVertical ? 1.4 : 1.0,
              x: 0,
              y: 0,
            })),
          };
        }
        return track;
      });
      const updatedProject = {
        ...project,
        tracks: updatedTracks,
        updatedAt: Date.now(),
      };
      set({ project: updatedProject });
      saveProjectToDB(updatedProject);
    },

    pasteClips: () => {
      const { copiedClips, currentTime, addClipToTrack, project } = get();
      if (copiedClips.length === 0) return;

      copiedClips.forEach((clip) => {
        const targetTrack = project.tracks.find((t) => t.id === clip.trackId) || project.tracks[0];
        if (targetTrack) {
          const newClip = {
            ...clip,
            id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            start: currentTime,
          };
          addClipToTrack(targetTrack.id, newClip);
        }
      });
    },
  };
});

export const ClipUpdates = Object.freeze({});

export const EditorState = Object.freeze({});
