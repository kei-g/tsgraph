#!/usr/bin/env node
import { argv } from 'process'

for (let i = 0; i < argv.length; i++)
  switch (argv[i]) {
  case 'generate':
    require('./bin/generate.js')
    break
  case 'help':
    console.log(`tsgraph (operation) [options]

\u001b[1mSYNOPSIS\u001b[m
  tsgraph generate [options]

  tsgraph help

  tsgraph solve [options]

\u001b[1mOPTIONS\u001b[m
  --image, --image-path, -i
    a file path to store picture
    this option is available only for \u001b[4mgenerate\u001b[m

    default: 'tsgraph.png'

  --json, --json-path, -j
    a file path to store graph
    this option is available only for \u001b[4mgenerate\u001b[m

    default: 'tsgraph.json'

  --nodes, --number-of-nodes, -n
    a number of nodes to generate
    this option is available only for \u001b[4mgenerate\u001b[m

    default: 65536

  --size, --image-size, -s
    a resolution of the picture
    this means width and height
    this option is available only for \u001b[4mgenerate\u001b[m

    default: 8192

  --threads, --number-of-threads, -t
    a number of threads to generate links concurrently
    this option is available only for \u001b[4mgenerate\u001b[m

    default: 16

  --dest, --destination, -d
    a file path to save picture
    if this option was omitted, the path is suggested such as 'tsgraph0.png', 'tsgraph1.png', ...
    this option is available only for \u001b[4msolve\u001b[m

    default: 'tsgraph{0-}.png'

  --json ,-j
    a source file path of graph to solve
    this option is available only for \u001b[4msolve\u001b[m

    default: 'tsgraph.json'

  --src, --source, -s
    a source picture file path of graph to solve
    this option is available only for \u001b[4msolve\u001b[m

    default: 'tsgraph.png'
`)
    break
  case 'solve':
    require('./bin/solve.js')
    break
  }
