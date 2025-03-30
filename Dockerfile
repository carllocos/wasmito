FROM ubuntu:latest

RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    cmake \
    nodejs \
    npm \
    vim \
    curl \
    && apt-get clean

WORKDIR /home/debugger/
COPY ./install.sh  ./
COPY ./dim-led/  ./dim-led

RUN git clone https://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@github.com/carllocos/wasmito.git

RUN rm ./wasmito/install.sh && mv ./install.sh ./wasmito #TMP line

Run cd wasmito \
    && bash install.sh

# Run cd ./dim-led \
#   && make clean \
#   && npm install \
#   && make CLI=/home/debugger/wasmito/dist/cjs/cli/cli.cjs

CMD ["bash"]

# packages to remove
# remove curl

## Arduino dependency install
# RUN curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh

# Install Arduino Libs # here the mcu is called esp32:esp32:m5stack_stickc
# python3-serial is needed for arduino-cli  Version: 1.1.1 Commit: fa6eafcb Date: 2024-11-22T09:31:36Z
# RUN arduino-cli core install esp32:esp32 \
#     && arduino-cli lib install "PubSubClient" \
#     && ARDUINO_LIBRARY_ENABLE_UNSAFE_INSTALL=true arduino-cli lib install --git-url https://github.com/adafruit/Adafruit_NeoPixel.git \
#     && apt install python3-serial


# RUN arduino-cli core install esp32:esp32@2.0.3 \
#     && arduino-cli lib install "PubSubClient" \
#     && ARDUINO_LIBRARY_ENABLE_UNSAFE_INSTALL=true arduino-cli lib install --git-url https://github.com/adafruit/Adafruit_NeoPixel.git


# RUN mkdir /root/.ssh/ \
#     && ssh-keyscan github.com >> /root/.ssh/known_hosts


