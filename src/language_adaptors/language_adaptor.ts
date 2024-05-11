export class LanguageAdaptor {
  private readonly _sourceFiles: string[];
  constructor(sourceFiles: string[]) {
    this._sourceFiles = sourceFiles;
  }

  // following method should be move to AST class
  // public getFunction(id: number): WASMFunction | undefined {
  //   if (id >= this.wasm.imports.length) {
  //     return this.wasm.functions.find((f) => {
  //       return f.id === id;
  //     });
  //   } else {
  //     return this.wasm.imports.find((f) => {
  //       return f.id === id;
  //     });
  //   }
  // }

  // following method should be move to AST class
  // private async createAST(parser: Parser): Promise<void> {
  //   for (let i = 0; i < this.sources.length; i++) {
  //     const source = this.sources[i];
  //     const content = await fs.promises.readFile(source);
  //     const sourceCode = content.toString();
  //     const tree = parser.parse(sourceCode);
  //     this._sourceTreeMap.set(source, tree);
  //   }
  // }
}
