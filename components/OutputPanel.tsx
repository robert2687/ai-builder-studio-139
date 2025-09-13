import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { ActiveTab } from '../types';
import { CopyIcon, DownloadIcon, CheckIcon, WelcomeIcon, UndoIcon, RedoIcon } from './icons';
import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

interface OutputPanelProps {
  code: string;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isLoading: boolean;
  editorInstance: monaco.editor.IStandaloneCodeEditor | null;
  setEditorInstance: (instance: monaco.editor.IStandaloneCodeEditor) => void;
}

const SkeletonLoader: React.FC = () => (
  <div className="w-full h-full p-4 animate-pulse">
    <div className="bg-gray-700 h-8 w-3/4 rounded-md mb-4"></div>
    <div className="bg-gray-700 h-4 w-1/2 rounded-md mb-6"></div>
    <div className="bg-gray-700 h-12 w-full rounded-md mb-4"></div>
    <div className="bg-gray-700 h-12 w-full rounded-md"></div>
  </div>
);

const WelcomeMessage: React.FC = () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
        <WelcomeIcon />
        <h3 className="text-xl font-semibold text-gray-400">Your App Preview Will Appear Here</h3>
        <p className="text-gray-500 mt-1">Enter a description and click 'Generate Application' to start.</p>
    </div>
);

export const OutputPanel: React.FC<OutputPanelProps> = ({ code, activeTab, setActiveTab, isLoading, editorInstance, setEditorInstance }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const editorRef = useRef<HTMLDivElement | null>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorInstance) return;

    // The require function is globally available from loader.js
    (window as any).require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.49.0/min/vs' }});
    (window as any).require(['vs/editor/editor.main'], () => {
        const editor = (window as any).monaco.editor.create(editorRef.current, {
            value: code,
            language: 'html',
            theme: 'vs-dark',
            automaticLayout: true,
            minimap: { enabled: false },
            wordWrap: 'on'
        });
        setEditorInstance(editor);
    });

    return () => {
        editorInstance?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (editorInstance && code && editorInstance.getValue() !== code) {
      editorInstance.setValue(code);
    }
  }, [code, editorInstance]);

  useEffect(() => {
    if (!editorInstance) return;

    const model = editorInstance.getModel();
    if (model) {
        setCanUndo(model.canUndo());
        setCanRedo(model.canRedo());
    }

    const disposable = editorInstance.onDidChangeModelContent(() => {
        const currentModel = editorInstance.getModel();
        if (currentModel) {
            setCanUndo(currentModel.canUndo());
            setCanRedo(currentModel.canRedo());
        }
    });

    return () => {
        disposable.dispose();
    };
  }, [editorInstance]);

  const handleCopy = useCallback(() => {
    if (!editorInstance) return;
    navigator.clipboard.writeText(editorInstance.getValue()).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    });
  }, [editorInstance]);
  
  const handleDownload = useCallback(() => {
    if (!editorInstance) return;
    const currentCode = editorInstance.getValue();
    const blob = new Blob([currentCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai-generated-app.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [editorInstance]);

  const handleUndo = useCallback(() => {
    editorInstance?.trigger('toolbar', 'undo', null);
    editorInstance?.focus();
  }, [editorInstance]);

  const handleRedo = useCallback(() => {
    editorInstance?.trigger('toolbar', 'redo', null);
    editorInstance?.focus();
  }, [editorInstance]);

  const isOutputVisible = !isLoading && code;

  return (
    <>
      <div className="flex items-center justify-between border-b border-gray-700 pr-4 shrink-0">
        <div className="flex">
          <button onClick={() => setActiveTab('preview')} className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors duration-200 ${activeTab === 'preview' ? 'border-indigo-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}>Preview</button>
          <button onClick={() => setActiveTab('code')} className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors duration-200 ${activeTab === 'code' ? 'border-indigo-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}>Code Editor</button>
        </div>
        {isOutputVisible && (
          <div className="flex items-center gap-3">
            {activeTab === 'code' && (
              <>
                <button onClick={handleUndo} title="Undo (Ctrl+Z)" disabled={!canUndo} className="p-2 rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  <UndoIcon />
                </button>
                <button onClick={handleRedo} title="Redo (Ctrl+Y)" disabled={!canRedo} className="p-2 rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  <RedoIcon />
                </button>
                <div className="w-px h-5 bg-gray-600" />
              </>
            )}
            <button onClick={handleCopy} title="Copy Code" className="p-2 rounded-md hover:bg-gray-700 transition-colors">
              {isCopied ? <CheckIcon /> : <CopyIcon />}
            </button>
            <button onClick={handleDownload} title="Download HTML" className="p-2 rounded-md hover:bg-gray-700 transition-colors">
              <DownloadIcon />
            </button>
          </div>
        )}
      </div>

      <div className="flex-grow bg-gray-900/50 relative overflow-hidden">
        {!isOutputVisible && (isLoading ? <SkeletonLoader /> : <WelcomeMessage />)}
        
        {isOutputVisible && (
          <>
            <iframe
              src={previewUrl || 'about:blank'}
              className={`w-full h-full border-0 ${activeTab !== 'preview' ? 'hidden' : ''}`}
              title="Application Preview"
              sandbox="allow-scripts allow-forms allow-same-origin"
            ></iframe>
            <div ref={editorRef} className={`w-full h-full ${activeTab !== 'code' ? 'hidden' : ''}`}></div>
          </>
        )}
      </div>
    </>
  );
};