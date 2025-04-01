#!/bin/sh

# Script to install all the needed libraries for the benchmarks

set -e
LIBS_DIR=$(realpath .)/libs
ARDUINO_DIR=$LIBS_DIR/Arduino
ARDUINO_DIR_ESCAPED=$(echo "$ARDUINO_DIR" | sed 's:/:\\/:g')
ARDUINO_CLI=$ARDUINO_DIR/arduino-cli
ARDUINO_CONFIG=$ARDUINO_DIR/arduino_config.yml
ARDUINO_CONFIG_TEMPLATE=$(realpath .)/arduino_config.yml.template
REPLACE_REGEX='s/%USER_PATH/'${ARDUINO_DIR_ESCAPED}/g

echo Installing shared libs in $LIBS_DIR
echo Installing Arduino libs in $ARDUINO_DIR
echo Creating arduino_config with directories.user=$ARDUINO_DIR ESCAPED $ARDUINO_DIR_ESCAPED

mkdir -p $ARDUINO_DIR
cp $ARDUINO_CONFIG_TEMPLATE $ARDUINO_CONFIG
sed -i $REPLACE_REGEX $ARDUINO_CONFIG

curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | BINDIR=$ARDUINO_DIR sh

$ARDUINO_CLI lib install "PubSubClient" --config-file $ARDUINO_CONFIG \
	&& $ARDUINO_CLI lib install --git-url https://github.com/adafruit/Adafruit_NeoPixel.git  --config-file $ARDUINO_CONFIG \
	&& $ARDUINO_CLI lib install --git-url https://github.com/m5stack/M5StickC.git#0.2.9 --config-file $ARDUINO_CONFIG

echo "> WARDuino: fetching submodules"
if [ ! -d "$ARDUINO_DIR/WARDuino" ]; then
  cd $LIBS_DIR
  echo cloning WARDuino.git
  git clone https://github.com/carllocos/WARDuino.git
fi
cd $LIBS_DIR/WARDuino
git fetch
git checkout main
git submodule update --init

echo "> WARDuino: building emulator"
mkdir -p build-emu
cd build-emu
cmake .. . -DBUILD_EMULATOR=ON
make

echo "> WABT: fetching submodules"
if [ ! -d "$LIBS_DIR/wabt" ]; then
  cd $LIBS_DIR
  echo cloning wabt.git
  git clone https://github.com/TOPLLab/wabt.git
fi

cd $LIBS_DIR/wabt
git submodule update --init

echo "> WABT: building tools"
mkdir -p build
cd build
cmake .. . -DBUILD_TESTS=OFF
echo building wat2wasm
make wat2wasm
echo building wasm-objdump
make wasm-objdump

echo "> Wasmito: Creating libs config"
cd $LIBS_DIR/../ # go to root of project
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
echo "WABT=$LIBS_DIR/wabt" >> $SDK_CONFIG_FILE
echo "ARDUINO_CLI=$ARDUINO_CLI" >> $SDK_CONFIG_FILE
echo "ARDUINO_CONFIG=$ARDUINO_CONFIG" >> $SDK_CONFIG_FILE
echo "ARDUINO_LIBS=$LIBS_DIR" >> $SDK_CONFIG_FILE

npm install && npm run build
