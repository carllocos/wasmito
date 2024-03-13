// import assert from 'assert';
// import {
//   AssemblyScriptCompiler,
//   type AssemblyScriptCompilerArgs,
// } from '../../src/source_mappers/compilers/assemblyscript_compiler';
// import { type AssemblyScriptSourceMap } from '../../src/source_mappers/assemblyscript/assembly_script_source_map';

// describe('Test AS Compilation', () => {
//   it('', async () => {
//     const outputDir = '/home/carllocos/Projects/wasmito/test/as_output/';
//     const config: AssemblyScriptCompilerArgs = {
//       pathToASConfig: '/home/carllocos/Projects/dimmer-m5stickc/asconfig.json',
//       pathToSrcRoot: '/home/carllocos/Projects/dimmer-m5stickc/',
//     };
//     const compiler = await AssemblyScriptCompiler.createCompiler(
//       config,
//       outputDir,
//     );

//     const sourceMap: AssemblyScriptSourceMap = await compiler.compile(
//       config.pathToASConfig,
//       outputDir,
//     );
//     assert(sourceMap !== undefined, 'failed');
//   });
// });
