import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { ActiveTab, Theme, LoadingState } from '../types';
import { CopyIcon, DownloadIcon, CheckIcon, WelcomeIcon, UndoIcon, RedoIcon, CompareIcon } from './icons';
import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

interface OutputPanelProps {
  code: string;
  onCodeChange: (newCode: string) => void;
  previousCode: string | null;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  loadingState: LoadingState;
  theme: Theme;
}

const SkeletonLoader: React.FC = () => (
  <div className="w-full h-full p-4 animate-pulse">
    <div className="bg-gray-200 dark:bg-gray-700 h-8 w-3/4 rounded-md mb-4"></div>
    <div className="bg-gray-200 dark:bg-gray-700 h-4 w-1/2 rounded-md mb-6"></div>
    <div className="bg-gray-200 dark:bg-gray-700 h-12 w-full rounded-md mb-4"></div>
    <div className="bg-gray-200 dark:bg-gray-700 h-12 w-full rounded-md"></div>
  </div>
);

const WelcomeMessage: React.FC = () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
        <WelcomeIcon />
        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-400">Your App Preview Will Appear Here</h3>
        <p className="text-gray-500 dark:text-gray-500 mt-1">Enter a description and click 'Generate Application' to start.</p>
    </div>
);

export const OutputPanel: React.FC<OutputPanelProps> = ({ code, onCodeChange, previousCode, activeTab, setActiveTab, loadingState, theme }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [isDiffVisible, setIsDiffVisible] = useState(false);

  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const diffEditorContainerRef = useRef<HTMLDivElement | null>(null);
  const editorInstanceRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const diffEditorInstanceRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);
  const monacoRef = useRef<any | null>(null);
  const saveStatusTimer = useRef<number | null>(null);

  // Update iframe URL when live code changes
  useEffect(() => {
    if (!code) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      return;
    }
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [code]);

  const getEditorOptions = (): monaco.editor.IStandaloneEditorConstructionOptions => ({
      automaticLayout: true,
      minimap: { enabled: false },
      wordWrap: 'on',
      fontFamily: "'Inter', sans-serif",
      fontSize: 14,
      lineHeight: 24,
      padding: { top: 16, bottom: 16 },
      scrollbar: { useShadows: false, verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
      overviewRulerLanes: 0,
      scrollBeyondLastLine: false,
      lineNumbersMinChars: 3,
      renderLineHighlight: 'line',
  });
  
  const updateUndoRedoState = useCallback(() => {
    const activeEditor = isDiffVisible
      ? diffEditorInstanceRef.current?.getModifiedEditor()
      : editorInstanceRef.current;
    
    const model = activeEditor?.getModel();
    if (model) {
        setCanUndo(model.canUndo());
        setCanRedo(model.canRedo());
    } else {
        setCanUndo(false);
        setCanRedo(false);
    }
  }, [isDiffVisible]);


  // Monaco editor initialization (runs once)
  useEffect(() => {
    if (!editorContainerRef.current) return;

    let editor: monaco.editor.IStandaloneCodeEditor;

    (window as any).require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.49.0/min/vs' }});
    (window as any).require(['vs/editor/editor.main'], (monaco: any) => {
        monacoRef.current = monaco;

        monaco.editor.defineTheme('ai-builder-dark', {
            base: 'vs-dark', inherit: true, rules: [],
            colors: {
                'editor.background': '#1F2937',
                'editorGutter.background': '#1F2937',
                'editor.lineHighlightBackground': '#374151',
            }
        });
        monaco.editor.defineTheme('ai-builder-light', {
            base: 'vs', inherit: true, rules: [],
            colors: {
                'editor.background': '#F9FAFB',
                'editorGutter.background': '#F9FAFB',
                'editor.lineHighlightBackground': '#f3f4f6',
            }
        });
        
        editor = monaco.editor.create(editorContainerRef.current, {
            ...getEditorOptions(),
            value: code,
            language: 'html',
            theme: theme === 'dark' ? 'ai-builder-dark' : 'ai-builder-light',
        });
        editorInstanceRef.current = editor;

        editor.onDidChangeModelContent(() => {
            onCodeChange(editor.getValue());
            updateUndoRedoState();

            if (saveStatusTimer.current) window.clearTimeout(saveStatusTimer.current);
            setSaveStatus('saved');
            saveStatusTimer.current = window.setTimeout(() => setSaveStatus('idle'), 2000);
        });

        editor.onDidBlurEditorText(() => editor.getAction('editor.action.formatDocument')?.run());

        updateUndoRedoState();
    });

    return () => {
        editorInstanceRef.current?.dispose();
    };
  }, []); // Intentionally empty to run only once

  // Diff editor lifecycle
  useEffect(() => {
    if (isDiffVisible && diffEditorContainerRef.current && monacoRef.current && !diffEditorInstanceRef.current) {
        const monaco = monacoRef.current;
        
        const originalModel = monaco.editor.createModel(previousCode || '', 'html');
        const modifiedModel = monaco.editor.createModel(code, 'html');

        const diffEditor = monaco.editor.createDiffEditor(diffEditorContainerRef.current, {
            ...getEditorOptions(),
            theme: theme === 'dark' ? 'ai-builder-dark' : 'ai-builder-light',
            readOnly: false,
        });
        diffEditor.setModel({ original: originalModel, modified: modifiedModel });
        diffEditorInstanceRef.current = diffEditor;

        const modifiedEditor = diffEditor.getModifiedEditor();

        modifiedEditor.onDidChangeModelContent(() => {
            onCodeChange(modifiedEditor.getValue());
            updateUndoRedoState();
        });

        modifiedEditor.onDidBlurEditorText(() => modifiedEditor.getAction('editor.action.formatDocument')?.run());

        updateUndoRedoState();

    } else if (!isDiffVisible && diffEditorInstanceRef.current) {
        diffEditorInstanceRef.current.dispose();
        diffEditorInstanceRef.current = null;
    }
  }, [isDiffVisible, previousCode, code, theme, onCodeChange, updateUndoRedoState]);
  
  // Sync code prop with editor values and auto-format on generation
  useEffect(() => {
    // Only update if the content differs, to avoid resetting cursor/view state
    if (editorInstanceRef.current && editorInstanceRef.current.getValue() !== code) {
      editorInstanceRef.current.setValue(code);
      setTimeout(() => editorInstanceRef.current?.getAction('editor.action.formatDocument')?.run(), 0);
    }
    const modifiedEditor = diffEditorInstanceRef.current?.getModifiedEditor();
    if (modifiedEditor && modifiedEditor.getValue() !== code) {
      modifiedEditor.setValue(code);
      setTimeout(() => modifiedEditor.getAction('editor.action.formatDocument')?.run(), 0);
    }
  }, [code]);

  // Update Monaco theme when app theme changes
  useEffect(() => {
      if (monacoRef.current) {
          const newTheme = theme === 'dark' ? 'ai-builder-dark' : 'ai-builder-light';
          monacoRef.current.editor.setTheme(newTheme);
      }
  }, [theme]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    });
  }, [code]);
  
  const handleDownload = useCallback(() => {
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai-generated-app.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [code]);

  const handleUndo = useCallback(() => {
    const activeEditor = isDiffVisible 
      ? diffEditorInstanceRef.current?.getModifiedEditor() 
      : editorInstanceRef.current;
    activeEditor?.trigger('toolbar', 'undo', null);
    activeEditor?.focus();
  }, [isDiffVisible]);

  const handleRedo = useCallback(() => {
    const activeEditor = isDiffVisible
      ? diffEditorInstanceRef.current?.getModifiedEditor()
      : editorInstanceRef.current;
    activeEditor?.trigger('toolbar', 'redo', null);
    activeEditor?.focus();
  }, [isDiffVisible]);

  const isGenerating = loadingState === 'generate';
  const isOutputVisible = !isGenerating && code;

  return (
    <>
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pr-4 shrink-0">
        <div className="flex">
          <button onClick={() => setActiveTab('preview')} className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors duration-200 ${activeTab === 'preview' ? 'border-indigo-500 text-indigo-600 dark:text-white' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>Preview</button>
          <button onClick={() => setActiveTab('code')} className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors duration-200 ${activeTab === 'code' ? 'border-indigo-500 text-indigo-600 dark:text-white' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>Code Editor</button>
        </div>
        {isOutputVisible && (
          <div className="flex items-center gap-3">
            {activeTab === 'code' && (
              <>
                {saveStatus === 'saved' && !isDiffVisible && (
                  <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                    <CheckIcon />
                    <span>Saved</span>
                  </div>
                )}
                <button onClick={handleUndo} title="Undo (Ctrl+Z)" disabled={!canUndo} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  <UndoIcon />
                </button>
                <button onClick={handleRedo} title="Redo (Ctrl+Y)" disabled={!canRedo} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  <RedoIcon />
                </button>
                <div className="w-px h-5 bg-gray-300 dark:bg-gray-600" />
              </>
            )}
            {previousCode && activeTab === 'code' && (
                <button 
                  onClick={() => setIsDiffVisible(!isDiffVisible)} 
                  title={isDiffVisible ? 'Close Comparison' : 'Compare Changes'}
                  className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <CompareIcon />
                  {isDiffVisible ? 'Close Comparison' : 'Compare Changes'}
                </button>
            )}
            <button onClick={handleCopy} title="Copy Code" className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              {isCopied ? <CheckIcon /> : <CopyIcon />}
            </button>
            <button onClick={handleDownload} title="Download HTML" className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              <DownloadIcon />
            </button>
          </div>
        )}
      </div>

      <div className="flex-grow bg-gray-50 dark:bg-gray-800 relative overflow-hidden">
        {!isOutputVisible && (isGenerating ? <SkeletonLoader /> : <WelcomeMessage />)}
        
        {isOutputVisible && (
          <>
            <iframe
              src={previewUrl || 'about:blank'}
              className={`w-full h-full border-0 ${activeTab !== 'preview' ? 'hidden' : ''}`}
              title="Application Preview"
              sandbox="allow-scripts allow-forms allow-same-origin"
            ></iframe>
            <div className={`w-full h-full ${activeTab !== 'code' ? 'hidden' : ''}`}>
              <div ref={editorContainerRef} className={`w-full h-full ${isDiffVisible ? 'hidden' : ''}`}></div>
              <div ref={diffEditorContainerRef} className={`w-full h-full ${!isDiffVisible ? 'hidden' : ''}`}></div>
            </div>
          </>
        )}
      </div>
    </>
  );
};