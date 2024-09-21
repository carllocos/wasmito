export interface LanguageConfiguration {
  language: string;
  fileExtensions: string[];
  parserPath: string;
  astDebugOperations: ASTDebugOperation[];
}

export enum DebugOperationName {
  BreakOnInstanceCreation = 'BreakOnInstanceCreation',
}

export interface ASTNodeDescription {
  grammarType: string;
}

export interface ASTDebugOperation {
  astNodeDescription: ASTNodeDescription;
  debugOperation: DebugOperationName;
}
