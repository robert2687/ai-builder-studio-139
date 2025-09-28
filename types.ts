export type ActiveTab = 'preview' | 'code';
export type LoadingState = 'idle' | 'generate' | 'refine';
export type Theme = 'light' | 'dark';
export type CodeSourceInfo = {
  type: 'prompt' | 'file' | 'github';
  name: string;
};
