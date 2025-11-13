## Deploying a Wasm module

To deploy a Wasm module into a MCU, you can make use of the `arduino-cli` command installed upon installation of this library,
or use the CLI provided by Wasmito, which uses behind the scenes the `arduino-cli` command.

The following explains how to set up a Blinking LED project and deploy it on an M5StickC.

In the following, we show the set up for AssemblyScript.
For other languages, similar steps can be applied.

### Create project directory

Create an empty directory that will contain the source code of your project.

```bash
mkdir blink && cd blink
```

For an AssemblyScript project, you can either install the AssemblyScript compiler globally or locally using npm init.
We show how to use AssemblyScript locally to the project repo.
For this, we run the following command and we leave all the options blank.

```bash
npm init
```

Add the dependency to the AssmeblyScript compiler.

```bash
npm install assemblyscript@0.27.25
```

create a source directory to contain your source files.

```bash
mkdir src
```

Add the following source file to your project.

```TypeScript
@external("env", "chip_delay") declare function chip_delay(ms: u32): void;

@external("env", "chip_pin_mode") declare function chip_pin_mode(pin: u8, mode: u8): void;
@external("env", "chip_digital_write") declare function chip_digital_write(pin: u8, value: u8): void;

function pinMode(pin: u8, mode: u8): void {
    chip_pin_mode(pin, mode);
}

function digitalWrite(pin: u8, value: u8): void {
    chip_digital_write(pin, value);
}

function delay(ms: u32): void {
    chip_delay(ms);
}

export function main(): void {
    const LED: u8 = 10;
    const PAUSE: u32 = 1000;
    const OUTPUT: u8 = 2;
    const ON: u8 = 1;
    const OFF: u8 = 0;

    pinMode(LED, OUTPUT);

    while (true) {
        digitalWrite(LED, ON);
        delay(PAUSE);
        digitalWrite(LED, OFF);
        delay(PAUSE);
    }
}
```


### Compile to Wasm
    
Add the following lines to the `package.json`:
```JSON
    ...
    "scripts": {
        ...
        "build": "npm run build:debug && npm run build:release",
        "build:debug": "node_modules/assemblyscript/bin/asc.js src/blink.ts -o wasm/blink.wasm --sourceMap --debug",
        "build:release": "node_modules/assemblyscript/bin/asc.js src/blink.ts -o wasm/blink.release.wasm"
    },
    ...

```


Then you can compile the Wasm module by running

```bash
npm run
```

This will produce three files in directory `wasm`:
- `blink.release.wasm`: this is the Wasm module for which the compiler enabled optimisations.
- `blink.wasm`: this is the Wasm module produced by the compiler without any optimisation enabled.
- `blink.wasm.map`: this is the debugging information produced by the compiler for the `blink.wasm` module.


###  Deploy Blink.wasm

To deploy a Wasm module to a MCU, you can use the Wasmito CLI. Note that the following commands were purely introduced for convenience. It is perfectly possible to deploy the Wasm module by using `arduino-cli` and giving it access to the config file present in `wasmito/libs/Arduino/arduino_config.yml`.

The following uses Wasmito CLI to deploy a Wasm module.
Moreover, the following assumes that `wcli` is an alias for `node path_to_wasmito/dist/cjs/cli/cli.cjs

First, create an empty project in the current directory

```
wcli project --new
```
This creates empty directory `wasmito/.wasmito_project/`.
This directory will contain all the information about the MCU that will run the Wasm module.

Then add one MCU to your project and give it a name

```
wcli devices --add m5stickc 
```
Install the needed libraries to target the M5StickC.

Add the URL to the M5StickC board

```bash
wcli arduino-cli config add \
    board_manager.additional_urls \
    https://m5stack.oss-cn-shenzhen.aliyuncs.com/resource/arduino/package_m5stack_index.json
```

Then install the core libraries
```bash
wcli arduino-cli core install m5stack:esp32@2.0.0
```

The installation completed successfully if you can find the `m5stack:esp32:m5stick-c` FQBN when listing all the available boards:
```bash
wcli arduino-cli board listall | grep m5stack:esp32:m5stick-c
```

Then set the serial path, fqbn, and baudrate of the MCU:

```bash
wcli devices --d m5stickc -p Arduino --serial /dev/pathToDevice --fqbn m5stack:esp32:m5stick-c --baudrate 115200
```

Deploy the module using

```bash
wcli upload m5stickc --wasm wasm/blink.wasm
```

The command will take some time to complete since it compile the binary including the WARDuino VM and then flashes it into the M5StickC.
