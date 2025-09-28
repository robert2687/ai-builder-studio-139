import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { OutputPanel } from './components/OutputPanel';
import type { ActiveTab, LoadingState, Theme, CodeSourceInfo, SavedProject, CodeVersion } from './types';
import { generateApp, refineApp } from './services/geminiService';
import { MoonIcon, SunIcon } from './components/icons';
import { ConfirmationDialog } from './components/ConfirmationDialog';
import { GithubCloneDialog } from './components/GithubCloneDialog';
import { SaveDialog } from './components/SaveDialog';
import { LoadDialog } from './components/LoadDialog';
import { VersionHistoryDialog } from './components/VersionHistoryDialog';
import * as storage from './services/storageService';

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
  const [isSaveDialogVisible, setIsSaveDialogVisible] = useState(false);
  const [isLoadDialogVisible, setIsLoadDialogVisible] = useState(false);
  const [savedProjects, setSavedProjects] = useState<Record<string, SavedProject>>({});
  
  // Version History State
  const [versionHistory, setVersionHistory] = useState<CodeVersion[]>([]);
  const [isHistoryDialogVisible, setIsHistoryDialogVisible] = useState(false);
  const [versionToRestore, setVersionToRestore] = useState<CodeVersion | null>(null);
  const [isRestoreConfirmVisible, setIsRestoreConfirmVisible] = useState(false);
  const [diffTarget, setDiffTarget] = useState<{ original: string; modified: string; } | null>(null);

  // Resizable panel state
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [panelWidth, setPanelWidth] = useState(() => {
    const savedWidth = typeof window !== 'undefined' ? localStorage.getItem('ai-builder-panel-width') : null;
    return savedWidth ? Number(savedWidth) : 50;
  });

  // Theme persistence effect
  useEffect(() => {
    const savedTheme = localStorage.getItem('ai-builder-studio-theme') as Theme;
    const userPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (userPrefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
  }, []);
  
  // Load saved projects & history on initial mount
  useEffect(() => {
    setSavedProjects(storage.getProjects());
    setVersionHistory(storage.getHistory());
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

  // Resizable panel effects
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ai-builder-panel-width', String(panelWidth));
    }
  }, [panelWidth]);

  useEffect(() => {
    if (isResizing) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent | React.MouseEvent) => {
    if (!isResizing || !mainContainerRef.current) return;

    const containerRect = mainContainerRef.current.getBoundingClientRect();
    let newWidthPercent = ((e.clientX - containerRect.left) / containerRect.width) * 100;

    const minPercent = 20;
    const maxPercent = 80;

    if (newWidthPercent < minPercent) newWidthPercent = minPercent;
    if (newWidthPercent > maxPercent) newWidthPercent = maxPercent;

    setPanelWidth(newWidthPercent);
  }, [isResizing]);

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
      setVersionHistory(storage.addToHistory(code));
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
      setVersionHistory(storage.addToHistory(code));
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
    setVersionHistory(storage.addToHistory('')); // Clears history by saving an empty string, then we'll clear it. A bit hacky.
    localStorage.removeItem('ai-builder-studio-code');
    localStorage.removeItem('ai-builder-studio-initial-prompt');
    localStorage.removeItem('ai-builder-studio-previous-code');
    localStorage.removeItem('ai-builder-studio-source-info');
    localStorage.removeItem('ai-builder-version-history');
    setVersionHistory([]);
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
    setVersionHistory(storage.addToHistory(processedCode));
  }, []);

  const handleClone = useCallback((fileContent: string, repoUrl: string) => {
    handleFileUpload(fileContent, repoUrl.replace(/https?:\/\//, ''));
    setCodeSourceInfo({ type: 'github', name: repoUrl.replace(/https?:\/\/github.com\//, '') });
    setIsCloneDialogVisible(false);
  }, [handleFileUpload]);

  const requestSave = useCallback(() => {
    setIsSaveDialogVisible(true);
  }, []);

  const handleSave = useCallback(async (projectName: string) => {
    try {
      storage.saveProject(projectName, {
        generatedCode,
        initialPrompt,
        codeSourceInfo,
      });
      setSavedProjects(storage.getProjects()); // Refresh project list
    } catch (e) {
      setError((e as Error).message);
      // Re-throw to keep the dialog open and show the error
      throw e;
    }
  }, [generatedCode, initialPrompt, codeSourceInfo]);

  const requestLoad = useCallback(() => {
    setSavedProjects(storage.getProjects()); // ensure fresh list before opening
    setIsLoadDialogVisible(true);
  }, []);

  const handleLoad = useCallback((projectName: string) => {
    const project = savedProjects[projectName];
    if (project) {
        setGeneratedCode(project.generatedCode);
        setInitialPrompt(project.initialPrompt);
        setCodeSourceInfo({ type: 'saved', name: projectName });
        setPreviousCode(null);
        setRefinementPrompt('');
        setError(null);
        setVersionHistory(storage.addToHistory(project.generatedCode));
    }
  }, [savedProjects]);

  const handleDelete = useCallback((projectName: string) => {
    try {
      storage.deleteProject(projectName);
      setSavedProjects(storage.getProjects()); // Refresh project list
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  // Version History handlers
  const handleHistoryRequest = useCallback(() => {
      setIsHistoryDialogVisible(true);
  }, []);

  const handleRestoreRequest = useCallback((version: CodeVersion) => {
      setVersionToRestore(version);
      setIsRestoreConfirmVisible(true);
  }, []);

  const confirmRestore = useCallback(() => {
      if (versionToRestore) {
          setPreviousCode(generatedCode);
          setGeneratedCode(versionToRestore.code);
          setVersionHistory(storage.addToHistory(versionToRestore.code));
      }
      setVersionToRestore(null);
      setIsRestoreConfirmVisible(false);
      setIsHistoryDialogVisible(false);
  }, [versionToRestore, generatedCode]);

  const cancelRestore = useCallback(() => {
      setVersionToRestore(null);
      setIsRestoreConfirmVisible(false);
  }, []);

  const handleCompareWithHistory = useCallback((version: CodeVersion) => {
      setDiffTarget({ original: version.code, modified: generatedCode });
      setActiveTab('code');
      setIsHistoryDialogVisible(false);
  }, [generatedCode]);
  
  const handleCompareWithPrevious = useCallback(() => {
    if (previousCode) {
        setDiffTarget({ original: previousCode, modified: generatedCode });
    }
  }, [previousCode, generatedCode]);

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

      <main
        className="flex-grow p-4 md:p-6 overflow-hidden"
        onMouseMove={isResizing ? (e) => handleMouseMove(e.nativeEvent) : undefined}
        onMouseUp={isResizing ? handleMouseUp : undefined}
        onMouseLeave={isResizing ? handleMouseUp : undefined}
      >
        <div ref={mainContainerRef} className="w-full h-full flex flex-col md:flex-row items-stretch">
            {/* Control Panel Wrapper */}
            <div
              className="flex-shrink-0 md:h-full mb-4 md:mb-0"
              style={{ flexBasis: `calc(${panelWidth}% - 0.5rem)` }}
            >
              <div className="flex flex-col w-full h-full bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700">
                 <ControlPanel
                    prompt={prompt}
                    setPrompt={setPrompt}
                    onGenerate={handleGenerate}
                    onClear={requestClear}
                    onFileUpload={handleFileUpload}
                    onCloneRequest={() => setIsCloneDialogVisible(true)}
                    onSaveRequest={requestSave}
                    onLoadRequest={requestLoad}
                    onHistoryRequest={handleHistoryRequest}
                    isCodePresent={!!generatedCode}
                    loadingState={loadingState}
                    error={error}
                    onErrorDismiss={handleErrorDismiss}
                    codeSourceInfo={codeSourceInfo}
                    refinementPrompt={refinementPrompt}
                    setRefinementPrompt={setRefinementPrompt}
                    onRefine={handleRefine}
                  />
              </div>
            </div>

            {/* Resizer */}
            <div
              onMouseDown={handleMouseDown}
              className="hidden md:flex w-4 flex-shrink-0 cursor-col-resize group items-center justify-center"
              style={{ touchAction: 'none' }}
            >
              <div className="w-1 h-12 bg-gray-300 dark:bg-gray-600 rounded-full group-hover:bg-indigo-500 transition-colors" />
            </div>
            
            {/* Output Panel Wrapper */}
            <div
              className="flex-1 md:h-full min-h-0"
              style={{ flexBasis: `calc(${100 - panelWidth}% - 0.5rem)` }}
            >
              <div className="flex flex-col w-full h-full bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700">
                <OutputPanel
                  code={generatedCode}
                  onCodeChange={setGeneratedCode}
                  previousCode={previousCode}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  loadingState={loadingState}
                  theme={theme}
                  diffTarget={diffTarget}
                  onCloseDiff={() => setDiffTarget(null)}
                  onCompareRequest={handleCompareWithPrevious}
                />
              </div>
            </div>
        </div>
      </main>
      
      <ConfirmationDialog
        isOpen={isClearConfirmVisible}
        title="Clear Everything?"
        message="Are you sure you want to clear the current application, prompts, and version history? This action cannot be undone."
        onConfirm={confirmClear}
        onCancel={cancelClear}
        confirmText="Yes, Clear All"
      />
      
      <ConfirmationDialog
        isOpen={isRestoreConfirmVisible}
        title="Restore Version?"
        message="Are you sure you want to restore this version? Your current code will be overwritten, but will be available in the version history."
        onConfirm={confirmRestore}
        onCancel={cancelRestore}
        confirmText="Yes, Restore"
      />

      <GithubCloneDialog
        isOpen={isCloneDialogVisible}
        onClose={() => setIsCloneDialogVisible(false)}
        onClone={handleClone}
      />

      <SaveDialog
        isOpen={isSaveDialogVisible}
        onClose={() => setIsSaveDialogVisible(false)}
        onSave={handleSave}
        existingProjects={Object.keys(savedProjects)}
      />

      <LoadDialog
        isOpen={isLoadDialogVisible}
        onClose={() => setIsLoadDialogVisible(false)}
        onLoad={handleLoad}
        onDelete={handleDelete}
        projects={savedProjects}
      />

      <VersionHistoryDialog
        isOpen={isHistoryDialogVisible}
        onClose={() => setIsHistoryDialogVisible(false)}
        onRestore={handleRestoreRequest}
        onCompare={handleCompareWithHistory}
        history={versionHistory}
      />
    </div>
  );
}
