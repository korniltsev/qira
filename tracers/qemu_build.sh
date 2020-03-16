#!/bin/bash -e

if [ ! -d qemu/qemu ]; then
  cd qemu
#  git clone https://github.com/geohot/qemu.git --depth 1 --branch qira
  git clone https://github.com/korniltsev/qemu.git --depth 1 --branch qira # tiny fixes to compile on kali
  cd ..
fi

cd qemu/qemu
export QEMU_CFLAGS="-Wno-error=sizeof-pointer-div -Wno-error=address-of-packed-member -Wno-error=stringop-truncation" # todo proper fix
./configure --target-list=i386-linux-user,x86_64-linux-user,arm-linux-user,ppc-linux-user,aarch64-linux-user,mips-linux-user,mipsel-linux-user --enable-tcg-interpreter --enable-debug-tcg --cpu=unknown --python=python
make -j$(getconf _NPROCESSORS_ONLN) 
