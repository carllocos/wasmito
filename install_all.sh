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

$ARDUINO_CLI core install m5stack:esp32@2.0.0 --config-file $ARDUINO_CONFIG


#$ARDUINO_CLI core install esp32:esp32 \
    #&& ARDUINO_LIBRARY_ENABLE_UNSAFE_INSTALL=true $ARDUINO_CLI lib install --git-url https://github.com/adafruit/Adafruit_NeoPixel.git --save-to ./libs
