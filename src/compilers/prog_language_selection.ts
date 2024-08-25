export enum TargetLanguage {
  WAT = 'wat',
  AssemblyScript = 'ts',
  Rust = 'rs',
  Wasm = 'wasm',
}

export function isTargetLanguage(value: any): value is TargetLanguage {
  return Object.values(TargetLanguage).includes(value);
}

export interface ProgLangSelectionArgs {
  targetLanguage: TargetLanguage;
  compilerArgs?: any;
}
