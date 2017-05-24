FROM node:4-onbuild
MAINTAINER Kirsten Hunter (khunter@akamai.com)
RUN apt-get update
RUN apt-get install -y curl patch gawk g++ gcc make libc6-dev patch libreadline6-dev zlib1g-dev libssl-dev libyaml-dev autoconf libgdbm-dev libncurses5-dev automake libtool bison pkg-config libffi-dev
RUN apt-get install -y -q libssl-dev python-all wget vim
ADD . /opt
RUN npm install
RUN npm install -g n; n 5.0.0
RUN git clone https://github.com/akamai-open/api-kickstart
RUN git clone https://github.com/stedolan/jq.git
RUN cd jq
RUN autoreconf -i
RUN ./configure --disable-maintainer-mode
RUN make install
