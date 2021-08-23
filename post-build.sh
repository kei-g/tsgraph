#!/bin/sh

[ -d bin ] || mkdir bin || exit 1
[ -d lib ] || mkdir lib || exit 1

cd build && find . -type f | while read name; do
  npx terser $name -c -m -o ../$name --toplevel || exit 1
done

cd ..
