import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { ActiveTab, Theme, LoadingState } from '../types';
import { CopyIcon, DownloadIcon, CheckIcon, WelcomeIcon, UndoIcon, RedoIcon, CompareIcon, FullScreenIcon, ExitFullScreenIcon, ExternalLinkIcon, ChevronUpIcon, ChevronDownIcon, ReloadIcon } from './icons';
import { getCodeCompletion } from '../services/geminiService';
import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

interface OutputPanelProps {
  code: string;
  onCodeChange: (newCode: string) => void;
  previousCode: string | null;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  loadingState: LoadingState;
  theme: Theme;
  diffTarget: { original: string; modified: string } | null;
  onCloseDiff: () => void;
  onCompareRequest: () => void;
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

export const OutputPanel: React.FC<OutputPanelProps> = ({ 
  code, onCodeChange, previousCode, activeTab, setActiveTab, loadingState, theme,
  diffTarget, onCloseDiff, onCompareRequest 
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [debouncedCode, setDebouncedCode] = useState(code);
  const [isCopied, setIsCopied] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(true);

  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const diffEditorContainerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const editorInstanceRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const diffEditorInstanceRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);
  const monacoRef = useRef<any | null>(null);
  const saveStatusTimer = useRef<number | null>(null);

  const isDiffVisible = diffTarget !== null;

  // Debounce code changes for smoother preview updates
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedCode(code);
    }, 500);
    return () => {
      clearTimeout(handler);
    };
  }, [code]);

  // Update iframe URL with debounced code
  useEffect(() => {
    if (!debouncedCode) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      return;
    }
    const blob = new Blob([debouncedCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [debouncedCode]);

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
      contextmenu: true,
      quickSuggestions: { other: true, comments: false, strings: true },
      suggestOnTriggerCharacters: true,
      folding: true,
      showFoldingControls: 'always',
      // FIX: The `lightbulb.enabled` option now expects a string literal type ('on' | 'off' | 'onCodeAction') instead of a boolean.
      lightbulb: { enabled: 'onCodeAction' },
      "semanticHighlighting.enabled": true,
      // Enable breadcrumbs for symbol navigation/outlining
      breadcrumb: {
          enabled: true,
      },
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
    let completionProvider: monaco.IDisposable;

    (window as any).require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.49.0/min/vs' }});
    (window as any).require(['vs/editor/editor.main'], (monaco: any) => {
        monacoRef.current = monaco;
        
        // Configure JavaScript language service for better intellisense and navigation
        monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
            target: monaco.languages.typescript.ScriptTarget.ES2020,
            allowNonTsExtensions: true,
            checkJs: true, // Enable type checking for JS files
            lib: ['es2020', 'dom'] // Add DOM library for browser APIs
        });
        monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: false,
            noSyntaxValidation: false,
        });

        monaco.editor.defineTheme('ai-builder-dark', {
            base: 'vs-dark', inherit: true, rules: [],
            colors: {
                'editor.background': '#1F2937',
                'editorGutter.background': '#1F2937',
                'editor.lineHighlightBackground': '#374151',
                'breadcrumb.background': '#1F2937',
            }
        });
        monaco.editor.defineTheme('ai-builder-light', {
            base: 'vs', inherit: true, rules: [],
            colors: {
                'editor.background': '#F9FAFB',
                'editorGutter.background': '#F9FAFB',
                'editor.lineHighlightBackground': '#f3f4f6',
                'breadcrumb.background': '#F9FAFB',
            }
        });
        
        editor = monaco.editor.create(editorContainerRef.current, {
            ...getEditorOptions(),
            value: code,
            language: 'html',
            theme: theme === 'dark' ? 'ai-builder-dark' : 'ai-builder-light',
        });
        editorInstanceRef.current = editor;
        
        // AI Code Completion Provider
        completionProvider = monaco.languages.registerCompletionItemProvider(['html', 'javascript', 'css'], {
            triggerCharacters: ['.', ' ', '<', '>', '/', '(', '{', '"', "'", '`', '\n'],
            provideCompletionItems: async (model, position) => {
                const codeBefore = model.getValueInRange({ startLineNumber: 1, startColumn: 1, endLineNumber: position.lineNumber, endColumn: position.column }).slice(-2048);
                const codeAfter = model.getValueInRange({ startLineNumber: position.lineNumber, startColumn: position.column, endLineNumber: model.getLineCount(), endColumn: model.getLineMaxColumn(model.getLineCount()) }).slice(0, 1024);
                
                const fullCode = model.getValue();
                const offset = model.getOffsetAt(position);

                // Determine the context
                let languageContext = `HTML in the <body>`;
                const lastScriptTag = fullCode.lastIndexOf('<script', offset);
                const lastStyleTag = fullCode.lastIndexOf('<style', offset);

                if (lastScriptTag > lastStyleTag) {
                    const nextScriptCloseTag = fullCode.indexOf('</script>', offset);
                    if (lastScriptTag !== -1 && (nextScriptCloseTag === -1 || offset < nextScriptCloseTag)) {
                        languageContext = 'JavaScript within a <script> tag';
                    }
                } else if (lastStyleTag > lastScriptTag) {
                    const nextStyleCloseTag = fullCode.indexOf('</style>', offset);
                    if (lastStyleTag !== -1 && (nextStyleCloseTag === -1 || offset < nextStyleCloseTag)) {
                        languageContext = 'CSS within a <style> tag';
                    }
                }
                
                try {
                    const suggestionText = await getCodeCompletion(languageContext, codeBefore, codeAfter);
                    if (!suggestionText) {
                        return { suggestions: [] };
                    }
                    
                    const suggestion: monaco.languages.CompletionItem = {
                        label: {
                            label: `🤖 ${suggestionText.split('\n')[0].trim()}`,
                            description: 'AI Suggestion'
                        },
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: suggestionText,
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                        preselect: true,
                        sortText: '0', // Force to top
                        detail: 'AI Generated Code',
                        documentation: {
                            value: `**AI Suggestion**\n\n\`\`\`\n${suggestionText}\n\`\`\``,
                            isTrusted: true
                        }
                    };
                    return { suggestions: [suggestion] };

                } catch (error) {
                    console.error("Failed to get AI completion:", error);
                    return { suggestions: [] };
                }
            }
        });


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
        completionProvider?.dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty to run only once

  // Diff editor lifecycle
  useEffect(() => {
    if (isDiffVisible && diffEditorContainerRef.current && monacoRef.current && !diffEditorInstanceRef.current) {
        const monaco = monacoRef.current;
        
        const originalModel = monaco.editor.createModel(diffTarget.original, 'html');
        const modifiedModel = monaco.editor.createModel(diffTarget.modified, 'html');

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
  }, [isDiffVisible, diffTarget, theme, onCodeChange, updateUndoRedoState]);
  
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

  // Handle Escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && isFullScreen) {
            setIsFullScreen(false);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullScreen]);

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

  const handleOpenInNewTab = useCallback(() => {
    if (previewUrl) {
      window.open(previewUrl, '_blank', 'noopener,noreferrer');
    }
  }, [previewUrl]);
  
  const handleReloadPreview = useCallback(() => {
    if (iframeRef.current) {
      // Per the request, first clear the iframe's source to force a blank page.
      iframeRef.current.src = 'about:blank';
      
      // After a very brief delay, re-assign the actual preview URL. This forces
      // the browser to do a full reload of the iframe's content.
      setTimeout(() => {
        if (iframeRef.current && previewUrl) {
          iframeRef.current.src = previewUrl;
        }
      }, 50);
    }
  }, [previewUrl]);

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
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pr-2 md:pr-4 shrink-0">
        <div className="flex">
          <button onClick={() => setActiveTab('preview')} className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors duration-200 ${activeTab === 'preview' ? 'border-indigo-500 text-indigo-600 dark:text-white' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>Preview</button>
          <button onClick={() => setActiveTab('code')} className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors duration-200 ${activeTab === 'code' ? 'border-indigo-500 text-indigo-600 dark:text-white' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>Code Editor</button>
        </div>
        {isOutputVisible && (
          <div className="flex items-center gap-1 md:gap-3">
            {/* Collapsible Actions */}
            <div className={`items-center gap-1 md:gap-3 ${isToolbarCollapsed ? 'hidden' : 'flex'} md:flex`}>
              {activeTab === 'code' && (
                <>
                  {saveStatus === 'saved' && !isDiffVisible && (
                    <div className="hidden md:flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
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
                  {previousCode && (
                      <button 
                        onClick={isDiffVisible ? onCloseDiff : onCompareRequest} 
                        title={isDiffVisible ? 'Close Comparison' : 'Compare Changes'}
                        className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      >
                        <CompareIcon />
                        <span className="hidden md:inline">{isDiffVisible ? 'Close' : 'Compare'}</span>
                      </button>
                  )}
                </>
              )}
            </div>

            {/* Separator between sections on desktop */}
            <div className={`w-px h-5 bg-gray-300 dark:bg-gray-600 ${isToolbarCollapsed || activeTab !== 'code' ? 'hidden' : ''} md:block`} />
            
            {/* Always-Visible Actions */}
            <div className="flex items-center gap-1 md:gap-3">
              {activeTab === 'code' && (
                <button onClick={() => setIsFullScreen(!isFullScreen)} title={isFullScreen ? 'Exit Fullscreen' : 'Enter Fullscreen'} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    {isFullScreen ? <ExitFullScreenIcon /> : <FullScreenIcon />}
                </button>
              )}
              {activeTab === 'preview' && (
                  <>
                    <button onClick={handleReloadPreview} title="Reload Preview" disabled={!previewUrl} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <ReloadIcon />
                    </button>
                    <button onClick={handleOpenInNewTab} title="Open in New Tab" disabled={!previewUrl} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <ExternalLinkIcon />
                    </button>
                  </>
              )}
              <div className="w-px h-5 bg-gray-300 dark:bg-gray-600" />
              <button onClick={handleCopy} title="Copy Code" className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                {isCopied ? <CheckIcon /> : <CopyIcon />}
              </button>
              <button onClick={handleDownload} title="Download HTML" className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <DownloadIcon />
              </button>
            </div>
            
            {/* Mobile Toggle Button (only for code tab) */}
            {activeTab === 'code' && (
              <button onClick={() => setIsToolbarCollapsed(!isToolbarCollapsed)} title={isToolbarCollapsed ? 'Show Toolbar' : 'Hide Toolbar'} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 md:hidden">
                {isToolbarCollapsed ? <ChevronDownIcon /> : <ChevronUpIcon />}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-grow bg-gray-50 dark:bg-gray-800 relative overflow-hidden">
        {!isOutputVisible && (isGenerating ? <SkeletonLoader /> : <WelcomeMessage />)}
        
        {isOutputVisible && (
          <>
            <iframe
              ref={iframeRef}
              src={previewUrl || 'about:blank'}
              className={`w-full h-full border-0 ${activeTab !== 'preview' ? 'hidden' : ''}`}
              title="Application Preview"
              sandbox="allow-scripts allow-forms allow-same-origin"
            ></iframe>
            <div className={`w-full h-full ${activeTab !== 'code' ? 'hidden' : ''} ${isFullScreen ? 'fixed inset-0 z-50 bg-white dark:bg-gray-800' : ''}`}>
              <div ref={editorContainerRef} className={`w-full h-full ${isDiffVisible ? 'hidden' : ''}`}></div>
              <div ref={diffEditorContainerRef} className={`w-full h-full ${!isDiffVisible ? 'hidden' : ''}`}></div>
            </div>
          </>
        )}
      </div>
    </>
  );
};