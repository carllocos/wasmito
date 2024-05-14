// import assert from 'assert';
// import { expect } from 'chai';
// import {
//   AssemblyScriptCompiler,
//   type AssemblyScriptCompilerArgs,
// } from '../../src/source_mappers/compilers/assemblyscript_compiler';
// import { type AssemblyScriptSourceMap } from '../../src/source_mappers/assemblyscript/assembly_script_source_map';

// describe('Test AS SourceMapper', () => {
//   let sourceMap: AssemblyScriptSourceMap;
//   let mainAppSourceFile: string;

//   before('Compile AS via asconfig.json', async () => {
//     const outputDir = './test/data/as_output/';
//     const config: AssemblyScriptCompilerArgs = {
//       pathToASConfig:
//         '/Users/crojcas/Documents/projects/dimmer-m5stickc/asconfigblink.json',
//       pathToSrcRoot: '/Users/crojcas/Documents/projects/dimmer-m5stickc/',
//     };
//     const compiler = new AssemblyScriptCompiler(outputDir);

//     sourceMap = await compiler.compile(config);
//     assert(sourceMap !== undefined, 'failed to produce a sourcemap');
//     const sources = sourceMap.sources;
//     const src = sources.find(
//       (s) => s.endsWith('index.ts') && !s.includes('warduino'),
//     );
//     assert(src !== undefined, 'failed to find the Application source');
//     mainAppSourceFile = src;
//   });

//   it.skip('unexisting line nr should return undefined', () => {
//     const mappings = sourceMap.generatedPositionFor({
//       linenr: 500,
//     });
//     expect(mappings.length).to.equal(0);
//   });

//   it.skip('nextSourceLocation of unexisting line nr should return undefined', () => {
//     const sm = sourceMap.nextSourceCodeLocation(mainAppSourceFile, 500, 4);
//     expect(sm).to.equal([]);
//   });

//   it.skip('nextSourceLocation of unexisting source should return undefined', () => {
//     const sm = sourceMap.nextSourceCodeLocation('unexisting source', 500, 4);
//     expect(sm).to.equal([]);
//   });

//   it.skip('nextSourceLocation of unexisting source should return undefined', () => {
//     const mapping = sourceMap.getOriginalPositionFor(468);
//     assert(mapping !== undefined);
//     const next1 = sourceMap.nextSourceCodeLocation(
//       mainAppSourceFile,
//       mapping.linenr,
//       mapping.columnStart,
//     );
//     assert(next1.length === 1);
//     assert(next1[0].linenr === 42);

//     const next2 = sourceMap.nextSourceCodeLocation(
//       mainAppSourceFile,
//       next1[0].linenr,
//       next1[0].columnStart,
//     );
//     assert(next2.length === 1);
//     assert(next2[0].linenr === 43);

//     const next3 = sourceMap.nextSourceCodeLocation(
//       mainAppSourceFile,
//       next2[0].linenr,
//       next2[0].columnStart,
//     );
//     assert(next3.length === 1);
//     assert(next3[0].linenr === 45);

//     const next4 = sourceMap.nextSourceCodeLocation(
//       mainAppSourceFile,
//       next3[0].linenr,
//       next3[0].columnStart,
//     );
//     assert(next4.length === 0);
//   });

//   it.skip('stepOver while statement leads to after while Statement', () => {
//     const whileLineNr = 45;
//     const whileColStart = 4;
//     const emptyStatement = sourceMap.nextSourceCodeLocation(
//       mainAppSourceFile,
//       whileLineNr,
//       whileColStart,
//     );
//     assert(emptyStatement.length === 0);
//   });

//   it.skip('stepOver from within while bool expression', () => {
//     const statementsAfterWhileCond = sourceMap.nextSourceCodeLocation(
//       mainAppSourceFile,
//       45,
//       12,
//     );
//     assert(statementsAfterWhileCond.length === 2);
//     // assert(statementsAfterWhileCond[0].linenr === whileLineNr);
//     // assert(guardBoolExpression[0].columnStart > whileColStart + 5); // 5 chars for while
//   });
// });
