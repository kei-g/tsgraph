import { Canvas } from 'canvas'
import * as fs from 'fs'
import { Worker } from 'worker_threads'

import { notnull, sequence } from './common'
import * as Euclidean from './euclidean'
import { NeighborhoodLike } from './neighborhoods'
import * as Standard from './standard'

class LinkGenerator {
	private readonly generated: boolean[]
	private numberOfLinks: number = 0
	private resolve: (value: void | PromiseLike<void>) => void

	constructor(private graph: MyGraphLike, private readonly numberOfNodes: number, private readonly workers: Worker[]) {
		this.generated = this.workers.map(_ => false)
		for (const worker of workers)
			worker.on('message', (message: Message) => this.onReceiveMessage(message))
		setInterval(() => this.resolveWhenGenerated(), 1000)
	}

	private async addLinks(message: Message): Promise<void> {
		for (let i = 0; i < message.link.to.length; i++) {
			const to = message.link.to[i]
			stdout.log(`\r${this.numberOfLinks}: ${message.link.from} => ${to}                `)
			this.graph.links.push(new MyLink(this.numberOfLinks++, message.link.from, to))
			this.graph.links.push(new MyLink(this.numberOfLinks++, to, message.link.from))
		}
	}

	private async enqueueMessage(index: number, message: Message): Promise<void> {
		this.workers[index].postMessage(message)
	}

	generate(): Promise<void> {
		return new Promise<void>(resolve => {
			this.resolve = resolve
			stdout.log("generating links...\n")
			const promises: Promise<void>[] = []
			for (let i = 0; i < this.numberOfNodes; i++)
				promises.push(this.enqueueMessage(i % this.workers.length, { generateLink: { from: i } }))
			Promise.all(promises).then(_ => this.terminateWorkers())
		})
	}

	private async onReceiveMessage(message: Message): Promise<void> {
		if (message.end)
			this.generated[message.end.workerIndex - 1] = true
		else if (message.link)
			this.addLinks(message)
		else if (message.neighborhoods)
			this.redirectMessage(message)
	}

	private async redirectMessage(message: Message): Promise<void> {
		for (let i = 0; i < this.workers.length; i++)
			if (!this.generated[i])
				this.enqueueMessage(i, { neighborhoods: message.neighborhoods.filter(neighbor => neighbor.index % this.workers.length == i) })
	}

	private resolveWhenGenerated(): void {
		if (this.generated.every(notnull)) {
			stdout.log(`\r${this.numberOfLinks} links have been generated\n`)
			this.resolve()
		}
	}

	private terminateWorkers(): void {
		for (const worker of this.workers)
			worker.postMessage({ terminate: true })
	}
}

type Message = {
	end?: {
		workerIndex: number
	}
	generateLink?: {
		from: number
	}
	link?: {
		from: number
		to: Uint32Array
	}
	neighborhoods?: NeighborhoodLike[]
}

class MyGraphLike {
	readonly links: MyLink[] = []
	readonly nodes: MyNode[] = []

	get JSON(): string {
		const nodes: string[] = []
		for (const node of this.nodes)
			nodes.push(node.JSON)
		const links: string[] = []
		for (const link of this.links)
			links.push(link.JSON)
		return `{"graph":{"nodes":[${nodes.join(",")}],"links":[${links.join(",")}]}}`
	}
}

class MyLink {
	constructor(readonly id: number, readonly from: number, readonly to: number) {
	}

	get JSON(): string {
		return `{"id":${this.id},"from":${this.from},"to":${this.to}}`
	}
}

class MyNode {
	constructor(readonly id: number, readonly position: Euclidean.Point) {
	}

	get JSON(): string {
		return `{"id":${this.id},"position":${this.position.JSON}}`
	}
}

function drawLinks(context: CanvasRenderingContext2D, graph: MyGraphLike, size: number): void {
	const hist = new Set<number[]>()
	stdout.log('drawing links...\n')
	for (let i = 0; i < graph.links.length; i++) {
		const link = graph.links[i]
		const [from, to] = [link.from, link.to]
		const p = [Math.min(from, to), Math.max(from, to)]
		if (!hist.has(p)) {
			hist.add(p)
			stdout.log(`\r${i}/${graph.links.length}`)
			const [f, t] = [graph.nodes[from].position, graph.nodes[to].position]
			context.beginPath()
			context.strokeStyle = 'rgba(96, 96, 96, 255)'
			context.lineWidth = 1
			context.moveTo((f.x / 4294967295) * size, (f.y / 4294967295) * size)
			context.lineTo((t.x / 4294967295) * size, (t.y / 4294967295) * size)
			context.stroke()
		}
	}
	stdout.log('\r')
}

