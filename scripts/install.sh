#!/bin/sh

# Script to install all the needed libraries for the benchmarks

set -e
LIBS_DIR=$(realpath .)/libs
ARDUINO_DIR=$LIBS_DIR/Arduino
ARDUINO_DIR_ESCAPED=$(echo "$ARDUINO_DIR" | sed 's:/:\\/:g')
ARDUINO_CLI=$ARDUINO_DIR/arduino-cli
ARDUINO_CONFIG=$ARDUINO_DIR/arduino_config.yml
ARDUINO_CONFIG_TEMPLATE=$(realpath .)/templates/arduino_config.yml.template
REPLACE_REGEX='s/%USER_PATH/'${ARDUINO_DIR_ESCAPED}/g
WASMITO_MAKEFILE_TEMPLATE=$(realpath .)/templates/wasmito_makefile

echo "> Installing shared libs in $LIBS_DIR"

echo "> Installing Arduino libs in $ARDUINO_DIR"
echo "> Creating arduino_config with directories.user=$ARDUINO_DIR ESCAPED $ARDUINO_DIR_ESCAPED"

mkdir -p $ARDUINO_DIR
cp $ARDUINO_CONFIG_TEMPLATE $ARDUINO_CONFIG
sed -i.backup $REPLACE_REGEX $ARDUINO_CONFIG
LIBS_DIR_ESCAPED=$(echo "$LIBS_DIR" | sed 's:/:\\/:g')
sed -i.backup 's/%VM_LIB/'${LIBS_DIR_ESCAPED}/g $ARDUINO_CONFIG

curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | BINDIR=$ARDUINO_DIR sh

$ARDUINO_CLI lib install "PubSubClient" --config-file $ARDUINO_CONFIG \
	&& $ARDUINO_CLI lib install --git-url https://github.com/adafruit/Adafruit_NeoPixel.git  --config-file $ARDUINO_CONFIG \
	&& $ARDUINO_CLI lib install --git-url https://github.com/m5stack/M5StickC.git#0.2.9 --config-file $ARDUINO_CONFIG

echo "> WARDuino: fetching submodules"
echo "LIBS_DIR: $LIBS_DIR"
WARDUINO_DIR="$LIBS_DIR/WARDuino/src"
echo "checking if dir exists: $WARDUINO_DIR"
if [ ! -d "$WARDUINO_DIR" ]; then
  echo changing dir to $LIBS_DIR
  cd $LIBS_DIR
  echo cloning WARDuino.git
  git clone https://github.com/carllocos/WARDuino.git
fi

echo "listings libs"
ls $LIBS_DIR
echo "updating WARDuino"
echo "PWD: $(pwd)"
cd $LIBS_DIR/WARDuino
echo "PWD: $(pwd)"
git fetch
git checkout main
git submodule update --init

echo "> WARDuino: building emulator"
mkdir -p build-emu
cd build-emu
cmake .. . -DBUILD_EMULATOR=ON
make

echo "> WARDuino: tmp copy makefile"
rm $LIBS_DIR/WARDuino/platforms/Arduino/Makefile
cp $WASMITO_MAKEFILE_TEMPLATE $LIBS_DIR/WARDuino/platforms/Arduino/Makefile

# build project config file
cd $LIBS_DIR/../ # go to root of project
/bin/sh ./scripts/project_config.sh $LIBS_DIR $ARDUINO_CLI $ARDUINO_CONFIG

npm install && npm run build
