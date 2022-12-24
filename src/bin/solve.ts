#!/usr/bin/env node
/* eslint-disable no-case-declarations */
import { Canvas, loadImage } from 'canvas'
import * as fs from 'fs'

import * as aStar from '../lib/aStar'
import * as Euclidean from '../lib/euclidean'
import { Graph, Link, LinkParameter, Node } from '../lib/graph'
import { Random } from '../lib/random'

class MyLink extends Link<number> {
  constructor(param: LinkParameter<number>) {
    super(param)
  }
}

class MyNode extends Node<number> {
  static readonly distance = (from: MyNode, to: MyNode) => from.distanceTo(to)

  readonly position: Euclidean.Point

  constructor(param: MyNodeParameter) {
    super(param)
    this.position = Euclidean.Point.convert(param.position)
  }

  get JSON(): string {
    return `{"id":${this.id},"position":${this.position.JSON}}`
  }

  distanceTo(node: MyNode): number {
    return this.position.distanceTo(node.position)
  }

  printLinkTo(node: MyNode): number {
    const distance = this.distanceTo(node)
    process.stdout.write(`\t↓\t${Math.round(distance * 1000) / 1000}\n`)
    return distance
  }

  toString(): string {
    return `${this.id}(${this.position})`
  }
}

type MyNodeParameter = {
  id: number
  position: Euclidean.Point
}

function drawLinks(canvas: Canvas, context: CanvasRenderingContext2D, path: MyNode[]): void {
  process.stdout.write('drawing links...\n')
  for (let i = 1; i < path.length; i++) {
    const [from, to] = [path[i - 1], path[i]]
    process.stdout.write(`\r${from.id} => ${to.id}                `)
    const [f, t] = [from.position, to.position]
    context.beginPath()
    context.strokeStyle = 'rgba(0, 255, 0, 255)'
    context.lineWidth = 1
    context.moveTo((f.x / 4294967295) * canvas.width, (f.y / 4294967295) * canvas.height)
    context.lineTo((t.x / 4294967295) * canvas.width, (t.y / 4294967295) * canvas.height)
    context.stroke()
  }
  process.stdout.write('\r')
}

function drawNodes(arrival: Euclidean.Point, canvas: Canvas, context: CanvasRenderingContext2D, path: MyNode[]): void {
  const colors = ['255, 255, 0', '255, 0, 0']
  const sizes = [2, 5]
  process.stdout.write('drawing nodes...\n')
  for (let i = 0; i < path.length; i++) {
    process.stdout.write(`\r${i}/${path.length}`)
    const p = path[i].position
    const isDepartureOrArrival = i == 0 || p.equal(arrival)
    context.beginPath()
    context.fillStyle = `rgba(${colors[+isDepartureOrArrival]}, 255)`
    context.arc((p.x / 4294967295) * canvas.width, (p.y / 4294967295) * canvas.height, sizes[+isDepartureOrArrival], 0, Math.PI * 2)
    context.fill()
  }
  if (!path.some(node => node.position.equal(arrival))) {
    context.beginPath()
    context.fillStyle = `rgba(${colors[1]}, 255)`
    context.arc((arrival.x / 4294967295) * canvas.width, (arrival.y / 4294967295) * canvas.height, sizes[1], 0, Math.PI * 2)
    context.fill()
  }
  process.stdout.write('\r')
}

async function drawGraphAndPath(arrival: Euclidean.Point, destPath: string, sourcePath: string, path: MyNode[], type: 'png' | 'svg'): Promise<void> {
  process.stdout.write(`loadimg ${sourcePath}...\n`)
  const image = await loadImage(sourcePath)
  const canvas = new Canvas(image.width, image.height, type == 'png' ? 'image' : type)
  const context = canvas.getContext('2d')
  context.drawImage(image, 0, 0, image.width, image.height)
  drawLinks(canvas, context as unknown as CanvasRenderingContext2D, path)
  drawNodes(arrival, canvas, context as unknown as CanvasRenderingContext2D, path)
  process.stdout.write(`compressing image to ${type}...\n`)
  const buffer = canvas.toBuffer()
  process.stdout.write('done\n')
  fs.writeFileSync(destPath, buffer)
}

async function findShortestPath(graph: Graph<number, MyLink, MyNode>, imageDestPath: string, imageSourcePath: string, random: Random.Device): Promise<number> {
  const arrival = graph.nodeById(random.integer % graph['nodes'].size)
  const departure = graph.nodeById(random.integer % graph['nodes'].size)
  process.stdout.write(`finding shortest path from ${departure} to ${arrival}\n`)
  const discovery = aStar.findShortestPath({
    arrivalNodeId: arrival.id,
    departureNodeId: departure.id,
    graph: graph,
    heuristicCost: MyNode.distance
  })
  switch (discovery.result) {
    case 'Found':
      let previousNode: MyNode
      let travelled = 0
      for (const node of discovery.path) {
        travelled += previousNode?.printLinkTo(node) ?? 0
        process.stdout.write(`${node}\n`)
        previousNode = node
      }
      process.stdout.write('\n')
      process.stdout.write(`累計距離: ${Math.round(travelled * 1000) / 1000}\n`)
      process.stdout.write(`直線距離: ${Math.round(departure.distanceTo(arrival) * 1000) / 1000}\n`)
      await drawGraphAndPath(arrival.position, imageDestPath, imageSourcePath, discovery.path, 'png')
      return 0
    case 'No Route':
      console.log(discovery.result)
      await drawGraphAndPath(arrival.position, imageDestPath, imageSourcePath, discovery.path, 'png')
      process.exit(1)
  }
}

let imageDestPath = ''
for (let i = 0; ; i++) {
  imageDestPath = `tsgraph${i}.png`
  if (!fs.existsSync(imageDestPath))
    break
}
let imageSourcePath = 'tsgraph.png'
let jsonPath = 'tsgraph.json'

const argv = process.argv
for (let i = 0; i < argv.length; i++)
  switch (argv[i]) {
    case '-d':
    case '--dest':
    case '--destination':
      imageDestPath = argv[++i]
      break
    case '-j':
    case '--json':
      jsonPath = argv[++i]
      break
    case '-s':
    case '--src':
    case '--source':
      imageSourcePath = argv[++i]
      break
  }

const graph = new Graph({
  linkConstructor: MyLink,
  nodeConstructor: MyNode,
})
process.stdout.write(`loading ${jsonPath}...\n`)
graph.JSON = fs.readFileSync(jsonPath).toString()
findShortestPath(graph, imageDestPath, imageSourcePath, new Random.Device()).then((code: number) => process.exit(code))
