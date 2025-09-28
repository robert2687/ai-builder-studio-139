
import React, { useState, useCallback, useEffect } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { OutputPanel } from './components/OutputPanel';
import { RefinementControls } from './components/RefinementControls';
import type { ActiveTab } from './types';
import { generateApp, refineApp } from './services/geminiService';
import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

type LoadingState = 'idle' | 'generate' | 'refine';

export default function App() {
  const [prompt, setPrompt] = useState<string>('');
  const [refinementPrompt, setRefinementPrompt] = useState<string>('');
  const [initialPrompt, setInitialPrompt] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('preview');
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [editorInstance, setEditorInstance] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);

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
    <div className="flex flex-col h-screen text-gray-200 antialiased">
      <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 p-4 shadow-lg z-10 shrink-0">
        <h1 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">
          AI Builder Studio
        </h1>
        <p className="text-center text-gray-400 text-sm mt-1">Generate and edit applications in a professional IDE, powered by AI.</p>
      </header>

      <main className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 overflow-hidden">
        <div className="flex flex-col bg-gray-800 rounded-xl shadow-2xl overflow-hidden ring-1 ring-gray-700">
          <ControlPanel
            prompt={prompt}
            setPrompt={setPrompt}
            onGenerate={handleGenerate}
            onClear={handleClear}
            isLoading={loadingState === 'generate'}
            error={error}
          />
        </div>
        
        <div className="flex flex-col bg-gray-800 rounded-xl shadow-2xl overflow-hidden ring-1 ring-gray-700">
          <OutputPanel
            code={generatedCode}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            editorInstance={editorInstance}
            setEditorInstance={setEditorInstance}
            isLoading={loadingState === 'generate'}
          />
          {generatedCode && (
            <RefinementControls
              refinementPrompt={refinementPrompt}
              setRefinementPrompt={setRefinementPrompt}
              onRefine={handleRefine}
              isLoading={loadingState === 'refine'}
            />
          )}
        </div>
      </main>
    </div>
  );
}
