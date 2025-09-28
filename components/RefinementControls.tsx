import React from 'react';
import type { LoadingState } from '../types';
import { LoadingSpinner } from './icons';

interface RefinementControlsProps {
  refinementPrompt: string;
  setRefinementPrompt: (prompt: string) => void;
  onRefine: () => void;
  loadingState: LoadingState;
}

export const RefinementControls: React.FC<RefinementControlsProps> = ({ refinementPrompt, setRefinementPrompt, onRefine, loadingState }) => {
  const isRefining = loadingState === 'refine';
  const isBusy = loadingState !== 'idle';

  return (
    <div className="p-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
      <label htmlFor="refinement-input" className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">2. Refine Your Application</label>
      <div className="flex gap-2 mt-2">
        <input
          id="refinement-input"
          type="text"
          value={refinementPrompt}
          onChange={(e) => setRefinementPrompt(e.target.value)}
          className="w-full p-2 bg-gray-50 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 placeholder-gray-400 dark:placeholder-gray-500"
          placeholder="E.g., 'Change the button color to green.'"
          disabled={isBusy}
        />
        <button
          onClick={onRefine}
          disabled={isBusy}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
        >
          {isRefining ? (
            <>
              <LoadingSpinner className="animate-spin -ml-1 mr-3 h-5 w-5" />
              <span>Refining...</span>
            </>
          ) : (
            'Refine'
          )}
        </button>
      </div>
    </div>
  );
};