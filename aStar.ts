import { Comparator, PriorityQueue } from '@kei-g/priority-queue'
import { Graph, Link, Node } from './graph'

export function findShortestPath<T, L extends Link<T>, N extends Node<T>>(param: PathParameter<T, L, N>): aStarResult<T, N> {
  const workbench = new Workbench<T, L, N>(param)
  while (!workbench.isEmpty) {
    const node = workbench.pop()
    if (node.id == param.arrivalNodeId)
      return { path: workbench.path, result: 'Found', visitedNodes: workbench.visitedNodes }
    workbench.visit(node)
  }
  return { path: workbench.pathTo(workbench.nodeIdOfLeastHeuristic), result: 'No Route', visitedNodes: workbench.visitedNodes }
}

type aStarResult<T, N extends Node<T>> = {
  path: N[]
  result: 'Found' | 'No Route'
  visitedNodes: Iterable<VisitedNode<T>>
}

type Callback = () => void

interface NodeCost<T> {
  behindNodeId: T
  estimated: number
  cumulative: number
  readonly heuristic: number
  readonly id: T

  update(behindNodeId: T, cumulative: number, callback: Callback): void
}

class ConcreteNodeCost<T> implements NodeCost<T> {
  estimated: number

  constructor(readonly id: T, public cumulative: number, readonly heuristic: number, public behindNodeId: T) {
    this.estimated = cumulative + heuristic
  }

  update(behindNodeId: T, cumulative: number, callback: Callback): void {
    const estimated = cumulative + this.heuristic
    if (estimated < this.estimated) {
      this.behindNodeId = behindNodeId
      this.cumulative = cumulative
      this.estimated = estimated
      callback()
    }
  }

  toString(): string {
    return `${this.behindNodeId} => ${this.id} (${this.cumulative}/${this.estimated}/${this.heuristic})`
  }
}

class DepartureNodeCost<T> implements NodeCost<T> {
  constructor(readonly id: T, readonly heuristic: number) {
  }

  get behindNodeId(): T {
    return undefined
  }

  get cumulative(): number {
    return 0
  }

  get estimated(): number {
    return this.heuristic
  }

  update(behindNodeId: T, cumulative: number, callback: Callback): void {
  }

  toString(): string {
    return `departure: ${this.id} (${this.cumulative}/${this.estimated}/${this.heuristic})`
  }
}

export type PathParameter<T, L extends Link<T>, N extends Node<T>> = {
  readonly arrivalNodeId: T
  readonly departureNodeId: T
  readonly graph: Graph<T, L, N>
  readonly heuristicCost: (from: N, to: N) => number
}

type VisitedNode<T> = {
  cost: {
    cumulative: number
    estimated: number
    heuristic: number
  }
  from: T
  id: T
}

class Workbench<T, L extends Link<T>, N extends Node<T>> {
  private readonly arrivalNode: N
  private readonly comparator: Comparator<NodeCost<T>> = (lhs: NodeCost<T>, rhs: NodeCost<T>) => rhs.estimated - lhs.estimated
  private readonly departureNodeId: T
  private readonly graph: Graph<T, L, N>
  private readonly heuristicCost: (from: N, to: N) => number
  private readonly nodesInQueue: Set<T> = new Set<T>()
  private readonly queue: PriorityQueue<NodeCost<T>>
  private readonly visited: Map<T, NodeCost<T>> = new Map<T, NodeCost<T>>()

  constructor(param: PathParameter<T, L, N>) {
    this.arrivalNode = param.graph.nodeById(param.arrivalNodeId)
    this.departureNodeId = param.departureNodeId
    this.graph = param.graph
    this.heuristicCost = param.heuristicCost
    this.queue = new PriorityQueue<NodeCost<T>>(this.comparator)
    const departureNode = this.graph.nodeById(this.departureNodeId)
    const heuristicCost = this.heuristicCost(departureNode, this.arrivalNode)
    const node = new DepartureNodeCost<T>(this.departureNodeId, heuristicCost)
    this.visited.set(this.departureNodeId, node)
    this.determinePriorityOf(node)
  }

  private determinePriorityOf(node: NodeCost<T>): void {
    if (this.nodesInQueue.has(node.id))
      this.queue.update(node)
    else {
      this.nodesInQueue.add(node.id)
      this.queue.add(node)
    }
  }

  get isEmpty(): boolean {
    return this.queue.isEmpty
  }

  get nodeIdOfLeastHeuristic(): T {
    const least = { id: undefined, heuristic: Infinity }
    for (const node of this.visited.values()) {
      const heuristic = this.heuristicCost(this.graph.nodeById(node.id), this.arrivalNode)
      if (heuristic < least.heuristic) {
        least.id = node.id
        least.heuristic = heuristic
      }
    }
    return least.id
  }

  get path(): N[] {
    return this.pathTo(this.arrivalNode.id)
  }

  pathTo(nodeId: T): N[] {
    const path: N[] = []
    while (true) {
      path.unshift(this.graph.nodeById(nodeId))
      if (nodeId == this.departureNodeId)
        return path
      const node = this.visited.get(nodeId)
      nodeId = node.behindNodeId
    }
  }

  pop(): NodeCost<T> {
    const node = this.queue.pop()
    this.nodesInQueue.delete(node.id)
    return node
  }

  visit(base: NodeCost<T>): void {
    for (const link of this.graph.linksAheadOf(base.id)) {
      const cumulative = base.cumulative + this.heuristicCost(link.from, link.to)
      if (this.visited.has(link.to.id)) {
        const node = this.visited.get(link.to.id)
        node.update(link.from.id, cumulative, () => this.determinePriorityOf(node))
      } else {
        const heuristic = this.heuristicCost(link.to, this.arrivalNode)
        const node = new ConcreteNodeCost(link.to.id, cumulative, heuristic, link.from.id)
        this.visited.set(node.id, node)
        this.determinePriorityOf(node)
      }
    }
  }

  get visitedNodes(): Iterable<VisitedNode<T>> {
    const nodes = this.visited.values()
    const generator = function* () {
      for (const node of nodes)
        yield {
          cost: {
            cumulative: node.cumulative,
            estimated: node.estimated,
            heuristic: node.heuristic,
          },
          from: node.behindNodeId,
          id: node.id,
        }
    }
    return generator()
  }
}
