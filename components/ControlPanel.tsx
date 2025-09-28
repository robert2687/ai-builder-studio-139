import React, { useRef } from 'react';
import type { LoadingState, CodeSourceInfo } from '../types';
import { GenerateIcon, LoadingSpinner, ClearIcon, UploadIcon, GithubIcon, FileTextIcon, EditIcon, SaveIcon, LoadIcon } from './icons';
import { ErrorDisplay } from './ErrorDisplay';

interface ControlPanelProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  onGenerate: () => void;
  onClear: () => void;
  onFileUpload: (fileContent: string, fileName: string) => void;
  onCloneRequest: () => void;
  onSaveRequest: () => void;
  onLoadRequest: () => void;
  isCodePresent: boolean;
  loadingState: LoadingState;
  error: string | null;
  onErrorDismiss: () => void;
  codeSourceInfo: CodeSourceInfo | null;
  refinementPrompt: string;
  setRefinementPrompt: (prompt: string) => void;
  onRefine: () => void;
}

const examplePrompts = [
  'Calculator',
  'Weather App',
  'Joke Generator',
  'To-Do List',
  'Pomodoro Timer',
];

const PromptInput: React.FC<Pick<ControlPanelProps, 'prompt' | 'setPrompt' | 'loadingState'>> = ({ prompt, setPrompt, loadingState }) => {
    const isBusy = loadingState !== 'idle';
    const handleExampleClick = (text: string) => {
        setPrompt(`Create a single-page application for a '${text}'. The application should be visually appealing, modern, and fully functional. Use a dark theme with purple and indigo accents.`);
    };
    return (
        <>
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full flex-grow p-4 bg-gray-50 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 resize-none placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="E.g., 'Create a simple to-do list application with a dark, minimalist design.'"
                disabled={isBusy}
            />
            <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Examples:</h3>
                <div className="flex flex-wrap gap-2">
                    {examplePrompts.map(text => (
                        <button
                            key={text}
                            onClick={() => handleExampleClick(text)}
                            className="text-xs bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-indigo-600 px-3 py-1 rounded-full transition-colors disabled:opacity-50"
                            disabled={isBusy}
                        >
                            {text}
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
};

const SourceDisplay: React.FC<{ source: CodeSourceInfo }> = ({ source }) => {
    let icon, title, name;
    switch (source.type) {
        case 'file':
            icon = <FileTextIcon />;
            title = 'File Source';
            name = source.name;
            break;
        case 'github':
            icon = <GithubIcon className="w-5 h-5" />;
            title = 'GitHub Repository';
            name = source.name;
            break;
        case 'prompt':
            icon = <EditIcon />;
            title = 'Generated from Prompt';
            name = `"${source.name}"`;
            break;
        case 'saved':
            icon = <SaveIcon />;
            title = 'Saved Project';
            name = source.name;
            break;
    }

    return (
        <div className="bg-gray-100 dark:bg-gray-900/50 rounded-lg p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">{title}</div>
            <div className="flex items-start gap-3">
                <div className="text-indigo-600 dark:text-indigo-400 mt-1">{icon}</div>
                <p className={`flex-1 font-medium text-gray-800 dark:text-gray-200 ${source.type === 'prompt' ? 'italic' : ''}`}>
                    {name}
                </p>
            </div>
        </div>
    );
};


export const ControlPanel: React.FC<ControlPanelProps> = ({ 
    prompt, setPrompt, onGenerate, onClear, onFileUpload, onCloneRequest, 
    onSaveRequest, onLoadRequest, isCodePresent, loadingState, error, onErrorDismiss, 
    codeSourceInfo, refinementPrompt, setRefinementPrompt, onRefine
}) => {
  const isGenerating = loadingState === 'generate';
  const isRefining = loadingState === 'refine';
  const isBusy = loadingState !== 'idle';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isProjectLoaded = !!codeSourceInfo;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        onFileUpload(content, file.name);
      };
      reader.readAsText(file);
    }
    if (event.target) {
      event.target.value = '';
    }
  };

  const PrimaryActionButton = () => {
    if (isProjectLoaded) {
      return (
        <button
          onClick={onRefine}
          disabled={isBusy}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-lg flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-300 transform hover:scale-105 shadow-lg"
        >
          {isRefining ? (
            <>
              <LoadingSpinner className="animate-spin -ml-1 mr-3 h-5 w-5" />
              <span>Refining...</span>
            </>
          ) : (
            'Refine Application'
          )}
        </button>
      );
    }
    return (
      <button
        onClick={onGenerate}
        disabled={isBusy}
        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
      >
        {isGenerating ? (
          <>
            <LoadingSpinner className="animate-spin -ml-1 mr-3 h-5 w-5" />
            <span>Generating...</span>
          </>
        ) : (
          <>
            <GenerateIcon />
            <span>Generate Application</span>
          </>
        )}
      </button>
    );
  };

  return (
    <>
      {/* Section 1: Source or Prompt */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-300">
          {isProjectLoaded ? '1. Application Source' : '1. Describe Your Application'}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {isProjectLoaded 
            ? 'The current application was loaded from the source below.'
            : 'Start with the main concept. You can refine it or edit the code directly.'
          }
        </p>
      </div>
      <div className={`p-6 ${isProjectLoaded ? '' : 'flex-grow flex flex-col'}`}>
        {isProjectLoaded ? (
          <SourceDisplay source={codeSourceInfo} />
        ) : (
          <PromptInput prompt={prompt} setPrompt={setPrompt} loadingState={loadingState} />
        )}
      </div>

      {/* Section 2: Task Input (only in refine mode) */}
      {isProjectLoaded && (
        <>
          <div className="p-6 border-y border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-300">2. Describe Your Task</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Tell the AI what changes you'd like to make to the application.</p>
          </div>
          <div className="flex-grow p-6 flex flex-col">
             <textarea
              value={refinementPrompt}
              onChange={(e) => setRefinementPrompt(e.target.value)}
              className="w-full flex-grow p-4 bg-gray-50 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 resize-none placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="E.g., 'Change the button color to green.'"
              disabled={isBusy}
            />
          </div>
        </>
      )}

      {/* Footer Actions */}
      <div className="p-6 border-t border-gray-200 dark:border-gray-700 space-y-3">
        {error && (
            <div className="pb-2">
                <ErrorDisplay message={error} onDismiss={onErrorDismiss} />
            </div>
        )}
        <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isBusy}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UploadIcon />
              Upload
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".html,.htm"
              className="hidden"
            />
            <button
              onClick={onCloneRequest}
              disabled={isBusy}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <GithubIcon className="w-5 h-5 mr-2" />
              Clone
            </button>
            <button
              onClick={onSaveRequest}
              disabled={isBusy || !isCodePresent}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SaveIcon />
              Save
            </button>
            <button
              onClick={onLoadRequest}
              disabled={isBusy}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LoadIcon />
              Load
            </button>
        </div>
         <button
            onClick={onClear}
            disabled={isBusy}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ClearIcon />
            Clear All
          </button>
        <PrimaryActionButton />
      </div>
    </>
  );
};
