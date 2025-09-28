import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { OutputPanel } from './components/OutputPanel';
import { RefinementControls } from './components/RefinementControls';
import type { ActiveTab, LoadingState, Theme, CodeSourceInfo } from './types';
import { generateApp, refineApp } from './services/geminiService';
import { MoonIcon, SunIcon } from './components/icons';
import { ConfirmationDialog } from './components/ConfirmationDialog';
import { GithubCloneDialog } from './components/GithubCloneDialog';

export default function App() {
  const [prompt, setPrompt] = useState<string>('');
  const [refinementPrompt, setRefinementPrompt] = useState<string>('');
  const [initialPrompt, setInitialPrompt] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [previousCode, setPreviousCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('preview');
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>('dark');
  const [isClearConfirmVisible, setIsClearConfirmVisible] = useState(false);
  const [isCloneDialogVisible, setIsCloneDialogVisible] = useState(false);
  const [codeSourceInfo, setCodeSourceInfo] = useState<CodeSourceInfo | null>(null);


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

  // State persistence effect
  useEffect(() => {
    const savedCode = localStorage.getItem('ai-builder-studio-code');
    const savedInitialPrompt = localStorage.getItem('ai-builder-studio-initial-prompt');
    const savedPreviousCode = localStorage.getItem('ai-builder-studio-previous-code');
    const savedSourceInfo = localStorage.getItem('ai-builder-studio-source-info');

    if (savedCode) {
      setGeneratedCode(savedCode);
    }
    if (savedInitialPrompt) {
      setInitialPrompt(savedInitialPrompt);
      // Only set the prompt if there's no code, allowing the source info to be the primary display
      if (!savedCode) {
        setPrompt(savedInitialPrompt);
      }
    }
    if (savedPreviousCode) {
      setPreviousCode(savedPreviousCode);
    }
    if (savedSourceInfo) {
      try {
        setCodeSourceInfo(JSON.parse(savedSourceInfo));
      } catch(e) {
        console.error("Failed to parse source info from localStorage", e);
        localStorage.removeItem('ai-builder-studio-source-info');
      }
    }
  }, []);
  
  // Debounced save to localStorage
  useEffect(() => {
    const handler = setTimeout(() => {
      if (generatedCode) {
        localStorage.setItem('ai-builder-studio-code', generatedCode);
      } else {
        localStorage.removeItem('ai-builder-studio-code');
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [generatedCode]);
  
  useEffect(() => {
    if (previousCode) {
      localStorage.setItem('ai-builder-studio-previous-code', previousCode);
    } else {
      localStorage.removeItem('ai-builder-studio-previous-code');
    }
  }, [previousCode]);

  useEffect(() => {
    if (codeSourceInfo) {
        localStorage.setItem('ai-builder-studio-source-info', JSON.stringify(codeSourceInfo));
    } else {
        localStorage.removeItem('ai-builder-studio-source-info');
    }
  }, [codeSourceInfo]);


  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please enter a description for your application.');
      return;
    }

    setPreviousCode(generatedCode);
    setLoadingState('generate');
    setError(null);
    setInitialPrompt(prompt);
    localStorage.setItem('ai-builder-studio-initial-prompt', prompt);

    try {
      const code = await generateApp(prompt);
      setGeneratedCode(code);
      setCodeSourceInfo({ type: 'prompt', name: prompt });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Generation failed: ${errorMessage}`);
      setInitialPrompt(null);
      setPreviousCode(null);
      localStorage.removeItem('ai-builder-studio-initial-prompt');
    } finally {
      setLoadingState('idle');
    }
  }, [prompt, generatedCode]);

  const handleRefine = useCallback(async () => {
    if (!refinementPrompt.trim()) {
      setError('Please enter a refinement request.');
      return;
    }
    
    setPreviousCode(generatedCode);
    setLoadingState('refine');
    setError(null);

    try {
      const code = await refineApp(initialPrompt || '', generatedCode, refinementPrompt);
      setGeneratedCode(code);
      setRefinementPrompt('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Refinement failed: ${errorMessage}`);
      setPreviousCode(null);
    } finally {
      setLoadingState('idle');
    }
  }, [refinementPrompt, generatedCode, initialPrompt]);

  const confirmClear = useCallback(() => {
    setPrompt('');
    setRefinementPrompt('');
    setGeneratedCode('');
    setPreviousCode(null);
    setInitialPrompt(null);
    setError(null);
    setActiveTab('preview');
    setCodeSourceInfo(null);
    localStorage.removeItem('ai-builder-studio-code');
    localStorage.removeItem('ai-builder-studio-initial-prompt');
    localStorage.removeItem('ai-builder-studio-previous-code');
    localStorage.removeItem('ai-builder-studio-source-info');
    setIsClearConfirmVisible(false);
  }, []);

  const requestClear = useCallback(() => {
    setIsClearConfirmVisible(true);
  }, []);
  
  const cancelClear = useCallback(() => {
    setIsClearConfirmVisible(false);
  }, []);
  
  const handleErrorDismiss = useCallback(() => {
    setError(null);
  }, []);

  const handleFileUpload = useCallback((fileContent: string, fileName: string) => {
    const processUploadedHtml = (html: string): string => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      let head = doc.head;
      if (!head) {
        head = doc.createElement('head');
        doc.documentElement.prepend(head);
      }
      
      if (!head.querySelector('script[src="https://cdn.tailwindcss.com"]')) {
        const tailwindScript = doc.createElement('script');
        tailwindScript.src = 'https://cdn.tailwindcss.com';
        head.appendChild(tailwindScript);
      }

      if (!head.querySelector('link[href*="family=Inter"]')) {
        const fontLink = doc.createElement('link');
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
        fontLink.rel = 'stylesheet';
        head.appendChild(fontLink);
      }
      
      const style = doc.createElement('style');
      style.textContent = `body { font-family: 'Inter', sans-serif; }`;
      head.appendChild(style);

      const doctype = doc.doctype ? `<!DOCTYPE ${doc.doctype.name}>` : '<!DOCTYPE html>';
      return `${doctype}\n${doc.documentElement.outerHTML}`;
    };

    setPrompt('');
    setRefinementPrompt('');
    setError(null);
    setActiveTab('preview');
    setPreviousCode(null);
    
    const processedCode = processUploadedHtml(fileContent);
    setGeneratedCode(processedCode);
    
    const newInitialPrompt = "The following code was imported by the user.";
    setInitialPrompt(newInitialPrompt);
    setCodeSourceInfo({ type: 'file', name: fileName });
    
    localStorage.setItem('ai-builder-studio-initial-prompt', newInitialPrompt);
  }, []);

  const handleClone = useCallback((fileContent: string, repoUrl: string) => {
    handleFileUpload(fileContent, repoUrl.replace(/https?:\/\//, ''));
    // Overwrite the source info to be of type 'github'
    setCodeSourceInfo({ type: 'github', name: repoUrl.replace(/https?:\/\/github.com\//, '') });
    setIsCloneDialogVisible(false);
  }, [handleFileUpload]);

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
            onClear={requestClear}
            onFileUpload={handleFileUpload}
            onCloneRequest={() => setIsCloneDialogVisible(true)}
            loadingState={loadingState}
            error={error}
            onErrorDismiss={handleErrorDismiss}
            codeSourceInfo={codeSourceInfo}
          />
        </div>
        
        <div className="flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700">
          <OutputPanel
            code={generatedCode}
            onCodeChange={setGeneratedCode}
            previousCode={previousCode}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            loadingState={loadingState}
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
      
      <ConfirmationDialog
        isOpen={isClearConfirmVisible}
        title="Clear Everything?"
        message="Are you sure you want to clear the current application and prompt? This action cannot be undone."
        onConfirm={confirmClear}
        onCancel={cancelClear}
        confirmText="Yes, Clear All"
      />

      <GithubCloneDialog
        isOpen={isCloneDialogVisible}
        onClose={() => setIsCloneDialogVisible(false)}
        onClone={handleClone}
      />
    </div>
  );
}