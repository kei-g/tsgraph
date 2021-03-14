import * as aStar from './aStar'
import * as Euclidean from './euclidean'
import { Graph, Link, LinkParameter, Node } from './graph'
import { NeighborhoodArray } from './neighborhoods'
import * as Standard from './standard'

const stdout = new Standard.Output()
stdout.log("launched\n")

class MyLink extends Link<number> {
	constructor(param: LinkParameter<number>) {
		super(param)
	}
}

class MyNode extends Node<number> {
	static readonly distance = (from: MyNode, to: MyNode) => from.distanceTo(to)

	readonly name: string
	readonly position: Euclidean.Point

	constructor(param: MyNodeParameter) {
		super(param)
		this.name = param.name
		this.position = param.position
	}

	distanceTo(node: MyNode): number {
		return this.position.distanceTo(node.position)
	}

	neighborhoods(limit: number, positions: Euclidean.Point[]): number[] {
		const neighborhoods = new NeighborhoodArray()
		for (let i = 0; i < positions.length; i++)
			if (i != this.id)
				neighborhoods.process(this.position.squareOfDistanceTo(positions[i]), i, limit)
		return neighborhoods.map(n => n.index)
	}

	printLinkTo(node: MyNode): number {
		const distance = this.position.distanceTo(node.position)
		stdout.log(`\t↓\t${Math.round(distance * 1000) / 1000}\n`)
		return distance
	}

	toString(): string {
		return `${this.name}(${this.position})`
	}
}

type MyNodeParameter = {
	id: number
	name: string
	position: Euclidean.Point
}

const NumberOfNodes = 16384

const graph = new Graph({
	linkConstructor: MyLink,
	nodeConstructor: MyNode,
})
const names: string[] = []
const positions: Euclidean.Point[] = []
const random = new Standard.Random.Device()
stdout.log("generating nodes...\n")
for (let i = 0; i < NumberOfNodes; i++) {
	const name = random.string
	const position = Euclidean.Point.from(random)
	names.push(name)
	positions.push(position)
	graph.addNode({ id: i, name: name, position: position })
	stdout.log(`\r${i}/${NumberOfNodes}`)
}
stdout.log(`\r${NumberOfNodes} nodes have been generated\n`)

stdout.log("generating links...\n")
let j: number = 0
for (let i = 0; i < NumberOfNodes; i++) {
	const limit = (random.integer % 2) + 2
	for (const neighbor of graph.nodeById(i).neighborhoods(limit, positions)) {
		graph.addLink({ id: j++, from: i, to: neighbor })
		graph.addLink({ id: j++, from: neighbor, to: i })
	}
	stdout.log(`\rnodes: ${i}, links: ${j}`)
}
stdout.log(`\r${j} links have been generated\n`)

const arrival = graph.nodeById(random.integer % names.length)
const departure = graph.nodeById(random.integer % names.length)
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
		let travelled: number = 0
		for (const node of discovery.path) {
			travelled += previousNode?.printLinkTo(node) ?? 0
			stdout.log(`${node}\n`)
			previousNode = node
		}
		stdout.log("\n")
		stdout.log(`累計距離: ${Math.round(travelled * 1000) / 1000}\n`)
		stdout.log(`直線距離: ${Math.round(departure.distanceTo(arrival) * 1000) / 1000}\n`)
		process.exit(0)
	case 'No Route':
		console.log(discovery.result)
		process.exit(1)
}