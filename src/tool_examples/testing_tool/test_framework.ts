/* 
* The testing framework
* General idea: the testing consists of two big steps.
* 1. System setup: define how your IoT system looks like
* 2. System testing: defines when, expect, do rules, on the system
* The style of writing the tests is declarative and in a chaining call manner.
*
/

/
*
* System Setup
*
* In the system setup you define declaratively, the number of devices that you will use, which programs they run,
* whether they start in a running state or paused state, etc.
* The systemsetup code can be imported into different system tests and even modified/extended once imported
*/

function SystemSetup(name: string): any {
  // should be a class
  return {};
}

/*
 *   e.g. setup_out_of_place_system.ts
 */

// During the system setup you can tell devices you will use
const systemSetup: any = SystemSetup(
  'name of the system setup useful for test report',
);

// a file path that points to all devices
systemSetup.setupFromFile('path to yml or json');

// manually add devices. Manually adding can be used in combination with the setupFromFile
const devDevice = systemSetup.addDevDevice('path to Program').name('Albert');

const device = systemSetup.esp32('path to program');
device.name('optional name').proxy('path to serial or socket');
// or
device.name('optional name').proxy(devDevice); // otherDevice from systemSetup
// or
device.name('optional name').proxy('Albert'); // otherDevice from systemSetup

// Devices can start with an intial state
systemSetup.device('some device name').startContext('Path to json state');
systemSetup
  .device('some device name')
  .startContext('string that is unparsed state');
// or
systemSetup.device('some device name').runUntilLine(38); // line nr

// Devices can start with some events

// the events will be put in the device queue after the device was fully setup
systemSetup.device('some device name').eventsPostSetup(['event 1', 'event 2']);

// the events will be used during the process of setting up the device
systemSetup
  .device('some device name')
  .eventsDuringSetup(['event 1', 'event 2']) // events are pushed in the queue instantly after device is deployed
  .handleEventsAfterLine(38, ['event 1', 'event 2']); // events are pushed in the queue after line 38 was reached

// Devices can also be configured to be paused/run once setup is done
devDevice.pausePostSetup();
devDevice.runPostSetup();
// or
systemSetup.devices.foreach((dev: any) => {
  dev.pausePostSetup();
});

// You can also deploy everything without running any test
// And programmatically you can perform actions on the devices
systemSetup.deploy();

// manual actions
devDevice.vm.run();

systemSetup.cleanup();

/*   System Testing
 *
 * The testing system part consists of using rules that can are build using 3 different kinds of methods:
 *
 * 1. when methods: the when methods define a condition (e.g. afterFunCall, onLogicalClock, atLineNr, etc.) that once met the expect and/or do methods will be triggered
 * 2. expect methods: the expect methods define what needs to be satisfied or else an error will be raised
 * 3. do methods: the do methods just apply something on the device
 *
 *
 *
 * The rules can have the following formats:
 *
 * rule: when <- expect (the testing happens by expect)
 * rule: when <- do (here you test nothing)
 * rule: when <- do expect
 * rule: when <- expect do
 *
 * Each of the whe methods, expect methods, and do methods take 2 last optional parameters.
 * One for an expection message to display if the test fails
 * And the other is a max wait time before giving up. On time out a timeout message is thrown
 *
 *
 * To combine both setup and testing we use withSetup function.
 * And we need to specificy to which device the rule applies before writing down the rules.
 */

function withSetup(a: any): any {
  // yet to be defined but just added as this to prevent intellisense complains
  return a;
}

function when(description?: string, timeout?: number): any {
  return {};
}

function expect(description?: string, timeout?: number): any {
  return {};
}

/*
 * e.g., test_system.ts
 *
 * suppose test_system.ts does:
 * const systemSetup = require('system_setup.ts');
 */

// modify loaded systemSetup
systemSetup.name('new name of system setup');
systemSetup.device('some name').runPostSetup().name('running device');

const newSystemSetup = systemSetup.clone();

newSystemSetup.name('Setup where all devices run');
newSystemSetup.devices.foreach((dev: any) => {
  dev.runPostSetup();
});

// one test Case in the form of when <- expect
withSetup(systemSetup)
  .onDevice('somedeviceID') // or pass the object e.g., devDevice of above
  .when('An event is triggered on the device when button is pressed', 5000) // description of the when part that will be used for report and max wait time for when to become true
  .onHandledEvent('event is handled', 10000) // optional expection msg and time out per sub condition of when possible
  .expect('The callback of the button should be called')
  .funCall('func ID', 500) // instead of ID pass WasmFunction, etc. Timeout
  .args([3, 4], 'arguments do not match')
  .runTest(); // optional arguments

// Alternatively each part of the rule can be defined seperately
const buttonPress = when(
  `An event is triggered on device ${devDevice.name}`,
  5000,
).onHandledEvent('event is handled', 10000);

const eventGetsHandled = expect().funCall(
  'func ID',
  [3, 4],
  'func received invalid args',
  500,
);

// run test by combining each rule part
withSetup(systemSetup)
  .onDevice(devDevice)
  .when(buttonPress)
  .expect(eventGetsHandled)
  .runTest();

// You can also save some rule to be the when of another rule to trigger
const testOnDeviceA = withSetup(systemSetup)
  .when(buttonPress)
  .expect(eventGetsHandled);

const testToRunOnAnotherDevice = withSetup(systemSetup)
  .when(testOnDeviceA)
  .onDevice('anotherDeviceID')
  .funcCall('func ID')
  .do()
  .insertEvents(['ev1', 'ev2'])
  .do((dev: any) => {
    // more fine grained control over what to do via (async) callback
    dev.run();
  })
  .expect()
  .trapThrown(
    'error msg expected',
    'the expected error msg was not produced',
    5000,
  );
testToRunOnAnotherDevice.runTest();
