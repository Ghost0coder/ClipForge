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
