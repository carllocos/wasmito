# Debugging a Wasm Application

The debugger needs access to debugging information to enable debugging.
Typically applications that compile to WebAssembly produce DWARF or Source Map Specification.
Using either of this debugging information, the debugger extracts the `.debug_lines` from DWARF or the mappings from the Source Map Spec to then produce control-flow graphs.
These CFGs are then used to enable debugging for any language that compiles to Wasm.
For a more detailed explanation on how the debugger works, please read the companion paper:
[A Control-Flow Graph Approach to Language-Agnostic Debugging for Microcontrollers](https://doi.org/10.1145/3759426.3760979)

You can access debugger via the [VSCode plugin](https://github.com/carllocos/WARDuino-VSCode-fork)

To speed up the debugger you can extrac the `.debug_line` or source mappings from the Source Map Spec. See [extracting mappings](#extracting-source-mappings-or-debug-lines)

### Extracting Source Mappings or Debug Lines 

To produce the source mappings, use the `sourcemap` subcommand of the wasmito CLI.
This subcommand extracts from DWARF or the Source Map Specification, the source mappings and stores them as a JSON file.

In the JSON file, each source mapping item has the following structure:
```JSON
{
  "source": "path/to/example.rs",
  "address": 345,
  "linenr": 7,
  "colnr": 19,
}
```

The `address` field is the address of a Wasm instruction into the Wasm module.
That instruction corresponds to the `linenr` and `colnr` in the `source` file.

To produce the source mappings from a Wasm module containing DWARF run the following:

```bash
wcli sourcemap --dwarf path/to/module.wasm mappings.json
````

To produce the source mappings from a Source Map Spec run the following:

```bash
wcli sourcemap --source-spec path/to/module.wasm.map path/to/module.wasm mappings.json
```

#### Cleaning Source Mappings

Since the debugger needs to highlight lines in a source file so the user knows where computation is currently paused.
It makes sense to only include the source mappings into the output JSON for which the `source` field points to a file that is present in the machine where the debugger runs.
Therefore, by default the `sourcemap` command only keeps the mappings that have a `source` field pointing to an existing source file.

However, it could be that the `source` was encoded as a relative path making it hard for the debugger to find the source file.
Or it could be that the Wasm module was compiled on a different machine as the machine used to run the module machine.
Or it could be that some `source` fields point to source files that are of no interest for the developer, such as standard library files.
To cope with this possible issues, it is possible to alter the final stored `source` value in the generated JSON file.

For instance, the AssemblyScript compiler may produce `source` values that may not even point to a source file.
It is important to remove such source mappings.
To do so, you can perform two tasks: (1) identify the source mappings that are irrelevant for debugging and (2) remove them from the mappings.json.

For (1), add the `--all-mappings` flag when producing the source mappings. For instance, run `wcli sourcemap -s spec.wasm.map module.wasm mappings.json --all-mappings`.
Inspect the `sources` field of the `mappings.json`.
From the possible source files identify, the ones that are (ir)relevant.


For (2), create a JSON file that can be used to alter the source mappings. See the `-c` option in the `wlci sourcemap --help` command. An example of such config.json file could be:

```JSON
{
 "ignore": ["path/to/lib/"],
 "prefixSources": "/Abosulte/path/to/toggle_led/"
}
```

The `ignore` field will ignore library source files and the `prefixSources` is added as prefix to each `source` value of `mappings.json`.
The latter field can be used to create absolute paths as needed by the debugger.

For a full list of possible alternations look at the `-c` option of `wcli sourcemap --help`

### Debugging other Debugging Standards
