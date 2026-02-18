# Building Language-Agnostic Dynamic Tools

Wasmito provides a high-level API for creating dynamic tools for Wasm applications running on the WARDuino VM.
The API enables the development of a wide range of dynamic tools (e.g., code coverage, fuzzers, debuggers) that were previously available only for C/C++ applications running on MCUs.
Wasmito is designed to be language-agnostic; that is, a dynamic tool needs to be implemented only once to automatically support all languages that compile to Wasm.

The API is designed to follow the terminology and concepts of *Aspect-Oriented Programming (AOP)*.

The following terminology is used throughout this tutorial:
- An *event* is the occurrence of a program behavior at runtime.
  For instance, a function call, an interrupt, the execution of an `i32.const` instruction, and so on.
- An *advice* is a piece of code that is executed when one or more *events* occur, according to a specified *mode*.
- A *mode* determines when an advice is executed relative to the *event*.
  Available modes include *before*, *after*, *around*, *on new interrupt*, *before interrupt handling*, and others.

An example, that runs an advice before the occurence of each `i32.const` event:
```TS
// ...
const analysis = new WasmAnalysis(wasm, connectionToVM);
analysis.before(WasmCode.I32Const, (i: WasmInstruction, args: ReadOnlyWasmValue[]) => { 
  console.log(`${i.startAdress}: i32.const executed`)
});
```

Because MCUs do not have sufficient resources to run advices, Wasmito executes the advice on the desktop and applies lightweight instrumentation in the MCU VM to react to the desired events.

The API operates at three different levels of abstraction: Wasm instructions, interrupts, and (source-level) control-flow graphs (CFGs).

The following sections elaborate on the APIs. Example tools built with the API can be found in `wasmito/tool_examples/record` and `wasmito/tool_examples/cfg_monitor/`.


## Wasm level API

TODO

Wasm level modes for Wasm instructions legend
- (b) before
- (ar) around
- (af) after


action legend
- (y) yes
- (x) not supported
- (na) intentionally not allowed
- (pf) partially finished
- (t) todo



| event         | modes  | pause |  run  | inspect state | load state |add interrupt  | (remote) func call | substitute with value | reboot   |
|---------------|--------|-------|-------|---------------| ---------- | ------------- | ------------------ | --------------------- |--------- |
| call          | b, af  | y     | y     |    y          |   pf       |         y     |     y              |       na              |    y     |
| call          | ar     | na    | na    |    na         |   na       |         na    |     y              |       y [1]           |    y     |
| call_indirect | b, af  | y     | y     |    y          |   pf       |         y     |     y              |       na              |    y     |
| call_indirect | ar     | na    | na    |    na         |   na       |         na    |     y              |       y               |    y     |
| trap/error    | b      | na    | na    |    y   [1]    |   na       |         na    |     na             |       na              |    y     |
| i32.const     | b, af  | y     | y     |    y   [1]    |   pf       |         y     |     y              |       na              |    y     |
| global.get    | b, af  | y     | y     |    y   [1]    |   pf       |         y  [1]|     y              |       na              |    y     |
| ... except*   | b, af  | y     | y     |    y          |   pf       |         y     |     y              |       na              |    y     |
| block         | b      | y     | y     |    y          |   pf       |         y     |     y              |       na              |    y     |
| loop          | b      | y     | y     |    y          |   pf       |         y     |     y              |       na              |    y     |
| if            | b      | y     | y     |    y          |   pf       |         y     |     y              |       na              |    y     |
| else          | b      | y     | y     |    y          |   pf       |         y     |     y              |       na              |    y     |
| end           | b,a    | y     | y     |    y          |   pf       |         y     |     y              |       na              |    y     |
| interrupt     | on     | y     | y     |    y  [1]     |   pf       |         y     |     y              |       na              |    y     |
| interrupt     | bh     | y     | y     |    y          |   pf       |         y     |     y              |       na              |    y     |
| interrupt     | ah     | pf    | pf    |    pf         |   pf       |         pf    |     pf             |       na              |    pf    |
| i32.const     | ar (t) | na    | na    |    na         |   na       |         na    |     y              |       y               |    y     |
| ... except*   | ar (t) | na    | na    |    na         |   na       |         na    |     y              |       y               |    y     |
*`block`, `loop`, `if`, `else`, and `end`


## Interrupt API
TODO

modes for interrupts legend
- (on) on new interrupt
- (bh) before handling interrupt
- (ah) after handling interrupt [todo]
Additional actions only for Interrupt events:

| mode | Interrupt Inspect | Interrupt Remove | Interrupt Subsitute|
|------|-------------------|------------------|--------------------|
| on   | y  [1]            | y                |    pf              |
| bh   | y                 | y  [1]           |    pf              |
| ah   | pf                | na               |    na              |

## Source-Level CFG API
TODO
