import React from 'react';
import { HistoryIcon, CompareIcon } from './icons';
import type { CodeVersion } from '../types';

interface VersionHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore: (version: CodeVersion) => void;
  onCompare: (version: CodeVersion) => void;
  history: CodeVersion[];
}

const timeAgo = (timestamp: number): string => {
  const now = Date.now();
  const seconds = Math.floor((now - timestamp) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return "a few seconds ago";
};


export const VersionHistoryDialog: React.FC<VersionHistoryDialogProps> = ({ isOpen, onClose, onRestore, onCompare, history }) => {

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl m-4 ring-1 ring-gray-200 dark:ring-gray-700 flex flex-col max-h-[80vh] relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="sm:flex sm:items-center">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 sm:mx-0 sm:h-10 sm:w-10">
              <HistoryIcon />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 className="text-lg leading-6 font-bold text-gray-900 dark:text-gray-100">
                Version History
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Restore or compare previous versions of your application.</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto flex-grow">
          {history.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">No version history found.</p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {history.map((version, index) => (
                <li key={version.timestamp} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center min-w-0">
                    <span className="font-medium text-gray-800 dark:text-gray-200 truncate">
                      {index === 0 ? "Current Version" : `Version from ${timeAgo(version.timestamp)}`}
                    </span>
                    <span className="ml-3 text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                        {new Date(version.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <button 
                        onClick={() => onCompare(version)}
                        disabled={index === 0}
                        className="flex items-center gap-1.5 px-3 py-1 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/50 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <CompareIcon />
                        Compare
                    </button>
                    <button 
                        onClick={() => onRestore(version)}
                        disabled={index === 0}
                        className="px-3 py-1 text-sm font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/50 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        Restore
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
