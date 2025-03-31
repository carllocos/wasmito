# DOCKERFILE of Benchmarks

FROM ubuntu:latest

RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    cmake \
    nodejs \
    npm \
    vim \
    curl \
    python3-serial \
    && apt-get clean
# TODO remove curl, vim

# add python to $PATH
RUN ln -s /usr/bin/python3.12 /usr/bin/python

# keys needed to clone repos
#RUN mkdir /root/.ssh/ \
  #&& ssh-keyscan github.com >> /root/.ssh/known_hosts

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
# TODO END: replace next with copy recursive project

# install shared library across benchmarks
RUN bash install_all.sh


# install benchmark debug operations performance
WORKDIR /benchmarks/debug_ops/
COPY ./install_bench_debug_ops.sh  ./
RUN bash install_bench_debug_ops.sh /benchmarks/libs/wasmito/libs/Arduino/

#COPY ./install.sh  ./
#COPY ./dim-led/  ./dim-led

#RUN git clone https://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@github.com/carllocos/wasmito.git

#RUN rm ./wasmito/install.sh && mv ./install.sh ./wasmito #TMP line

#Run cd wasmito \
#&& bash install.sh

# Run cd ./dim-led \
#   && make clean \
#   && npm install \
#   && make CLI=/home/debugger/wasmito/dist/cjs/cli/cli.cjs

CMD ["bash"]


