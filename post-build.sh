#!/bin/sh

[ -d bin ] || mkdir bin || exit 1

cd build && find bin -type f | while read name; do
  echo '#!/usr/bin/env node' > ../$name || exit 1
  npx terser $name --compress --mangle >> ../$name || exit 1
  chmod +x ../$name || exit 1
done

cd ..

[ -d lib ] || mkdir lib || exit 1

cd build && find lib -type f | while read name; do
  npx terser $name --compress --mangle > ../$name || exit 1
done

cd ..

cd build && find . -maxdepth 1 -type f | while read name; do
  echo '#!/usr/bin/env node' > ../$name || exit 1
  npx terser $name --compress --mangle >> ../$name || exit 1
  chmod +x ../$name || exit 1
done

cd ..