function drawNodes(context: CanvasRenderingContext2D, nodes: Euclidean.Point[], size: number): void {
	stdout.log('drawing nodes...\n')
	for (let i = 0; i < nodes.length; i++) {
		stdout.log(`\r${i}/${nodes.length}`)
		const p = nodes[i]
		context.beginPath()
		context.fillStyle = `rgba(255, 255, 255, 255)`
		context.arc((p.x / 4294967295) * size, (p.y / 4294967295) * size, 2, 0, Math.PI * 2)
		context.fill()
	}
	stdout.log('\r')
}

function drawGraph(filePath: string, graph: MyGraphLike, nodes: Euclidean.Point[], size: number, type: 'png' | 'svg'): void {
	const canvas = new Canvas(size, size, type == 'png' ? 'image' : type)
	const context = canvas.getContext('2d')
	context.fillStyle = 'rgba(0, 0, 0, 255)'
	context.fillRect(0, 0, canvas.width, canvas.height)
	drawLinks(context, graph, size)
	drawNodes(context, nodes, size)
	stdout.log(`compressing to ${type}...\n`)
	const buffer = canvas.toBuffer()
	stdout.log('done\n')
	fs.writeFileSync(filePath, buffer)
}

function generateNodes(graph: MyGraphLike, numberOfNodes: number, random: Standard.Random.Device): Euclidean.Point[] {
	stdout.log("generating nodes...\n")
	const positions: Euclidean.Point[] = []
	for (let i = 0; i < numberOfNodes; i++) {
		const position = Euclidean.Point.from(random)
		positions.push(position)
		graph.nodes.push(new MyNode(i, position))
		stdout.log(`\r${i}/${numberOfNodes}`)
	}
	stdout.log(`\r${numberOfNodes} nodes have been generated\n`)
	return positions
}

function spawnWorkerThreads(numberOfThreads: number, positions: Euclidean.Point[]): Worker[] {
	stdout.log("spawning worker threads...\n")
	const workers = sequence(numberOfThreads).map(index => {
		stdout.log(`\r${index + 1}/${numberOfThreads}`)
		return new Worker(__dirname + '/worker.js', {
			workerData: {
				index: index + 1,
				numberOfThreads: numberOfThreads,
				positions: positions,
			}
		})
	})
	stdout.log(`\r${workers.length} threads have been spawned\n`)
	return workers
}

let imagePath = 'tsgraph.png'
let imageSize = 8192
let jsonPath = 'tsgraph.json'
let numNodes = 65536
let numThreads = 16
const argv = process.argv
for (let i = 0; i < argv.length; i++)
	if (argv[i].split('/').reverse()[0].startsWith('generate.ts')) {
		for (let j = i + 1; j < argv.length; j++) {
			switch (argv[j]) {
				case '-i':
				case '--image':
				case '--image-path':
					imagePath = argv[++j]
					break
				case '-j':
				case '--json':
				case '--json-path':
					jsonPath = argv[++j]
					break
				case '-n':
				case '--nodes':
				case '--number-of-nodes':
					numNodes = +argv[++j]
					break
				case '-s':
				case '--image-size':
				case '--size':
					imageSize = +argv[++j]
					break
				case '-t':
				case '--threads':
				case '--number-of-threads':
					numThreads = +argv[++j]
					break
			}
		}
		break
	}

const graph = new MyGraphLike()
const random = new Standard.Random.Device()
const stdout = new Standard.Output()
const nodes = generateNodes(graph, numNodes, random)
const workers = spawnWorkerThreads(numThreads, nodes)
const linkGenerator = new LinkGenerator(graph, numNodes, workers)
linkGenerator.generate().then(() => {
	fs.writeFileSync(jsonPath, graph.JSON)
	drawGraph(imagePath, graph, nodes, imageSize, 'png')
	process.exit(0)
})
