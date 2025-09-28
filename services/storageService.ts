import type { SavedProject, CodeVersion } from '../types';

const PROJECTS_STORAGE_KEY = 'ai-builder-projects';
const HISTORY_STORAGE_KEY = 'ai-builder-version-history';
const MAX_HISTORY_ITEMS = 50;


export const getProjects = (): Record<string, SavedProject> => {
  try {
    const rawProjects = typeof window !== 'undefined' ? localStorage.getItem(PROJECTS_STORAGE_KEY) : null;
    return rawProjects ? JSON.parse(rawProjects) : {};
  } catch (error) {
    console.error("Failed to parse projects from localStorage", error);
    return {};
  }
};

export const saveProject = (name: string, project: SavedProject): void => {
  const projects = getProjects();
  projects[name] = project;
  try {
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  } catch (error)
  {
    console.error("Failed to save project to localStorage", error);
    throw new Error("Could not save the project. Storage might be full.");
  }
};

export const deleteProject = (name: string): void => {
  const projects = getProjects();
  delete projects[name];
  try {
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  } catch (error) {
    console.error("Failed to delete project from localStorage", error);
    throw new Error("Could not delete the project.");
  }
};

export const getHistory = (): CodeVersion[] => {
  try {
    const rawHistory = typeof window !== 'undefined' ? localStorage.getItem(HISTORY_STORAGE_KEY) : null;
    return rawHistory ? JSON.parse(rawHistory) : [];
  } catch (error) {
    console.error("Failed to parse version history from localStorage", error);
    return [];
  }
};

export const addToHistory = (code: string): CodeVersion[] => {
  if (!code || code.trim() === '') return getHistory();
  const history = getHistory();
  // Avoid adding duplicate of the most recent version
  if (history.length > 0 && history[0].code === code) {
    return history;
  }
  const newVersion: CodeVersion = { code, timestamp: Date.now() };
  const newHistory = [newVersion, ...history].slice(0, MAX_HISTORY_ITEMS);
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
  } catch (error) {
    console.error("Failed to save version history to localStorage", error);
  }
  return newHistory;
};
