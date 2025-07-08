#!/bin/sh

set -e
# The following is specific to the benchmarks

ARDUINO_DIR="$1"
if [ -z $ARDUINO_DIR ]; then
  echo "ARDUINO_DIR is missing"
  exit 1
fi

if [ ! -d "$ARDUINO_DIR" ]; then
  echo "ARDUINO_DIR is not a directory"
  exit 1
fi
ARDUINO_DIR=$(realpath $ARDUINO_DIR)

echo ARDUINO_DIR $ARDUINO_DIR

ARDUINO_CLI="$ARDUINO_DIR/arduino-cli"
ARDUINO_CONFIG="$ARDUINO_DIR/arduino_config.yml"

echo Installing m5stack core platforms....
$ARDUINO_CLI core install m5stack:esp32@2.0.0 --config-file $ARDUINO_CONFIG

