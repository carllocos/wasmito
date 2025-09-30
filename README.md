# Wasmito

Wasmito is a library that enables the creation of language-agnostic dynamic tools (e.g., debuggers, testing tools, monitoring tools) for applications that compile to WebAssembly and that run on MCUs using the [WARDuino Wasm VM](https://github.com/carllocos/WARDuino).

The **primary goal** of this project is to investigate novel tool development techniques for the creation of language-agnostic dynamic tools tailored to MCUs.
Thus this project is **highly experimental** i.e., you can expect bugs.
The tools that emerge from this library serve as evaluation of the proposed techniques.

This is a non-exhaustive list of functionality provided by the library:
- Deploy a Wasm module into a WARDuino VM. The VM could either be running on a MCU, locally on a desktop machine, or out-of-place as introduced companion research work ...
- Hook infrastructure to hook into function calls, MCU events, and so on.
- call graph construction.
- control-flow graph construction at a Wasm level or Source level.
- Language-agnostic debugging operations as introduced in companion research paper.
- ...

The CLI provided in this project  exposes some of the above functionality.

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

TODO: explain how to run the tests on the MCU.

## CLI

You can access the CLI as follow:

> node dist/cjs/cli/cli.cjs --help


## Deploy a Wasm module

see `docs/deploy_wasm.md`

## Building Dynamic Tools

See the toy examples in directory `tool_examples`.


## Research
Research that enabled language-agnostic debugging of WebAssembyl on MCUs.

```bibtex
to appear on MPLR
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