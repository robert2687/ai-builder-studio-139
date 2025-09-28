import React, { useState, useEffect, useRef } from 'react';
import { SaveIcon, LoadingSpinner } from './icons';

interface SaveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (projectName: string) => Promise<void>;
  existingProjects: string[];
}

export const SaveDialog: React.FC<SaveDialogProps> = ({ isOpen, onClose, onSave, existingProjects }) => {
  const [projectName, setProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setProjectName('');
      setError(null);
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSaveClick = async () => {
    if (!projectName.trim()) {
      setError('Please enter a project name.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await onSave(projectName.trim());
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSaveClick();
    } else if (event.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;
  
  const isOverwriting = existingProjects.includes(projectName.trim());

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg m-4 p-6 ring-1 ring-gray-200 dark:ring-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:flex sm:items-start">
          <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 sm:mx-0 sm:h-10 sm:w-10">
            <SaveIcon />
          </div>
          <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
            <h3 className="text-lg leading-6 font-bold text-gray-900 dark:text-gray-100" id="dialog-title">
              Save Project
            </h3>
            <div className="mt-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enter a name for your project. This will save the current code and its source information.
              </p>
            </div>
            <div className="mt-4">
              <label htmlFor="project-name" className="sr-only">Project Name</label>
              <input
                ref={inputRef}
                id="project-name"
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onKeyDown={handleInputKeyDown}
                disabled={isLoading}
                className="w-full p-2 bg-gray-50 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="e.g., 'My Weather App'"
              />
            </div>
            {isOverwriting && !isLoading && <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">A project with this name already exists. Saving will overwrite it.</p>}
            {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
          </div>
        </div>
        <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse gap-3">
          <button
            type="button"
            onClick={handleSaveClick}
            disabled={isLoading || !projectName.trim()}
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-indigo-500 sm:w-auto sm:text-sm transition-colors disabled:opacity-50 min-w-[100px]"
          >
            {isLoading ? <LoadingSpinner className="animate-spin h-5 w-5" /> : (isOverwriting ? 'Overwrite' : 'Save')}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-500 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
