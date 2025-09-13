
import React from 'react';

interface RefinementControlsProps {
  refinementPrompt: string;
  setRefinementPrompt: (prompt: string) => void;
  onRefine: () => void;
  isLoading: boolean;
}

export const RefinementControls: React.FC<RefinementControlsProps> = ({ refinementPrompt, setRefinementPrompt, onRefine, isLoading }) => {
  return (
    <div className="p-4 border-t border-gray-700 shrink-0">
      <label htmlFor="refinement-input" className="text-sm font-semibold text-indigo-300">2. Refine Your Application</label>
      <div className="flex gap-2 mt-2">
        <input
          id="refinement-input"
          type="text"
          value={refinementPrompt}
          onChange={(e) => setRefinementPrompt(e.target.value)}
          className="w-full p-2 bg-gray-900/50 rounded-lg border border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 placeholder-gray-500"
          placeholder="E.g., 'Change the button color to green.'"
          disabled={isLoading}
        />
        <button
          onClick={onRefine}
          disabled={isLoading}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Refining...' : 'Refine'}
        </button>
      </div>
    </div>
  );
};
