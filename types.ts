export type ActiveTab = 'preview' | 'code';
export type LoadingState = 'idle' | 'generate' | 'refine';
export type Theme = 'light' | 'dark';
export type CodeSourceInfo = {
  type: 'prompt' | 'file' | 'github' | 'saved';
  name: string;
};

export interface SavedProject {
  generatedCode: string;
  initialPrompt: string | null;
  codeSourceInfo: CodeSourceInfo | null;
}

export interface CodeVersion {
  code: string;
  timestamp: number;
}
