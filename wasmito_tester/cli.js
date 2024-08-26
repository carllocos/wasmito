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
if (testFileMod.runTest === 0) {
  console.error(`imported script ${testFile} has no exported 'runTest' fun`);
  process.exit(1);
}

if (testFileMod.runTest.length !== testFileArgs.length) {
  console.error(
    `runTest of ${testFile} expects ${testFileMod.runTest.length}. Given ${testFileArgs.length}`
  );
  process.exit(1);
}

async function runTest() {
  try {
    const startTime = Date.now();
    const [testCaseResult] = await testFileMod.runTest.apply(
      null,
      testFileArgs
    );
    const endTime = Date.now();
    const diff = endTime - startTime;
    console.info(
      `Took ${diff} ms, ${diff / 1000} secs, ${diff / 1000 / 60} mins`
    );

    if (testCaseResult.result !== TestScenarioResultState.Success) {
      console.error(
        `TestScenario '${testCaseResult.scenario.testName}' Failed`
      );
      process.exit(1);
    }
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : e;
    console.error(`Error occurred while running TestScenario: ${errMsg}`);
    process.exit(1);
  }
}

runTest().then(console.log).catch(console.error);
