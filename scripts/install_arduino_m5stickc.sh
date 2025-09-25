#!/bin/sh

# Script to install all the needed Arduino libraries to run tests on a M5StickC

set -e

CLI=$(realpath .)/dist/cjs/cli/cli.cjs

node $CLI arduino-cli config add \
    board_manager.additional_urls \
    https://m5stack.oss-cn-shenzhen.aliyuncs.com/resource/arduino/package_m5stack_index.json \
    && node $CLI arduino-cli core install m5stack:esp32@2.0.0