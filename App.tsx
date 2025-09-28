import React, { useState, useCallback, useEffect } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { OutputPanel } from './components/OutputPanel';
import { RefinementControls } from './components/RefinementControls';
import type { ActiveTab, LoadingState, Theme } from './types';
import { generateApp, refineApp } from './services/geminiService';
import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { MoonIcon, SunIcon } from './components/icons';

export default function App() {
  const [prompt, setPrompt] = useState<string>('');
  const [refinementPrompt, setRefinementPrompt] = useState<string>('');
  const [initialPrompt, setInitialPrompt] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('preview');
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [editorInstance, setEditorInstance] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [theme, setTheme] = useState<Theme>('dark');

  // Theme persistence effect
  useEffect(() => {
    const savedTheme = localStorage.getItem('ai-builder-studio-theme') as Theme;
    const userPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (userPrefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('ai-builder-studio-theme', theme);
  }, [theme]);
  
  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    const savedCode = localStorage.getItem('ai-builder-studio-code');
    const savedInitialPrompt = localStorage.getItem('ai-builder-studio-initial-prompt');
    if (savedCode) {
      setGeneratedCode(savedCode);
    }
    if (savedInitialPrompt) {
      setInitialPrompt(savedInitialPrompt);
      setPrompt(savedInitialPrompt);
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please enter a description for your application.');
      return;
    }

    setLoadingState('generate');
    setError(null);
    setGeneratedCode('');
    setInitialPrompt(prompt);
    localStorage.setItem('ai-builder-studio-initial-prompt', prompt);

    try {
      const code = await generateApp(prompt);
      setGeneratedCode(code);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Generation failed: ${errorMessage}`);
      setInitialPrompt(null);
      localStorage.removeItem('ai-builder-studio-initial-prompt');
    } finally {
      setLoadingState('idle');
    }
  }, [prompt]);

  const handleRefine = useCallback(async () => {
    if (!refinementPrompt.trim()) {
      setError('Please enter a refinement request.');
      return;
    }
    if (!editorInstance) {
      setError('Editor is not ready.');
      return;
    }

    setLoadingState('refine');
    setError(null);

    const currentCode = editorInstance.getValue();

    try {
      const code = await refineApp(initialPrompt || '', currentCode, refinementPrompt);
      setGeneratedCode(code);
      setRefinementPrompt('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Refinement failed: ${errorMessage}`);
    } finally {
      setLoadingState('idle');
    }
  }, [refinementPrompt, editorInstance, initialPrompt]);

  const handleClear = useCallback(() => {
    setPrompt('');
    setRefinementPrompt('');
    setGeneratedCode('');
    setInitialPrompt(null);
    setError(null);
    setActiveTab('preview');
    localStorage.removeItem('ai-builder-studio-code');
    localStorage.removeItem('ai-builder-studio-initial-prompt');
  }, []);

  return (
    <div className="flex flex-col h-screen text-gray-800 dark:text-gray-200 antialiased transition-colors duration-300">
      <header className="bg-gray-100/80 dark:bg-gray-800/50 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 p-4 shadow-lg z-10 shrink-0 flex items-center justify-between">
        <div className="flex-1"></div>
        <div className="text-center flex-1">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-purple-500">
            AI Builder Studio
          </h1>
          <p className="text-center text-gray-600 dark:text-gray-400 text-sm mt-1">Generate and edit applications in a professional IDE, powered by AI.</p>
        </div>
        <div className="flex-1 flex justify-end">
          <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" aria-label="Toggle theme">
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </header>

      <main className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 overflow-hidden">
        <div className="flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700">
          <ControlPanel
            prompt={prompt}
            setPrompt={setPrompt}
            onGenerate={handleGenerate}
            onClear={handleClear}
            loadingState={loadingState}
            error={error}
          />
        </div>
        
        <div className="flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700">
          <OutputPanel
            code={generatedCode}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            editorInstance={editorInstance}
            setEditorInstance={setEditorInstance}
            isLoading={loadingState === 'generate'}
            theme={theme}
          />
          {generatedCode && (
            <RefinementControls
              refinementPrompt={refinementPrompt}
              setRefinementPrompt={setRefinementPrompt}
              onRefine={handleRefine}
              loadingState={loadingState}
            />
          )}
        </div>
      </main>
    </div>
  );
}