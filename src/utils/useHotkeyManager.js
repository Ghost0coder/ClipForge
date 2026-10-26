import { useEffect } from 'react';
import { useEditorStore } from '../store/editorStore';

/**
 * Structured registry of hotkey definitions for UI presentation and documentation.
 */
export const HOTKEY_DEFINITIONS = [
  {
    category: 'Playback & Navigation',
    shortcuts: [
      {
        keys: ['Space'],
        description: 'Play / Pause playback toggle',
      },
      {
        keys: ['←', '→'],
        description: 'Step 1 frame backward / forward (hold Shift for 1 sec)',
      },
      {
        keys: ['J', 'K', 'L'],
        description: 'Rewind (J), Pause (K), Forward (L) NLE shuttle',
      },
      {
        keys: ['↑', '↓'],
        description: 'Jump to previous / next cut or split point',
      },
      {
        keys: ['Home', 'End'],
        description: 'Jump to beginning (0:00) / project end',
      },
    ],
  },
  {
    category: 'Clip Editing',
    shortcuts: [
      {
        keys: ['Delete', 'Backspace'],
        description: 'Delete selected clip(s)',
      },
      {
        keys: ['Shift', 'Delete'],
        description: 'Ripple delete selected clip(s) and close gap',
      },
      {
        keys: ['Ctrl/⌘', 'Z'],
        description: 'Undo last timeline change',
      },
      {
        keys: ['Ctrl/⌘', 'Shift', 'Z'],
        description: 'Redo previously undone change (or Ctrl/⌘ + Y)',
      },
      {
        keys: ['S'],
        description: 'Split clip at playhead position (or Ctrl/⌘ + B)',
      },
      {
        keys: ['Ctrl/⌘', 'D'],
        description: 'Duplicate selected clip',
      },
      {
        keys: ['Ctrl/⌘', 'C'],
        description: 'Copy selected clip(s)',
      },
      {
        keys: ['Ctrl/⌘', 'X'],
        description: 'Cut selected clip(s)',
      },
      {
        keys: ['Ctrl/⌘', 'V'],
        description: 'Paste copied clip(s) at playhead',
      },
      {
        keys: ['F'],
        description: 'Freeze frame on selected video clip',
      },
    ],
  },
  {
    category: 'Selection & Timeline View',
    shortcuts: [
      {
        keys: ['Ctrl/⌘', 'A'],
        description: 'Select all clips on visible tracks',
      },
      {
        keys: ['Esc'],
        description: 'Deselect all clips / Close open dialogs',
      },
      {
        keys: ['+', '-'],
        description: 'Zoom timeline in / out',
      },
      {
        keys: ['Shift', 'Z'],
        description: 'Reset timeline zoom to default',
      },
      {
        keys: ['N'],
        description: 'Toggle timeline snapping on / off',
      },
      {
        keys: ['G'],
        description: 'Toggle safe margin guides & grid overlay',
      },
      {
        keys: ['M'],
        description: 'Toggle mute for first audio track',
      },
    ],
  },
  {
    category: 'Dialogs & Windows',
    shortcuts: [
      {
        keys: ['Ctrl/⌘', 'E'],
        description: 'Open Export / Render dialog',
      },
      {
        keys: ['Ctrl/⌘', 'B'],
        description: 'Toggle Left Tool Panel on/off',
      },
      {
        keys: ['?'],
        description: 'Toggle Keyboard Shortcuts cheat sheet',
      },
    ],
  },
];

/**
 * Checks whether an element is an editable input or text field where hotkeys should be ignored.
 */
function isEditableElement(el) {
  if (!el) return false;
  const tag = (el.tagName || '').toUpperCase();
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    el.isContentEditable ||
    el.getAttribute('role') === 'textbox'
  );
}

/**
 * Global Hotkey Manager Hook
 * Binds and manages all editor keyboard shortcuts cleanly in a single centralized handler.
 */
