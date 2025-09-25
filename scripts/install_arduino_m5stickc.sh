#!/bin/sh

# Script to install all the needed Arduino libraries to run tests on a M5StickC

set -e

CLI=$(realpath .)/dist/cjs/cli/cli.cjs
#TODO add additional url into config then install
# url: https://m5stack.oss-cn-shenzhen.aliyuncs.com/resource/arduino/package_m5stack_index.json
# remove also the additional url from template
node $CLI arduino-cli core install m5stack:esp32@2.0.0