import * as fs from 'fs'

import * as aStar from './aStar'
import * as Euclidean from './euclidean'
import { Graph, Link, LinkParameter, Node } from './graph'
import * as Standard from './standard'

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

async function findShortestPath(graph: Graph<number, MyLink, MyNode>, random: Standard.Random.Device): Promise<number> {
	const arrival = graph.nodeById(random.integer % graph["nodes"].size)
	const departure = graph.nodeById(random.integer % graph["nodes"].size)
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
			return 0
		case 'No Route':
			console.log(discovery.result)
			process.exit(1)
	}
}

let jsonPath = 'tsgraph.json'

const argv = process.argv
for (let i = 0; i < argv.length; i++)
	if (argv[i].split('/').reverse()[0].startsWith('solve.ts')) {
		for (let j = i + 1; j < argv.length; j++)
			switch (argv[j]) {
				case '-j':
				case '--json':
					jsonPath = argv[++j]
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
findShortestPath(graph, new Standard.Random.Device()).then((code: number) => process.exit(code))