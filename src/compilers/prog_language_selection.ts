export enum TargetLanguage {
  WAT = 'wat',
  AssemblyScript = 'ts',
}

export function isTargetLanguage(value: any): value is TargetLanguage {
  return Object.values(TargetLanguage).includes(value);
}

export interface ProgLangSelectionArgs {
  targetLanguage: TargetLanguage;
  compilerArgs?: any;
}
