
import React from 'react';
import { GenerateIcon, LoadingSpinner, ClearIcon } from './icons';

interface ControlPanelProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  onGenerate: () => void;
  onClear: () => void;
  isLoading: boolean;
  error: string | null;
}

const examplePrompts = [
  'Calculator',
  'Weather App',
  'Joke Generator',
  'To-Do List',
  'Pomodoro Timer',
];

export const ControlPanel: React.FC<ControlPanelProps> = ({ prompt, setPrompt, onGenerate, onClear, isLoading, error }) => {
  const handleExampleClick = (text: string) => {
    setPrompt(`Create a single-page application for a '${text}'. The application should be visually appealing, modern, and fully functional. Use a dark theme with purple and indigo accents.`);
  };

  return (
    <>
      <div className="p-6 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-indigo-300">1. Describe Your Application</h2>
        <p className="text-sm text-gray-400 mt-1">Start with the main concept. You can refine it or edit the code directly.</p>
      </div>

      <div className="flex-grow p-6 flex flex-col">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full flex-grow p-4 bg-gray-900/50 rounded-lg border border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 resize-none placeholder-gray-500"
          placeholder="E.g., 'Create a simple to-do list application with a dark, minimalist design.'"
          disabled={isLoading}
        />
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Examples:</h3>
          <div className="flex flex-wrap gap-2">
            {examplePrompts.map(text => (
              <button
                key={text}
                onClick={() => handleExampleClick(text)}
                className="text-xs bg-gray-700 hover:bg-indigo-600 px-3 py-1 rounded-full transition-colors disabled:opacity-50"
                disabled={isLoading}
              >
                {text}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-gray-700 space-y-3">
        <button
          onClick={onClear}
          disabled={isLoading}
          className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ClearIcon />
          Clear All
        </button>
        <button
          onClick={onGenerate}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
        >
          {isLoading ? (
            <>
              <LoadingSpinner />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <GenerateIcon />
              <span>Generate Application</span>
            </>
          )}
        </button>
        {error && (
          <div className="text-red-400 text-sm pt-2 text-center break-words">
            {error}
          </div>
        )}
      </div>
    </>
  );
};
