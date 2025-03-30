#!/bin/sh

set -e

echo "> WasmiTo: fetching submodules"
git submodule update --init


#RUN curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh
echo "> Wasmito: Installing Arduino Dependency"
ARDUINO_DIR=./libs/arduino-cli/bin
ARDUINO_CLI=$(ARDUINO_DIR)/arduino-cli
curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | BINDIR=$ARDUINO_DIR sh

$ARDUINO_CLI core install esp32:esp32 \
    && $ARDUINO_CLI lib install "PubSubClient" --save-to ./libs \
    && ARDUINO_LIBRARY_ENABLE_UNSAFE_INSTALL=true $ARDUINO_CLI lib install --git-url https://github.com/adafruit/Adafruit_NeoPixel.git --save-to ./libs
#
# Check if the OS is Linux
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    apt install python3-serial
elif [[ "$OSTYPE" == "darwin"* ]]; then
  echo "OSX"
else
  echo "Unsupported OS"
fi


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
cmake .. . -DBUILD_TESTS=OFF
echo building wat2wasm
make wat2wasm
echo building wasm-objdump
make wasm-objdump
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

npm install && npm run build
