import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LoadIcon, TrashIcon, AlertIcon, GithubIcon, FileTextIcon, EditIcon, SaveIcon } from './icons';
import type { SavedProject, CodeSourceInfo } from '../types';

interface LoadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (projectName: string) => void;
  onDelete: (projectName: string) => void;
  projects: Record<string, SavedProject>;
}

const ProjectSourceIcon: React.FC<{ type: CodeSourceInfo['type'] | undefined }> = ({ type }) => {
    const className = "w-4 h-4 text-gray-500 dark:text-gray-400";
    switch(type) {
        case 'github': return <GithubIcon className={className} />;
        case 'file': return <FileTextIcon />;
        case 'prompt': return <EditIcon />;
        case 'saved': return <SaveIcon />;
        default: return <FileTextIcon />;
    }
};

export const LoadDialog: React.FC<LoadDialogProps> = ({ isOpen, onClose, onLoad, onDelete, projects }) => {
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setProjectToDelete(null);
    }
  }, [isOpen]);

  const handleLoadClick = (name: string) => {
    onLoad(name);
    onClose();
  };

  const handleDeleteConfirm = () => {
    if (projectToDelete) {
      onDelete(projectToDelete);
      setProjectToDelete(null);
    }
  };

  const projectList = useMemo(() => Object.entries(projects).reverse(), [projects]);

  if (!isOpen) return null;

  const DeleteConfirmationDialog = () => (
    <div className="absolute inset-0 bg-gray-800/70 flex items-center justify-center z-10 rounded-xl">
        <div className="bg-white dark:bg-gray-700 rounded-lg shadow-2xl w-full max-w-md m-4 p-6">
            <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/50 sm:mx-0 sm:h-10 sm:w-10">
                    <AlertIcon />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-bold text-gray-900 dark:text-gray-100">Delete Project</h3>
                    <div className="mt-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Are you sure you want to delete "<strong>{projectToDelete}</strong>"? This action cannot be undone.
                        </p>
                    </div>
                </div>
            </div>
            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
                <button onClick={handleDeleteConfirm} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 sm:w-auto sm:text-sm">Delete</button>
                <button onClick={() => setProjectToDelete(null)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-500 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 sm:mt-0 sm:w-auto sm:text-sm">Cancel</button>
            </div>
        </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl m-4 ring-1 ring-gray-200 dark:ring-gray-700 flex flex-col max-h-[80vh] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {projectToDelete && <DeleteConfirmationDialog />}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="sm:flex sm:items-center">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 sm:mx-0 sm:h-10 sm:w-10">
              <LoadIcon />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 className="text-lg leading-6 font-bold text-gray-900 dark:text-gray-100">
                Load Project
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Select a previously saved project to load it into the editor.</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto flex-grow">
          {projectList.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">No saved projects found.</p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {projectList.map(([name, project]) => (
                <li key={name} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center min-w-0">
                     <div className="flex-shrink-0 mr-3"><ProjectSourceIcon type={project.codeSourceInfo?.type} /></div>
                    <span className="font-medium text-gray-800 dark:text-gray-200 truncate" title={name}>{name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <button onClick={() => handleLoadClick(name)} className="px-3 py-1 text-sm font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/50 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-900 transition-colors">Load</button>
                    <button onClick={() => setProjectToDelete(name)} title="Delete" className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/50 dark:hover:text-red-400 transition-colors">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 text-right">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-500 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 sm:text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
