import { openDB, IDBPDatabase } from 'idb';
import { Project } from '../types/editor';

const DB_NAME = 'ClipForge_DB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
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

export async function saveProjectToDB(project: Project): Promise<void> {
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

export async function getProjectFromDB(id: string): Promise<Project | undefined> {
  try {
    const db = await getDB();
    return await db.get('projects', id);
  } catch (error) {
    console.error('Failed to get project from IndexedDB:', error);
    return undefined;
  }
}

export async function getAllProjectsFromDB(): Promise<Project[]> {
  try {
    const db = await getDB();
    const projects = await db.getAll('projects');
    return projects.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (error) {
    console.error('Failed to get all projects:', error);
    return [];
  }
}

export async function deleteProjectFromDB(id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete('projects', id);
  } catch (error) {
    console.error('Failed to delete project:', error);
  }
}

export async function getLastActiveProjectId(): Promise<string | null> {
  try {
    const db = await getDB();
    const setting = await db.get('settings', 'last_active_project_id');
    return setting ? setting.value : null;
  } catch {
    return null;
  }
}

export async function storeMediaBlob(id: string, file: File | Blob, name: string): Promise<string> {
  try {
    const db = await getDB();
    await db.put('media', {
      id,
      blob: file,
      name,
      type: file.type,
      size: file.size,
      createdAt: Date.now(),
    });
    return URL.createObjectURL(file);
  } catch (error) {
    console.error('Failed to save media blob:', error);
    return URL.createObjectURL(file);
  }
}

export async function getMediaBlobUrl(id: string): Promise<string | null> {
  try {
    const db = await getDB();
    const record = await db.get('media', id);
    if (record && record.blob) {
      return URL.createObjectURL(record.blob);
    }
    return null;
  } catch {
    return null;
  }
}

export function exportProjectToJson(project: Project): void {
  const json = JSON.stringify(project, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name.toLowerCase().replace(/\s+/g, '_')}_clipforge.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseProjectJson(file: File): Promise<Project> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const project = JSON.parse(text) as Project;
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
