#bin/bash

# decode esp32 trace
# before running this script run get_idf

pathToElf=$1
shift

for backtrace in "$@"; do
    xtensa-esp32-elf-addr2line -pfiaC -e $pathToElf $backtrace
done
