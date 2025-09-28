import type { SavedProject } from '../types';

const PROJECTS_STORAGE_KEY = 'ai-builder-projects';

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
  } catch (error) {
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
