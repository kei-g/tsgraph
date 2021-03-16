import * as aStar from './aStar'
import { Coordinate, distanceWGS84 } from './coordinate'
import { Degree } from './coordinateUnit'
import { Graph, Link, LinkParameter, Node } from './graph'

class MyLink extends Link<number> {
	constructor(param: LinkParameter<number>) {
		super(param)
	}
}

type MyNodeParameter = {
	coordinate: Coordinate<Degree>
	id: number
	name: string
}

class MyNode extends Node<number> {
	static readonly distance = (from: MyNode, to: MyNode) => from.distanceTo(to)

	readonly coordinate: Coordinate<Degree>
	readonly name: string

	constructor(param: MyNodeParameter) {
		super(param)
		this.coordinate = new Coordinate<Degree>(param.coordinate)
		this.name = param.name
	}

	get JSON(): string {
		return `{"id":${this.id},"name":"${this.name}","coordinate":${this.coordinate.JSON}}`
	}

	distanceTo(node: MyNode): number {
		return distanceWGS84(this.coordinate.Radian, node.coordinate.Radian)
	}

	printLinkTo(node: MyNode): number {
		const distance = this.distanceTo(node)
		console.log(`\t↓\t${Math.round(distance * 1000) / 1000}\n`)
		return distance
	}

	toString(): string {
		return `${this.name}(${this.coordinate})`
	}
}

const graph = new Graph({
	linkConstructor: MyLink,
	nodeConstructor: MyNode,
})

graph.addNode({ id: 1, coordinate: { latitude: 35.2959786, longitude: 135.1162364, unit: Degree }, name: "福知山駅" })
graph.addNode({ id: 2, coordinate: { latitude: 33.590188, longitude: 130.420685, unit: Degree }, name: "博多駅" })
graph.addNode({ id: 3, coordinate: { latitude: 34.397667, longitude: 132.4731899, unit: Degree }, name: "広島駅" })
graph.addNode({ id: 4, coordinate: { latitude: 34.7062884, longitude: 135.1932788, unit: Degree }, name: "新神戸駅" })
graph.addNode({ id: 5, coordinate: { latitude: 33.8869653, longitude: 130.8125353, unit: Degree }, name: "小倉駅" })
graph.addNode({ id: 6, coordinate: { latitude: 34.9850014, longitude: 135.7579708, unit: Degree }, name: "京都駅" })
graph.addNode({ id: 7, coordinate: { latitude: 35.4640295, longitude: 133.061707, unit: Degree }, name: "松江駅" })
graph.addNode({ id: 8, coordinate: { latitude: 35.170915, longitude: 136.881537, unit: Degree }, name: "名古屋駅" })
graph.addNode({ id: 9, coordinate: { latitude: 34.6661212, longitude: 133.9155448, unit: Degree }, name: "岡山駅" })
graph.addNode({ id: 10, coordinate: { latitude: 35.9062039, longitude: 139.6237359, unit: Degree }, name: "大宮駅" })
graph.addNode({ id: 11, coordinate: { latitude: 34.7334658, longitude: 135.498066, unit: Degree }, name: "新大阪駅" })
graph.addNode({ id: 12, coordinate: { latitude: 43.068564, longitude: 141.3507138, unit: Degree }, name: "札幌駅" })
graph.addNode({ id: 13, coordinate: { latitude: 33.9505767, longitude: 130.919912, unit: Degree }, name: "下関駅" })
graph.addNode({ id: 14, coordinate: { latitude: 34.972187, longitude: 138.3867118, unit: Degree }, name: "静岡駅" })
graph.addNode({ id: 15, coordinate: { latitude: 35.6812362, longitude: 139.7649361, unit: Degree }, name: "東京駅" })
graph.addNode({ id: 16, coordinate: { latitude: 35.4939993, longitude: 134.2237078, unit: Degree }, name: "鳥取駅" })
graph.addNode({ id: 17, coordinate: { latitude: 34.7629201, longitude: 137.3797326, unit: Degree }, name: "豊橋駅" })
graph.addNode({ id: 18, coordinate: { latitude: 35.5068084, longitude: 139.615388, unit: Degree }, name: "新横浜駅" })

graph.addLink({ id: 1, from: 2, to: 5 })
graph.addLink({ id: 2, from: 5, to: 13 })
graph.addLink({ id: 3, from: 13, to: 7 })
graph.addLink({ id: 4, from: 7, to: 16 })
graph.addLink({ id: 5, from: 16, to: 1 })
graph.addLink({ id: 6, from: 1, to: 6 })
graph.addLink({ id: 7, from: 13, to: 3 })
graph.addLink({ id: 8, from: 3, to: 9 })
graph.addLink({ id: 9, from: 9, to: 4 })
graph.addLink({ id: 10, from: 4, to: 11 })
graph.addLink({ id: 11, from: 11, to: 6 })
graph.addLink({ id: 12, from: 6, to: 8 })
graph.addLink({ id: 13, from: 8, to: 17 })
graph.addLink({ id: 14, from: 17, to: 14 })
graph.addLink({ id: 15, from: 14, to: 18 })
graph.addLink({ id: 16, from: 18, to: 15 })
graph.addLink({ id: 17, from: 15, to: 10 })
graph.addLink({ id: 18, from: 10, to: 12 })

const arrival = graph.nodeById(12)
const departure = graph.nodeById(2)

const discovery = aStar.findShortestPath({
	arrivalNodeId: arrival.id,
	departureNodeId: departure.id,
	graph: graph,
	heuristicCost: MyNode.distance,
})
switch (discovery.result) {
	case 'Found':
		let previousNode: MyNode
		let travelled: number = 0
		for (const node of discovery.path) {
			travelled += previousNode?.printLinkTo(node) ?? 0
			console.log(`${node}`)
			previousNode = node
		}
		console.log()
		console.log(`累計距離: ${travelled / 1000}(km)`)
		console.log(`直線距離: ${departure.distanceTo(arrival) / 1000}(km)`)
		process.exit(0)
	case 'No Route':
		process.exit(1)
}
