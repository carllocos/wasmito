import { type Command } from 'commander';
import { getGlobalLogger } from '../src/logger/logger';
import { isAbsolutePath, isFilePath } from '../src/util/file_util';
import { TestScenarioResultState } from '../wasmito_tester/shared_interfaces';
import { loadAndrunWasmModuleTest } from '../wasmito_tester/test_cases/test_load_module_and_run';
import path from 'path';

export function registerWasmitoTester(program: Command): void {
  program
    .command('wasmitotest <wasm-path> <json-mapping>')
    .description(`Test the load and run of a <wasm-path> on a DevVM`)
    .action(async (wasmPath, jsonPath) => {
      const logger = getGlobalLogger();
      if (!isFilePath(wasmPath)) {
        program.error('<wasm-path> is not a valid path to a Wasm module');
      }

      if (!isAbsolutePath(jsonPath)) {
        jsonPath = path.resolve(jsonPath);
      } else if (!isFilePath(jsonPath)) {
        program.error(
          '<json-mapping> is not a valid path to a json containing mappings',
        );
      }

      try {
        logger.info(
          `Testing Load and Run Wasm module ${wasmPath} upon a DevVM`,
        );
        const startTime = Date.now();
        const [testCaseResult] = await loadAndrunWasmModuleTest(
          wasmPath,
          jsonPath,
        );
        const endTime = Date.now();
        const diff = endTime - startTime;
        logger.info(
          `Took ${diff} ms, ${diff / 1000} secs, ${diff / 1000 / 60} mins`,
        );

        if (testCaseResult.result !== TestScenarioResultState.Success) {
          program.error(
            `TestScenario '${testCaseResult.scenario.testName}' Failed`,
          );
        }
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : e;
        program.error(`Error occurred while running TestScenario: ${errMsg}`);
      }
    });
}
