# Wasmito

Wasmito is a library that enables the creation of language-agnostic dynamic tools (e.g., debuggers, testing tools, monitoring tools) for applications that compile to WebAssembly and that run on MCUs using the [WARDuino Wasm VM](https://github.com/carllocos/WARDuino).

The **primary goal** of this project is to explore novel techniques for building language-agnostic dynamic tools tailored for MCUs.
As such, this project is **highly experimental** - you can expect bugs.
The tools developed using this library serve as an evaluation of the proposed techniques.

Here is a non-exhaustive list of functionality provided by the library:
- Deploy a Wasm module into a WARDuino VM. The VM can be running on an MCU, locally on a desktop machine, or out-of-place as introduced in the companion research paper.
- Hook infrastructure to intercep function calls, MCU events, and more.
- Call graph construction.
- Control-flow graph construction at the Wasm level or Source level.
- Language-agnostic debugging operations as introduced in companion research paper.
- ...

The CLI provided in this project exposes some of the above functionality.

## Installation

Before running the installation script, make sure the following dependencies are properly installed:
- Python 3: required by `arduino-cli`. Ensure Python 3 is accessible via the $PATH environment variable as `python`.
- python3-serial
- node version 23.11
- cmake
- permissions to access `/dev/*`

Once all dependencies are installed, run the installation script

```bash
bash scripts/install.sh
```

After the installation completes, the `libs` directory should contain the following directories:
- Arduino
- WARDuino

## Tests

To run the tests locally, execute the following command from within the root directory
```bash
npm run test
```

TODO: explain how to run the tests on the MCU.

## CLI

You can access the CLI as follow:

```bash
node dist/cjs/cli/cli.cjs --help
```


## Deploy a Wasm module

For a list of example applications that you can deploy on an MCU, take a look at [app examples](https://github.com/carllocos/app_examples).

## Building Dynamic Tools

See the toy examples in the `tool_examples` directory.

## Debugging An Application

For information, on how to debug an application see [debugging](tutorial/debugging.md)

## Research
Research that enabled language-agnostic debugging of WebAssembly on MCUs.

```bibtex
@inproceedings{10.1145/3759426.3760979,
    author = {Rojas Castillo, Carlos and Marra, Matteo and Gonzalez Boix, Elisa},
    title = {A Control-Flow Graph Approach to Language-Agnostic Debugging for Microcontrollers},
    year = {2025},
    isbn = {9798400721496},
    publisher = {Association for Computing Machinery},
    address = {New York, NY, USA},
    url = {https://doi.org/10.1145/3759426.3760979},
    doi = {10.1145/3759426.3760979},
    booktitle = {Proceedings of the 22nd ACM SIGPLAN International Conference on Managed Programming Languages and Runtimes},
    pages = {38–56},
    numpages = {19},
    keywords = {Breakpoints, Debugging, IoT, Stepping, WebAssembly, microcontrollers},
    location = {Singapore, Singapore},
    series = {MPLR '25}
}
```

Research that enabled out-of-things debugging.
```bibtex
@article{Rojas_Castillo_2022,
   title={Out-of-Things Debugging: A Live Debugging Approach for Internet of Things},
   volume={7},
   ISSN={2473-7321},
   url={http://dx.doi.org/10.22152/programming-journal.org/2023/7/5},
   DOI={10.22152/programming-journal.org/2023/7/5},
   number={2},
   journal={The Art, Science, and Engineering of Programming},
   publisher={Aspect-Oriented Software Association (AOSA)},
   author={Rojas Castillo, Carlos and Marra, Matteo and Bauwens, Jim and Gonzalez Boix, Elisa},
   year={2022},
   month=oct }
```

Research that enabled event-based out-of-place debugger.
```bibtex
@inproceedings{EDWARD,
    author = {Lauwaerts, Tom and Castillo, Carlos Rojas and Singh, Robbert Gurdeep and Marra, Matteo and Scholliers, Christophe and Gonzalez Boix, Elisa},
    title = {Event-Based Out-of-Place Debugging},
    year = {2022},
    isbn = {9781450396967},
    publisher = {Association for Computing Machinery},
    address = {New York, NY, USA},
    url = {https://doi.org/10.1145/3546918.3546920},
    doi = {10.1145/3546918.3546920},
    booktitle = {Proceedings of the 19th International Conference on Managed Programming Languages and Runtimes},
    pages = {85–97},
    numpages = {13},
    keywords = {Debugger, Internet-of-Things, Out-of-place debugging, Virtual Machine, WARDuino, WebAssembly},
    location = {Brussels, Belgium},
    series = {MPLR '22}
}
```

## Future Work

- Fix documentation
- provide API abstraction at source-code level and/or CFG level.
- integrate Espressif in the development.
- handle multiple devices
- integrate Zigbee communication
