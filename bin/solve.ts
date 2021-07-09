/* eslint-disable no-case-declarations */
import { Canvas, loadImage } from 'canvas'
import * as fs from 'fs'

import * as aStar from '../lib/aStar'
import * as Euclidean from '../lib/euclidean'
import { Graph, Link, LinkParameter, Node } from '../lib/graph'
import * as Standard from '../lib/standard'

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
    stdout.log(`\t↓\t${Math.round(distance * 1000) / 1000}\n`)
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
  stdout.log('drawing links...\n')
  for (let i = 1; i < path.length; i++) {
    const [from, to] = [path[i - 1], path[i]]
    stdout.log(`\r${from.id} => ${to.id}                `)
    const [f, t] = [from.position, to.position]
    context.beginPath()
    context.strokeStyle = 'rgba(0, 255, 0, 255)'
    context.lineWidth = 1
    context.moveTo((f.x / 4294967295) * canvas.width, (f.y / 4294967295) * canvas.height)
    context.lineTo((t.x / 4294967295) * canvas.width, (t.y / 4294967295) * canvas.height)
    context.stroke()
  }
  stdout.log('\r')
}

function drawNodes(arrival: Euclidean.Point, canvas: Canvas, context: CanvasRenderingContext2D, path: MyNode[]): void {
  const colors = ['255, 255, 0', '255, 0, 0']
  const sizes = [2, 5]
  stdout.log('drawing nodes...\n')
  for (let i = 0; i < path.length; i++) {
    stdout.log(`\r${i}/${path.length}`)
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
  stdout.log('\r')
}

async function drawGraphAndPath(arrival: Euclidean.Point, destPath: string, sourcePath: string, path: MyNode[], type: 'png' | 'svg'): Promise<void> {
  stdout.log(`loadimg ${sourcePath}...\n`)
  const image = await loadImage(sourcePath)
  const canvas = new Canvas(image.width, image.height, type == 'png' ? 'image' : type)
  const context = canvas.getContext('2d')
  context.drawImage(image, 0, 0, image.width, image.height)
  drawLinks(canvas, context, path)
  drawNodes(arrival, canvas, context, path)
  stdout.log(`compressing image to ${type}...\n`)
  const buffer = canvas.toBuffer()
  stdout.log('done\n')
  fs.writeFileSync(destPath, buffer)
}

async function findShortestPath(graph: Graph<number, MyLink, MyNode>, imageDestPath: string, imageSourcePath: string, random: Standard.Random.Device): Promise<number> {
  const arrival = graph.nodeById(random.integer % graph['nodes'].size)
  const departure = graph.nodeById(random.integer % graph['nodes'].size)
  stdout.log(`finding shortest path from ${departure} to ${arrival}\n`)
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
      stdout.log(`${node}\n`)
      previousNode = node
    }
    stdout.log('\n')
    stdout.log(`累計距離: ${Math.round(travelled * 1000) / 1000}\n`)
    stdout.log(`直線距離: ${Math.round(departure.distanceTo(arrival) * 1000) / 1000}\n`)
    await drawGraphAndPath(arrival.position, imageDestPath, imageSourcePath, discovery.path, 'png')
    return 0
  case 'No Route':
    console.log(discovery.result)
    await drawGraphAndPath(arrival.position, imageDestPath, imageSourcePath, discovery.path, 'png')
    process.exit(1)
  }
}

let imageDestPath = ''
for (let i = 0;; i++) {
  imageDestPath = `tsgraph${i}.png`
  if (!fs.existsSync(imageDestPath))
    break
}
let imageSourcePath = 'tsgraph.png'
let jsonPath = 'tsgraph.json'

const argv = process.argv
for (let i = 0; i < argv.length; i++)
  if (argv[i].split('/').reverse()[0].startsWith('solve.ts')) {
    for (let j = i + 1; j < argv.length; j++)
      switch (argv[j]) {
      case '-d':
      case '--dest':
      case '--destination':
        imageDestPath = argv[++j]
        break
      case '-j':
      case '--json':
        jsonPath = argv[++j]
        break
      case '-s':
      case '--src':
      case '--source':
        imageSourcePath = argv[++j]
        break
      }
    break
  }

const graph = new Graph({
  linkConstructor: MyLink,
  nodeConstructor: MyNode,
})
const stdout = new Standard.Output()
stdout.log(`loading ${jsonPath}...\n`)
graph.JSON = fs.readFileSync(jsonPath).toString()
findShortestPath(graph, imageDestPath, imageSourcePath, new Standard.Random.Device()).then((code: number) => process.exit(code))