export function useHotkeyManager() {
  const {
    project,
    togglePlay,
    pause,
    play,
    stepForward,
    stepBackward,
    seek,
    deleteSelectedClips,
    undo,
    redo,
    splitClipAtPlayhead,
    duplicateClip,
    copySelected,
    cutSelected,
    pasteClips,
    selectAllClips,
    deselectAll,
    selectedClipIds,
    copiedClips,
    freezeFrame,
    zoom,
    setZoom,
    toggleSnapping,
    toggleSafeGuides,
    toggleTrackMute,
    jumpToPrevCut,
    jumpToNextCut,
    isExportModalOpen,
    setExportModalOpen,
    isProjectManagerOpen,
    setProjectManagerOpen,
    isShortcutsModalOpen,
    setShortcutsModalOpen,
    toggleShortcutsModal,
    isMobileToolDrawerOpen,
    setMobileToolDrawerOpen,
  } = useEditorStore();

  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      const inInput = isEditableElement(activeEl);

      // Handle Escape even if focused on an input to blur it or close modals
      if (e.key === 'Escape') {
        if (inInput) {
          activeEl.blur();
          return;
        }
        if (isShortcutsModalOpen) {
          setShortcutsModalOpen(false);
          return;
        }
        if (isExportModalOpen) {
          setExportModalOpen(false);
          return;
        }
        if (isProjectManagerOpen) {
          setProjectManagerOpen(false);
          return;
        }
        if (isMobileToolDrawerOpen) {
          setMobileToolDrawerOpen(false);
          return;
        }
        if (selectedClipIds.length > 0) {
          deselectAll();
          return;
        }
        return;
      }

      // If user is typing inside an input/textarea, do NOT trigger video editing hotkeys!
      if (inInput) {
        return;
      }

      const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const isCtrlOrCmd = isMac ? e.metaKey : e.ctrlKey || e.metaKey;

      // 1. Play / Pause ('Space')
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
        return;
      }

      // 2. Undo / Redo ('Ctrl+Z' / 'Ctrl+Y')
      if (isCtrlOrCmd && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }
      if (isCtrlOrCmd && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redo();
        return;
      }

      // 3. Delete Selected Keyframe or Clip(s) ('Delete' / 'Backspace')
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const currentStore = useEditorStore.getState();
        const kfId = currentStore.selectedKeyframeId;
        const currentClipId = currentStore.selectedClipIds[0];
        if (kfId && currentClipId) {
          e.preventDefault();
          currentStore.removeKeyframe(currentClipId, kfId);
          return;
        }
        if (selectedClipIds.length > 0) {
          e.preventDefault();
          // Shift+Delete triggers ripple delete
          deleteSelectedClips(e.shiftKey);
          return;
        }
      }

      // 4. Split Clip at Playhead ('S' or 'Ctrl+B')
      if (
        (!isCtrlOrCmd && (e.key === 's' || e.key === 'S')) ||
        (isCtrlOrCmd && (e.key === 'b' || e.key === 'B'))
      ) {
        e.preventDefault();
        splitClipAtPlayhead();
        return;
      }

      // 5. Duplicate Selected ('Ctrl+D')
      if (isCtrlOrCmd && (e.key === 'd' || e.key === 'D')) {
        if (selectedClipIds.length > 0) {
          e.preventDefault();
          duplicateClip(selectedClipIds[0]);
          return;
        }
      }

      // 6. Copy Selected ('Ctrl+C')
      if (isCtrlOrCmd && (e.key === 'c' || e.key === 'C')) {
        if (selectedClipIds.length > 0) {
          e.preventDefault();
          copySelected();
          return;
        }
      }

      // 7. Cut Selected ('Ctrl+X')
      if (isCtrlOrCmd && (e.key === 'x' || e.key === 'X')) {
        if (selectedClipIds.length > 0) {
          e.preventDefault();
          cutSelected();
          return;
        }
      }

      // 8. Paste ('Ctrl+V')
      if (isCtrlOrCmd && (e.key === 'v' || e.key === 'V')) {
        if (copiedClips.length > 0) {
          e.preventDefault();
          pasteClips();
          return;
        }
      }

      // 9. Select All ('Ctrl+A')
      if (isCtrlOrCmd && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        selectAllClips();
        return;
      }

      // 10. Freeze Frame on Selected Clip ('F' without modifier)
      if (!isCtrlOrCmd && (e.key === 'f' || e.key === 'F')) {
        if (selectedClipIds.length > 0) {
          e.preventDefault();
          freezeFrame(selectedClipIds[0]);
          return;
        }
      }

      // 11. Frame Stepping & Jog / Shuttle
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepBackward(e.shiftKey ? 30 : 1);
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepForward(e.shiftKey ? 30 : 1);
        return;
      }
      if (!isCtrlOrCmd && (e.key === 'j' || e.key === 'J')) {
        e.preventDefault();
        stepBackward(e.shiftKey ? 30 : 5);
        return;
      }
      if (!isCtrlOrCmd && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        pause();
        return;
      }
      if (!isCtrlOrCmd && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        stepForward(e.shiftKey ? 30 : 5);
        return;
      }

      // 12. Cut Jump Navigation (Up/Down)
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        jumpToPrevCut();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        jumpToNextCut();
        return;
      }

      // 13. Jump to Start / End ('Home' / 'End' / '0')
      if (e.key === 'Home' || (!isCtrlOrCmd && e.key === '0')) {
        e.preventDefault();
        seek(0);
        return;
      }
      if (e.key === 'End') {
        e.preventDefault();
        seek(project.duration);
        return;
      }

      // 14. Zoom In / Out ('+' / '-' or 'Shift+Z' to fit)
      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        setZoom(zoom + 15);
        return;
      }
      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setZoom(zoom - 15);
        return;
      }
      if (e.shiftKey && (e.key === 'z' || e.key === 'Z') && !isCtrlOrCmd) {
        e.preventDefault();
        setZoom(45);
        return;
      }

      // 15. Timeline Snapping ('N')
      if (!isCtrlOrCmd && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        toggleSnapping();
        return;
      }

      // 16. Safe Guides Overlay ('G')
      if (!isCtrlOrCmd && (e.key === 'g' || e.key === 'G')) {
        e.preventDefault();
        toggleSafeGuides();
        return;
      }

      // 17. Track Mute ('M')
      if (!isCtrlOrCmd && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        const audioTrack = project.tracks.find((t) => t.type === 'audio');
        if (audioTrack) {
          toggleTrackMute(audioTrack.id);
        }
        return;
      }

      // 18. Open Export Dialog ('Ctrl+E')
      if (isCtrlOrCmd && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        setExportModalOpen(true);
        return;
      }

      // Toggle Left Panel ('Ctrl+B')
      if (isCtrlOrCmd && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        useEditorStore.getState().toggleLeftPanel();
        return;
      }

      // 19. Open Shortcuts Cheat Sheet ('?' or 'Shift+/')
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        toggleShortcutsModal();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    project,
    togglePlay,
    pause,
    play,
    stepForward,
    stepBackward,
    seek,
    deleteSelectedClips,
    undo,
    redo,
    splitClipAtPlayhead,
    duplicateClip,
    copySelected,
    cutSelected,
    pasteClips,
    selectAllClips,
    deselectAll,
    selectedClipIds,
    copiedClips,
    freezeFrame,
    zoom,
    setZoom,
    toggleSnapping,
    toggleSafeGuides,
    toggleTrackMute,
    jumpToPrevCut,
    jumpToNextCut,
    isExportModalOpen,
    setExportModalOpen,
    isProjectManagerOpen,
    setProjectManagerOpen,
    isShortcutsModalOpen,
    setShortcutsModalOpen,
    toggleShortcutsModal,
    isMobileToolDrawerOpen,
    setMobileToolDrawerOpen,
  ]);
}
