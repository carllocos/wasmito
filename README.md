# Wasmito

Wasmito is a library that enables the creation of dynamic tools (e.g., debuggers, testing tools, monitoring tools) for applications that compile to WebAssembly and that run on MCUs using the [WARDuino Wasm VM](https://github.com/carllocos/WARDuino).
The library provides an API that can be used to develop dynamic tools. Behind the scenes, the library handles all communication with the WARDuino VM and enables the dynamic tool's functionality.

After completing the installation of Wasmito, some of its functionality can be accessed via a CLI.


## Installation

Make sure to install the following dependencies:
- Python 3 and make it accessible via the $PATH environment variable
- python3-serial
- cargo
- cargo binstall
- node version 23.11
- cmake
- make sure to have permissions for /dev/*

After installing the dependencies, run the installation script `scripts/install.sh`.

After the installation completes, the `libs` directory should contain the following directories:
- wabt
- Arduino
- WARDuino

## Tests

To run the tests simply run `npm run test` from within the root of the directory.

## CLI

After the installation script completes, you can use the CLI as follow:

> node dist/cjs/cli/cli.cjs