# DOCKERFILE of Benchmarks

FROM ubuntu:latest

RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    cmake \
    vim \
    curl \
    python3-serial \
    && apt-get clean
# TODO remove curl, vim
# add python to $PATH
RUN ln -s /usr/bin/python3.12 /usr/bin/python

# Install rust & cargo binaries installer
RUN curl https://sh.rustup.rs -sSf | bash -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"
RUN curl -L --proto '=https' --tlsv1.2 -sSf https://raw.githubusercontent.com/cargo-bins/cargo-binstall/main/install-from-binstall-release.sh | bash -s -- -y

# install latest node and npm
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.2/install.sh | bash
ENV NODE_VERSION=22.14.0
ENV NVM_DIR=/root/.nvm
RUN . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm use v${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm alias default v${NODE_VERSION}
ENV PATH="/root/.nvm/versions/node/v${NODE_VERSION}/bin/:${PATH}"

WORKDIR /benchmarks/libs/wasmito
# TODO START: replace next with copy recursive project
COPY ./src/ ./src
COPY ./cli/ ./cli
#COPY ./libs/ ./libs
COPY ./package.json .
COPY ./package-lock.json .
COPY ./tool_examples ./tool_examples
COPY ./wasmito_tester ./wasmito_tester/
COPY ./mocha.opts .
COPY ./tsconfig-esm.json .
COPY ./tsconfig.json .
COPY ./install_all.sh  ./
COPY ./arduino_config.yml.template  ./arduino_config.yml.template
COPY ./.git ./.git
COPY ./.gitmodules .
COPY ./scripts/ ./scripts/
# TODO END: replace next with copy recursive project

# install shared library across benchmarks
RUN bash install_all.sh

# Installation Instructions for Benchmarking
RUN rm /benchmarks/libs/wasmito/libs/WARDuino/platforms/Arduino/Makefile
COPY ./warduino_makefile /benchmarks/libs/wasmito/libs/WARDuino/platforms/Arduino/Makefile
WORKDIR /benchmarks/debug_ops/
COPY ./install_m5stack_libs.sh  ./
RUN alias wcli="node /benchmarks/libs/wasmito/dist/cjs/cli/cli.cjs"
RUN alias arduino-cli=/benchmarks/libs/wasmito/libs/Arduino/arduino-cli
RUN alias arduino_config="--config-file /benchmarks/libs/wasmito/libs/Arduino/arduino_config.yml"

RUN bash install_m5stack_libs.sh /benchmarks/libs/wasmito/libs/Arduino/ /benchmarks/libs/wasmito/dist/cjs/cli/cli.cjs

#COPY ./dim/src  ./src
#COPY ./dim/wasm  ./wasm
# Run cd ./dim-led \
#   && make clean \
#   && npm install \
#   && make CLI=/home/debugger/wasmito/dist/cjs/cli/cli.cjs

CMD ["bash"]
