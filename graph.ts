import { DuplicateException } from './common'

export abstract class Node<T> implements NodeParameter<T> {
	readonly graph: Graph<T, any, this>
	readonly id: T

	constructor(param: NodeParameter<T>) {
		this.graph = param?.graph
		this.id = param.id
	}
}

export class Graph<T, L extends Link<T>, N extends Node<T>> extends Node<T> {
	private readonly linkConstructor: { new(param: LinkParameter<T> | string): L }
	private readonly links = new Map<T, L>()
	private readonly linkIdsGroupedByFromNodeId = new Map<T, T[]>()
	private readonly nodeConstructor: { new(param: NodeParameter<T> | string): N }
	private readonly nodes = new Map<T, N>()

	constructor(param: GraphParameter<T, N, L>) {
		super({ id: param?.id })
		this.linkConstructor = param.linkConstructor
		this.nodeConstructor = param.nodeConstructor
	}

	addLink<LP extends LinkParameter<T>>(param: LP): boolean {
		const canAdd: boolean = this.canAdd(param)
		if (canAdd) {
			const link = new this.linkConstructor(param)
			this.links.set(param.id, link)
			this.groupByFromNodeId(link)
		}
		return canAdd
	}

	addNode<NP extends NodeParameter<T>>(param: NP): void {
		if (this.nodes.has(param.id))
			throw new Error(`Duplicate node by ${param.id}`)
		param.graph = this
		const node = new this.nodeConstructor(param)
		this.nodes.set(param.id, node)
	}

	canAdd<LP extends LinkParameter<T>>(param: LP): boolean {
		if (this.links.has(param.id))
			throw new DuplicateException(param.id)
		return this.nodes.has(param.from) && this.nodes.has(param.to)
	}

	confirmNodes<LP extends LinkParameter<T>>(param: LP): void {
		if (!this.nodes.has(param.from))
			throw `No node specified by from ${param.from}`
		if (!this.nodes.has(param.to))
			throw `No node specified by to ${param.to}`
	}

	private groupByFromNodeId(link: L): void {
		this.linkIdsGroupedByFromNodeId.has(link.from) ?
			this.linkIdsGroupedByFromNodeId.get(link.from).push(link.id) :
			this.linkIdsGroupedByFromNodeId.set(link.from, [link.id])
	}

	linksAheadOf(nodeId: T): Iterable<PracticalLink<T, N>> {
		const towards = this.linkIdsGroupedByFromNodeId.get(nodeId)
		const node = this.nodeById(nodeId)
		return towards.map((linkId: T) => this.practicalLink(node, linkId))
	}

	nodeById(nodeId: T): N {
		return this.nodes.get(nodeId)
	}

	private practicalLink(node: N, linkId: T): PracticalLink<T, N> {
		return { from: node, to: this.nodeById(this.links.get(linkId).to) }
	}

	get practicalLinks(): Iterable<PracticalLink<T, N>> {
		const generator = function* (graph: Graph<T, L, N>) {
			for (const link of graph.links.values())
				yield { from: graph.nodeById(link.from), to: graph.nodeById(link.to) }
		}
		return generator(this)
	}
}

export type GraphParameter<T, N extends Node<T>, L extends Link<T>> = {
	id?: T
	linkConstructor: { new(param: LinkParameter<T> | string): L }
	nodeConstructor: { new(param: NodeParameter<T> | string): N }
}

export abstract class Link<T> implements LinkParameter<T> {
	readonly id: T
	readonly from: T
	readonly to: T

	constructor(param: LinkParameter<T>) {
		this.id = param.id
		this.from = param.from
		this.to = param.to
	}
}

export type LinkParameter<T> = {
	id: T
	from: T
	to: T
}

export type NodeParameter<T> = {
	graph?: Graph<T, any, any>
	id: T
}

export type PracticalLink<T, N extends Node<T>> = {
	readonly from: N
	readonly to: N
}