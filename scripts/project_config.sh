#!/bin/sh

set -e
echo "> Wasmito: Creating libs config"
LIBS_DIR=$1
ARDUINO_CLI=$2
ARDUINO_CONFIG=$3
WASM_TOOLS=$4

WASMITO_DIR=.wasmito
if [ ! -d "$WASMITO_DIR" ]; then
    mkdir "$WASMITO_DIR"
    echo "Directory '$WASMITO_DIR' created."
else
    echo "Directory '$WASMITO_DIR' already exists."
fi

SDK_CONFIG_FILE=".wasmito/sdk_config.cfg"
if [ ! -f "$SDK_CONFIG_FILE" ]; then
    touch $SDK_CONFIG_FILE
    echo "File '$SDK_CONFIG_FILE' created."
else
    echo "File '$SDK_CONFIG_FILE' already exists."
fi

echo "WARDUINO_SDK=$LIBS_DIR/WARDuino" >> $SDK_CONFIG_FILE
echo "ARDUINO_CLI=$ARDUINO_CLI" >> $SDK_CONFIG_FILE
echo "ARDUINO_CONFIG=$ARDUINO_CONFIG" >> $SDK_CONFIG_FILE
echo "WASM_TOOLS=$WASM_TOOLS" >> $SDK_CONFIG_FILE