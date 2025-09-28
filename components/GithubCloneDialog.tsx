import React, { useState, useEffect, useRef } from 'react';
import { GithubIcon, LoadingSpinner } from './icons';
import { fetchRepoIndexHtml } from '../services/githubService';

interface GithubCloneDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onClone: (htmlContent: string) => void;
}

export const GithubCloneDialog: React.FC<GithubCloneDialogProps> = ({ isOpen, onClose, onClone }) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      // Reset state when opening
      setRepoUrl('');
      setError(null);
      setIsLoading(false);
      // Focus the input when the dialog opens
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleCloneClick = async () => {
    if (!repoUrl.trim()) {
      setError('Please enter a repository URL.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const htmlContent = await fetchRepoIndexHtml(repoUrl);
      onClone(htmlContent);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleUrlKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
        handleCloneClick();
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300 ease-in-out"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg m-4 p-6 ring-1 ring-gray-200 dark:ring-gray-700 transform transition-all duration-300 ease-in-out scale-95"
        style={{ transform: 'scale(1)' }}
      >
        <div className="sm:flex sm:items-start">
          <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-900/50 sm:mx-0 sm:h-10 sm:w-10">
            <GithubIcon className="w-6 h-6 text-gray-800 dark:text-gray-200" />
          </div>
          <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
            <h3 className="text-lg leading-6 font-bold text-gray-900 dark:text-gray-100" id="dialog-title">
              Clone from GitHub
            </h3>
            <div className="mt-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enter the URL of a public GitHub repository. We will automatically find and import the <code>index.html</code> file from the root directory.
              </p>
            </div>
            <div className="mt-4">
              <label htmlFor="repo-url" className="sr-only">Repository URL</label>
              <input
                ref={inputRef}
                id="repo-url"
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                onKeyDown={handleUrlKeyDown}
                disabled={isLoading}
                className="w-full p-2 bg-gray-50 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="https://github.com/username/repository"
              />
            </div>
            {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
          </div>
        </div>
        <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse gap-3">
          <button
            type="button"
            onClick={handleCloneClick}
            disabled={isLoading}
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-indigo-500 sm:w-auto sm:text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
          >
            {isLoading ? <LoadingSpinner className="animate-spin h-5 w-5" /> : 'Clone'}
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