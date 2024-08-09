#!/bin/sh

set -e

echo "> WasmiTo: installing"
yarn install

echo "> WasmiTo: fetching submodules"
git submodule update --init

echo "> WARDuino: fetching submodules"
cd libs/WARDuino
git fetch
git checkout main
git submodule update --init

echo "> WARDuino: building emulator"
mkdir -p build-emu
cd build-emu
cmake .. . -DBUILD_EMULATOR=ON
make
cd ../../

echo "> WABT: fetching submodules"
cd wabt 
git submodule update --init

echo "> WABT: building tools"
mkdir -p build
cd build
cmake ..
make wat2wasm
cd ../../


echo "> Wasmito: Creating libs config"
cd ../ # go to root of project
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

LIBS_PATH=$(eval pwd)/libs
echo "WARDUINO_SDK=$LIBS_PATH/WARDuino" >> $SDK_CONFIG_FILE
echo "WABT=$LIBS_PATH/wabt" >> $SDK_CONFIG_FILE