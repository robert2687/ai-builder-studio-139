import React from 'react';
import { ErrorIcon, CloseIcon } from './icons';

interface ErrorDisplayProps {
  message: string;
  onDismiss: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message, onDismiss }) => {
  if (!message) return null;

  return (
    <div className="bg-red-100 dark:bg-red-900/40 border-l-4 border-red-500 dark:border-red-400 text-red-800 dark:text-red-200 p-4 rounded-md shadow-md flex items-center justify-between" role="alert">
      <div className="flex items-center">
        <ErrorIcon />
        <p className="ml-3 text-sm font-medium break-words">{message}</p>
      </div>
      <button
        onClick={onDismiss}
        className="ml-4 -mr-1 -my-1 p-1.5 rounded-full text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
        aria-label="Dismiss"
      >
        <CloseIcon />
      </button>
    </div>
  );
};
