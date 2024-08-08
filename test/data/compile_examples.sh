#!/bin/bash

echo ------------------------
echo Compile Rust examples

RUST_PATH="$(pwd)/test/data/rust_examples"

find "$RUST_PATH" -type d | while read -r dir; do
    find "$dir" -maxdepth 1 -type f -name "*.rs" | while read -r file; do
        wasmPath="${file%.rs}.wasm"
        rustc -C link-self-contained=no \
              -C link-args=--no-entry -C link-args=-zstack-size=32768 \
              --target wasm32-unknown-unknown -g -o $wasmPath $file
    done
done
