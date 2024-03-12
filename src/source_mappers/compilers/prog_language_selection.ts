export enum TargetLanguage {
  WAT = 'wat',
  AssemblyScript = 'ts',
}

export interface ProgLangSelectionArgs {
  targetLanguage: TargetLanguage;
  compilerArgs?: any;
}
