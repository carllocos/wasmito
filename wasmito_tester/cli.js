#!/usr/bin/env node

"use strict";

const pathToJS = "../dist/cjs/";
const { TestScenarioResultState } = require(
  `${pathToJS}/wasmito_tester/shared_interfaces.cjs`
);
const cliArgs = process.argv.slice(2);
const testFile = cliArgs[0];
const testFileArgs = cliArgs.slice(1);

console.info(`Running Tests of '${testFile}'`, "with args", testFileArgs);
const testFileMod = require(testFile);
if (testFileMod.run === undefined) {
  console.error(`imported script ${testFile} has no exported 'run' fun`);
  process.exit(1);
}

if (testFileMod.run.length !== testFileArgs.length) {
  console.error(
    `run of ${testFile} expects ${testFileMod.run.length}. Given ${testFileArgs.length}`
  );
  process.exit(1);
}

async function runTest() {
  try {
    const startTime = Date.now();
    const results = await testFileMod.run.apply(null, testFileArgs);
    const endTime = Date.now();
    const diff = endTime - startTime;
    console.info(
      `Took ${diff} ms, ${diff / 1000} secs, ${diff / 1000 / 60} mins`
    );

    if (Array.isArray(results)) {
      let exitCode = 0;

      if (results.length > 0) {
        for (let i = 0; i < results.length; i++) {
          const [testCaseResult] = results;
          if (testCaseResult.result === TestScenarioResultState.Failed) {
            exitCode = 1;
          }
        }
      } else {
        console.log(`Nothing to report for ${testFile}`);
      }
      process.exit(exitCode);
    }
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : e;
    console.error(`Error occurred while running TestScenario: ${errMsg}`);
    process.exit(1);
  }
}

runTest().catch(console.error);
