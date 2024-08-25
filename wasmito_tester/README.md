#### Tester

This directory implementents a WIP testing tool that is meant to be moved to a different repo.

To run the tool the file `cli.js` can be run with the transpiled TS files that use the testing framework. Each file to be tested nees to export a function called `runTest` that in its body runs the test via the `SystemTester`. If the test requires arguments, the `runTest` method should simply declare the arguments and these can be then passed via the cli. The following is an example of running the test tool:

```
> ./cli.js path/to/test_case.cjs arg1 arg2
```

and where test case could be

```TS
export async function runTest(arg1: string, arg2: string): Promise<TestScenarioResult>{
  ...

  const tester = new SystemTester(systemSetup);
  tester.addTestScenario(testScenario, deviceID);
  return await tester.runTests();
}
```
