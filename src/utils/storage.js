 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { openDB, } from 'idb';


const DB_NAME = 'ClipForge_DB';
const DB_VERSION = 1;

let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectStore.createIndex('updatedAt', 'updatedAt');
        }
        if (!db.objectStoreNames.contains('media')) {
          db.createObjectStore('media', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveProjectToDB(project) {
  try {
    const db = await getDB();
    const updatedProject = {
      ...project,
      updatedAt: Date.now(),
    };
    await db.put('projects', updatedProject);
    await db.put('settings', { key: 'last_active_project_id', value: project.id });
  } catch (error) {
    console.error('Failed to save project to IndexedDB:', error);
  }
}

export async function getProjectFromDB(id) {
  try {
    const db = await getDB();
    return await db.get('projects', id);
  } catch (error) {
    console.error('Failed to get project from IndexedDB:', error);
    return undefined;
  }
}

export async function getAllProjectsFromDB() {
  try {
    const db = await getDB();
    const projects = await db.getAll('projects');
    return projects.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (error) {
    console.error('Failed to get all projects:', error);
    return [];
  }
}

export async function deleteProjectFromDB(id) {
  try {
    const db = await getDB();
    await db.delete('projects', id);
  } catch (error) {
    console.error('Failed to delete project:', error);
  }
}

export async function purgeTrashedProjects(projectIds, onProgress) {
  const ids = Array.isArray(projectIds) ? projectIds : [projectIds];
  console.log('[ClipForge:EmptyTrash] Starting purgeTrashedProjects for count:', ids.length);
  const db = await getDB();
  const allProjects = await getAllProjectsFromDB();

  let userTemplates = [];
  try {
    const raw = localStorage.getItem('clipforge_user_templates');
    if (raw) userTemplates = JSON.parse(raw);
  } catch (e) {}

  // Projects that are NOT being purged (both active non-trashed projects AND any trashed projects not in ids)
  const remainingProjects = allProjects.filter((p) => !ids.includes(p.id));

  // Collect all media keys used by remaining projects (active OR trashed) and saved templates
  const usedKeysByOthers = new Set();
  remainingProjects.forEach((proj) => {
    (proj.tracks || []).forEach((track) => {
      (track.clips || []).forEach((clip) => {
        if (clip.mediaId) usedKeysByOthers.add(clip.mediaId);
        if (clip.id) usedKeysByOthers.add(clip.id);
      });
    });
    (proj.mediaLibrary || []).forEach((asset) => {
      if (asset.mediaId) usedKeysByOthers.add(asset.mediaId);
      if (asset.id) usedKeysByOthers.add(asset.id);
    });
  });

  userTemplates.forEach((tpl) => {
    if (tpl.mediaId) usedKeysByOthers.add(tpl.mediaId);
    (tpl.slots || []).forEach((s) => {
      if (s.mediaId) usedKeysByOthers.add(s.mediaId);
    });
  });

  let deletedProjectsCount = 0;
  let freedBytes = 0;
  const failedProjectIds = [];
  const targetMediaKeys = new Set();

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    try {
      const proj = allProjects.find((p) => p.id === id);
      if (proj) {
        // Collect candidate media keys from this project
        (proj.tracks || []).forEach((track) => {
          (track.clips || []).forEach((clip) => {
            if (clip.mediaId) targetMediaKeys.add(clip.mediaId);
            if (clip.id) targetMediaKeys.add(clip.id);
            if (clip.mediaUrl && clip.mediaUrl.startsWith('blob:')) {
              try { URL.revokeObjectURL(clip.mediaUrl); } catch (e) {}
            }
          });
        });
        (proj.mediaLibrary || []).forEach((asset) => {
          if (asset.mediaId) targetMediaKeys.add(asset.mediaId);
          if (asset.id) targetMediaKeys.add(asset.id);
          if (asset.url && asset.url.startsWith('blob:')) {
            try { URL.revokeObjectURL(asset.url); } catch (e) {}
          }
        });
      }

      // Delete project record inside per-project try/catch so one failure doesn't abort the rest
      await db.delete('projects', id);
      console.log('[ClipForge:EmptyTrash] Deleted project record from IndexedDB:', id);
      deletedProjectsCount++;
    } catch (err) {
      console.error('[ClipForge:EmptyTrash] Error deleting project record:', id, err);
      failedProjectIds.push(id);
    }

    if (onProgress) {
      onProgress(i + 1, ids.length);
    }
  }

  // Clear last active project setting if it was one of the purged projects
  const lastActive = await getLastActiveProjectId();
  if (lastActive && ids.includes(lastActive)) {
    await db.delete('settings', 'last_active_project_id');
  }

  // Delete media blobs that are not used by any remaining project or template
  for (const key of targetMediaKeys) {
    if (!usedKeysByOthers.has(key)) {
      try {
        const record = await db.get('media', key);
        if (record) {
          const blobSize = record.size || (record.blob ? record.blob.size : 0) || 0;
          freedBytes += blobSize;
          await db.delete('media', key);
          console.log('[ClipForge:EmptyTrash] Deleted media blob from IndexedDB:', key);
        }
      } catch (e) {
        console.error('[ClipForge:EmptyTrash] Error deleting media blob from IndexedDB:', key, e);
      }
    }
  }

  const freedMB = (freedBytes / (1024 * 1024)).toFixed(1);
  console.log('[ClipForge:EmptyTrash] Empty Trash process finished. Deleted count:', deletedProjectsCount, 'Freed MB:', freedMB);

  // Notify application so sidebar badges and storage meters reload immediately
  window.dispatchEvent(new CustomEvent('clipforge:projects_updated'));

  return {
    deletedProjectsCount,
    freedBytes,
    freedMB,
    failedProjectIds,
  };
}

export async function permanentlyDeleteProjectAndUnusedMedia(projectId) {
  return purgeTrashedProjects([projectId]);
}

export async function autoPurgeExpiredTrashProjects() {
  console.log('[ClipForge:EmptyTrash] Checking for expired trash projects (>30 days)...');
  try {
    const allProjects = await getAllProjectsFromDB();
    const now = Date.now();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

    const expiredIds = allProjects
      .filter((p) => p.deletedAt && now - p.deletedAt > THIRTY_DAYS_MS)
      .map((p) => p.id);

    if (expiredIds.length > 0) {
      console.log('[ClipForge:EmptyTrash] Auto-purging expired trash project IDs:', expiredIds);
      const res = await purgeTrashedProjects(expiredIds);
      return res.deletedProjectsCount;
    }
    return 0;
  } catch (err) {
    console.error('[ClipForge:EmptyTrash] Failed autoPurgeExpiredTrashProjects:', err);
    return 0;
  }
}

export async function deleteMediaBlobFromDB(id) {
  try {
    const db = await getDB();
    await db.delete('media', id);
    console.log('[ClipForge:Asset] Deleted media blob from IndexedDB:', id);
  } catch (error) {
    console.error('[ClipForge:Asset] Failed to delete media blob from IndexedDB:', error);
    throw error;
  }
}

export async function getLastActiveProjectId() {
  try {
    const db = await getDB();
    const setting = await db.get('settings', 'last_active_project_id');
    return setting ? setting.value : null;
  } catch (e2) {
    return null;
  }
}

export async function storeMediaBlob(id, file, name) {
  try {
    const db = await getDB();
    await db.put('media', {
      id,
      blob: file,
      name,
      type: file.type || 'video/webm',
      size: file.size || 0,
      createdAt: Date.now(),
    });
    console.log('[ClipForge:Storage] Successfully saved media file to IndexedDB:', {
      id,
      name,
      size: file.size,
      type: file.type,
    });
    return URL.createObjectURL(file);
  } catch (error) {
    console.error('[ClipForge:Storage] Failed to save media blob to IndexedDB:', error);
    return URL.createObjectURL(file);
  }
}

export async function getMediaBlob(id) {
  try {
    const db = await getDB();
    const record = await db.get('media', id);
    return record || null;
  } catch (error) {
    console.error('[ClipForge:Storage] Failed to retrieve media record from IndexedDB:', error);
    return null;
  }
}

export async function getMediaBlobUrl(id) {
  try {
    const record = await getMediaBlob(id);
    if (record && record.blob) {
      return URL.createObjectURL(record.blob);
    }
    return null;
  } catch (e3) {
    return null;
  }
}

export async function restoreProjectMediaUrls(project) {
  try {
    const updatedTracks = await Promise.all(
      project.tracks.map(async (track) => {
        const updatedClips = await Promise.all(
          track.clips.map(async (clip) => {
            const mediaKey = clip.mediaId || clip.id;
            if (mediaKey) {
              const record = await getMediaBlob(mediaKey);
              if (record && record.blob) {
                const freshUrl = URL.createObjectURL(record.blob);
                console.log('[ClipForge:Storage] Rehydrated media blob URL from IndexedDB for clip:', {
                  clipId: clip.id,
                  mediaKey,
                  name: clip.name,
                });
                return {
                  ...clip,
                  mediaUrl: freshUrl,
                  mediaId: mediaKey,
                };
              }
            }
            return clip;
          })
        );
        return { ...track, clips: updatedClips };
      })
    );
    return { ...project, tracks: updatedTracks };
  } catch (err) {
    console.error('[ClipForge:Storage] Error restoring project media URLs:', err);
    return project;
  }
}

export function exportProjectToJson(project) {
  const json = JSON.stringify(project, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name.toLowerCase().replace(/\s+/g, '_')}_clipforge.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseProjectJson(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = _optionalChain([e, 'access', _ => _.target, 'optionalAccess', _2 => _2.result]) ;
        const project = JSON.parse(text) ;
        if (!project.id || !project.tracks) {
          throw new Error('Invalid project file format');
        }
        resolve(project);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export async function calculateProjectMediaSize(project) {
  if (!project) return 0;
  try {
    const db = await getDB();
    const mediaKeys = new Set();
    (project.tracks || []).forEach((t) => {
      (t.clips || []).forEach((c) => {
        if (c.mediaId) mediaKeys.add(c.mediaId);
        if (c.id) mediaKeys.add(c.id);
      });
    });
    (project.mediaLibrary || []).forEach((a) => {
      if (a.mediaId) mediaKeys.add(a.mediaId);
      if (a.id) mediaKeys.add(a.id);
    });

    let bytes = 0;
    for (const key of mediaKeys) {
      const rec = await db.get('media', key);
      if (rec) {
        bytes += rec.size || (rec.blob ? rec.blob.size : 0) || 0;
      }
    }
    return bytes;
  } catch (e) {
    return 0;
  }
}

export async function permanentlyDeleteProjectsWithProgress(projectIds, onProgress) {
  console.log('[ClipForge:Trash] Permanently deleting projects with progress tracking:', projectIds);
  const db = await getDB();
  const allProjects = await getAllProjectsFromDB();
  const totalCount = projectIds.length;

  let userTemplates = [];
  try {
    const raw = localStorage.getItem('clipforge_user_templates');
    if (raw) userTemplates = JSON.parse(raw);
  } catch (e) {}

  // Projects that are NOT being deleted
  const remainingProjects = allProjects.filter((p) => !projectIds.includes(p.id));

  // Collect all media keys used by remaining projects (both active and remaining trashed) and templates
  const usedKeysByOthers = new Set();
  remainingProjects.forEach((proj) => {
    (proj.tracks || []).forEach((track) => {
      (track.clips || []).forEach((clip) => {
        if (clip.mediaId) usedKeysByOthers.add(clip.mediaId);
        if (clip.id) usedKeysByOthers.add(clip.id);
      });
    });
    (proj.mediaLibrary || []).forEach((asset) => {
      if (asset.mediaId) usedKeysByOthers.add(asset.mediaId);
      if (asset.id) usedKeysByOthers.add(asset.id);
    });
  });

  userTemplates.forEach((tpl) => {
    if (tpl.mediaId) usedKeysByOthers.add(tpl.mediaId);
    (tpl.slots || []).forEach((s) => {
      if (s.mediaId) usedKeysByOthers.add(s.mediaId);
    });
  });

  // Collect all candidate media keys to be purged from the target projects
  const targetMediaKeys = new Set();
  let completedCount = 0;

  for (const id of projectIds) {
    const proj = allProjects.find((p) => p.id === id);
    if (proj) {
      (proj.tracks || []).forEach((track) => {
        (track.clips || []).forEach((clip) => {
          if (clip.mediaId) targetMediaKeys.add(clip.mediaId);
          if (clip.id) targetMediaKeys.add(clip.id);
          if (clip.mediaUrl && clip.mediaUrl.startsWith('blob:')) {
            try { URL.revokeObjectURL(clip.mediaUrl); } catch (e) {}
          }
        });
      });
      (proj.mediaLibrary || []).forEach((asset) => {
        if (asset.mediaId) targetMediaKeys.add(asset.mediaId);
        if (asset.id) targetMediaKeys.add(asset.id);
        if (asset.url && asset.url.startsWith('blob:')) {
          try { URL.revokeObjectURL(asset.url); } catch (e) {}
        }
      });
    }

    // Delete project record
    await db.delete('projects', id);
    completedCount++;
    if (onProgress) {
      onProgress(completedCount, totalCount);
    }
  }

  // Clear last active project setting if it was one of the deleted projects
  const lastActive = await getLastActiveProjectId();
  if (lastActive && projectIds.includes(lastActive)) {
    await db.delete('settings', 'last_active_project_id');
  }

  // Delete media blobs that are not used by any remaining project or template
  let freedBytes = 0;
  for (const key of targetMediaKeys) {
    if (!usedKeysByOthers.has(key)) {
      try {
        const record = await db.get('media', key);
        if (record) {
          freedBytes += record.size || (record.blob ? record.blob.size : 0) || 0;
          await db.delete('media', key);
          console.log('[ClipForge:Trash] Deleted unreferenced media blob:', key);
        }
      } catch (e) {}
    }
  }

  const freedMB = (freedBytes / (1024 * 1024)).toFixed(1);
  console.log('[ClipForge:Trash] Permanent deletion finished. Freed bytes:', freedBytes, `(${freedMB} MB)`);

  // Dispatch custom event to notify storage & sidebar badge
  window.dispatchEvent(new CustomEvent('clipforge:projects_updated'));

  return {
    freedBytes,
    freedMB,
    count: completedCount,
  };
}

export async function calculateTotalStorageUsage() {
  console.log('[ClipForge:Storage] Calculating total IndexedDB storage usage with Trash breakdown...');
  try {
    const db = await getDB();
    const allRecords = await db.getAll('media');
    const allProjects = await getAllProjectsFromDB();

    let userTemplates = [];
    try {
      const raw = localStorage.getItem('clipforge_user_templates');
      if (raw) userTemplates = JSON.parse(raw);
    } catch (e) {}

    const activeKeys = new Set();
    const trashKeys = new Set();

    allProjects.forEach((proj) => {
      const isTrashed = !!proj.deletedAt;
      (proj.tracks || []).forEach((t) => {
        (t.clips || []).forEach((c) => {
          if (c.mediaId) (isTrashed ? trashKeys : activeKeys).add(c.mediaId);
          if (c.id) (isTrashed ? trashKeys : activeKeys).add(c.id);
        });
      });
      (proj.mediaLibrary || []).forEach((a) => {
        if (a.mediaId) (isTrashed ? trashKeys : activeKeys).add(a.mediaId);
        if (a.id) (isTrashed ? trashKeys : activeKeys).add(a.id);
      });
    });

    userTemplates.forEach((tpl) => {
      if (tpl.mediaId) activeKeys.add(tpl.mediaId);
      (tpl.slots || []).forEach((s) => {
        if (s.mediaId) activeKeys.add(s.mediaId);
      });
    });

    let totalBytes = 0;
    let activeBytes = 0;
    let trashBytes = 0;

    allRecords.forEach((rec) => {
      const size = rec.size || (rec.blob ? rec.blob.size : 0) || 0;
      totalBytes += size;
      const key = rec.id;

      if (activeKeys.has(key)) {
        activeBytes += size;
      } else if (trashKeys.has(key)) {
        trashBytes += size;
      }
    });

    return {
      totalBytes,
      recordCount: allRecords.length,
      formattedMB: (totalBytes / (1024 * 1024)).toFixed(1),
      activeBytes,
      activeFormattedMB: (activeBytes / (1024 * 1024)).toFixed(1),
      trashBytes,
      trashFormattedMB: (trashBytes / (1024 * 1024)).toFixed(1),
    };
  } catch (err) {
    console.error('[ClipForge:Storage] Failed to calculate storage usage:', err);
    return {
      totalBytes: 0,
      recordCount: 0,
      formattedMB: '0.0',
      activeBytes: 0,
      activeFormattedMB: '0.0',
      trashBytes: 0,
      trashFormattedMB: '0.0',
    };
  }
}

export async function scanAllUnusedMedia(activeProject = null) {
  console.log('[ClipForge:ClearMedia] Initiating scanAllUnusedMedia across ALL saved projects, active project & templates...');
  try {
    const db = await getDB();
    const allProjects = await getAllProjectsFromDB();

    // Include active project if not already in list
    const projectList = [...allProjects];
    if (activeProject && !projectList.some((p) => p.id === activeProject.id)) {
      projectList.push(activeProject);
    }

    // Collect saved user templates from localStorage
    let userTemplates = [];
    try {
      const raw = localStorage.getItem('clipforge_user_templates');
      if (raw) userTemplates = JSON.parse(raw);
    } catch (e) {}

    // Set of all media keys/URLs used ANYWHERE on any timeline, clip, template, or asset
    const usedMediaKeys = new Set();

    // 1. Scan all projects (including active & trashed)
    projectList.forEach((proj) => {
      (proj.tracks || []).forEach((track) => {
        (track.clips || []).forEach((clip) => {
          if (clip.mediaId) usedMediaKeys.add(clip.mediaId);
          if (clip.id) usedMediaKeys.add(clip.id);
          if (clip.mediaUrl) usedMediaKeys.add(clip.mediaUrl);
        });
      });
      // Scan media in project.mediaLibrary if placed on any timeline clip
      (proj.mediaLibrary || []).forEach((asset) => {
        const isUsedOnTimeline = (proj.tracks || []).some((t) =>
          (t.clips || []).some(
            (c) =>
              c.mediaId === asset.mediaId ||
              c.mediaId === asset.id ||
              c.id === asset.id ||
              c.mediaUrl === asset.url
          )
        );
        if (isUsedOnTimeline) {
          if (asset.mediaId) usedMediaKeys.add(asset.mediaId);
          if (asset.id) usedMediaKeys.add(asset.id);
          if (asset.url) usedMediaKeys.add(asset.url);
        }
      });
    });

    // 2. Scan saved templates
    userTemplates.forEach((tpl) => {
      if (tpl.mediaId) usedMediaKeys.add(tpl.mediaId);
      if (tpl.url) usedMediaKeys.add(tpl.url);
      (tpl.slots || []).forEach((s) => {
        if (s.mediaId) usedMediaKeys.add(s.mediaId);
        if (s.url) usedMediaKeys.add(s.url);
      });
    });

    console.log('[ClipForge:ClearMedia] Total used media keys collected:', usedMediaKeys.size);

    // 3. Scan all IndexedDB 'media' records
    const allMediaRecords = await db.getAll('media');
    console.log('[ClipForge:ClearMedia] Total IndexedDB media records:', allMediaRecords.length);

    const unusedItems = [];

    // Scan IndexedDB records
    for (const record of allMediaRecords) {
      if (!usedMediaKeys.has(record.id)) {
        let size = record.size || (record.blob ? record.blob.size : 0) || 0;
        let objectUrl = null;
        if (record.blob) {
          try {
            objectUrl = URL.createObjectURL(record.blob);
          } catch (e) {}
        }
        unusedItems.push({
          id: record.id,
          mediaId: record.id,
          name: record.name || `Media Blob (${record.id.slice(0, 10)})`,
          type: record.type || (record.blob ? record.blob.type : 'video/webm'),
          size,
          url: objectUrl,
          source: 'indexeddb',
        });
      }
    }

    // Scan active project's mediaLibrary array for unreferenced items that might not be on timeline
    if (activeProject && activeProject.mediaLibrary) {
      activeProject.mediaLibrary.forEach((asset) => {
        const isUsed =
          usedMediaKeys.has(asset.id) ||
          (asset.mediaId && usedMediaKeys.has(asset.mediaId)) ||
          (asset.url && usedMediaKeys.has(asset.url));

        if (!isUsed && !unusedItems.some((u) => u.id === asset.id || u.mediaId === asset.mediaId)) {
          unusedItems.push({
            id: asset.id,
            mediaId: asset.mediaId || asset.id,
            name: asset.name,
            type: asset.type,
            size: asset.size || 0,
            url: asset.url,
            source: 'mediaLibrary',
          });
        }
      });
    }

    const totalUnusedBytes = unusedItems.reduce((sum, item) => sum + (item.size || 0), 0);

    console.log('[ClipForge:ClearMedia] Scan complete. Found unused items:', {
      count: unusedItems.length,
      totalUnusedBytes,
      formattedMB: (totalUnusedBytes / (1024 * 1024)).toFixed(1),
    });

    return {
      unusedItems,
      totalUnusedBytes,
    };
  } catch (err) {
    console.error('[ClipForge:ClearMedia] Error during scanAllUnusedMedia:', err);
    throw err;
  }
}

export async function purgeUnusedMediaItems(itemsToPurge, activeProject = null) {
  console.log('[ClipForge:ClearMedia] Executing purgeUnusedMediaItems for count:', itemsToPurge.length);
  const db = await getDB();
  let totalFreedBytes = 0;
  let successCount = 0;

  const purgedKeys = new Set();

  for (const item of itemsToPurge) {
    try {
      totalFreedBytes += item.size || 0;
      const keyToDelete = item.mediaId || item.id;
      if (keyToDelete) {
        await db.delete('media', keyToDelete);
        purgedKeys.add(keyToDelete);
        console.log('[ClipForge:ClearMedia] Deleted media record from IndexedDB:', keyToDelete);
      }
      if (item.url && item.url.startsWith('blob:')) {
        URL.revokeObjectURL(item.url);
      }
      successCount++;
    } catch (e) {
      console.error('[ClipForge:ClearMedia] Error purging item:', item, e);
    }
  }

  // Update active project's mediaLibrary if present
  let updatedProject = activeProject;
  if (activeProject && activeProject.mediaLibrary) {
    const remainingLibrary = activeProject.mediaLibrary.filter(
      (a) => !purgedKeys.has(a.id) && !purgedKeys.has(a.mediaId)
    );
    updatedProject = {
      ...activeProject,
      mediaLibrary: remainingLibrary,
      updatedAt: Date.now(),
    };
    await saveProjectToDB(updatedProject);
  }

  console.log('[ClipForge:ClearMedia] Purge complete:', {
    successCount,
    totalFreedBytes,
    formattedMB: (totalFreedBytes / (1024 * 1024)).toFixed(1),
  });

  return {
    successCount,
    totalFreedBytes,
    updatedProject,
  };
}
