import * as Euclidean from './euclidean'

export class Neighborhood implements NeighborhoodLike {
  static selectIndex(neighborhood: Neighborhood): number {
    return neighborhood.index
  }

  readonly index: number
  readonly squareOfDistance: number

  constructor(param: NeighborhoodLike) {
    this.index = param.index
    this.squareOfDistance = param.squareOfDistance
  }

  isFatherThan(index: number, squareOfDistance: number): boolean {
    return index != this.index && squareOfDistance < this.squareOfDistance
  }
}

export class NeighborhoodArray extends Array<Neighborhood> {
  add(index: number, limit: number, squareOfDistance: number): void {
    if (this.insert(index, limit, squareOfDistance) === undefined)
      if (this.length < limit)
        this.push(new Neighborhood({ index, squareOfDistance }))
  }

  private insert(index: number, limit: number, squareOfDistance: number): number | undefined {
    const found = this.findIndex((neighborhood: Neighborhood) => neighborhood.isFatherThan(index, squareOfDistance))
    if (0 <= found) {
      const rhs = this.splice(found)
      this.push(new Neighborhood({ index, squareOfDistance }))
      const available = limit - this.length
      if (0 < available)
        this.push(...rhs.slice(0, available))
      return found
    }
  }
}

export class NeighborhoodCache extends Map<number, NeighborhoodArray> {
  private hit = 0
  private index: number
  private readonly limit: number
  notifier: (neighborhoods: Neighborhood[]) => Promise<void>
  private readonly numberOfThreads: number
  private readonly points: Euclidean.PointLike[]
  private total = 0
  private readonly workerThreadIndex: number

  constructor(limit: number, numberOfThreads: number, points: Euclidean.PointLike[], workerThreadIndex: number) {
    super()
    this.limit = limit
    this.numberOfThreads = numberOfThreads
    this.points = points
    this.workerThreadIndex = workerThreadIndex
  }

  private async add(depth: number, neighbor: Neighborhood | NeighborhoodLike): Promise<void> {
    if (this.has(neighbor.index))
      this.get(neighbor.index).add(neighbor.index, this.limit, neighbor.squareOfDistance)
    else
      this.addRecursive(depth, neighbor)
  }

  private async addRecursive(depth: number, neighbor: Neighborhood | NeighborhoodLike): Promise<void> {
    const a = new NeighborhoodArray()
    const base = this.points[neighbor.index]
    const squareOfDistance = Euclidean.Point.squareOfDistance(base)
    for (let i = 0; i < this.points.length; i++)
      if (i == neighbor.index)
        a.add(i, this.limit, neighbor.squareOfDistance)
      else
        a.add(i, this.limit, squareOfDistance(this.points[i]))
    this.set(neighbor.index, a)
    const myWork: Neighborhood[] = []
    const notMyWork: Neighborhood[] = []
    for (const b of a)
      if ((b.index % this.numberOfThreads) != this.workerThreadIndex)
        notMyWork.push(b)
      else if (this.index < b.index)
        myWork.push(b)
    this.notifier?.(notMyWork)
    for (const b of myWork)
      this.add(depth + 1, b)
  }

  private cachedNeighborhoods(limit: number): number[] {
    this.hit++
    const neighborhoods = this.get(this.index).slice(0, limit).map(Neighborhood.selectIndex)
    this.delete(this.index)
    return neighborhoods
  }

  get hitRatio(): number {
    return Math.round(this.hit * 10000 / this.total) / 100
  }

  private isMyResponsibility(neighbor: Neighborhood): boolean {
    return this.index < neighbor.index && (neighbor.index % this.numberOfThreads) == this.workerThreadIndex
  }

  neighborhoods(index: number, limit: number): number[] {
    this.total++
    this.index = index
    return this.has(index) ? this.cachedNeighborhoods(limit) : this.noncachedNeighborhoods(limit)
  }

  private noncachedNeighborhoods(limit: number): number[] {
    const neighborhoods = new NeighborhoodArray()
    const base = this.points[this.index]
    const squareOfDistance = Euclidean.Point.squareOfDistance(base)
    for (let i = 0; i < this.points.length; i++)
      if (i != this.index)
        neighborhoods.add(i, this.limit, squareOfDistance(this.points[i]))
    this.notifier?.(neighborhoods.filter(neighbor => neighbor.index % this.numberOfThreads != this.workerThreadIndex))
    for (const neighbor of neighborhoods)
      if (this.isMyResponsibility(neighbor))
        this.add(0, neighbor)
    return neighborhoods.slice(0, limit).map(Neighborhood.selectIndex)
  }

  receive(neighborhoods: NeighborhoodLike[]): void {
    for (const neighbor of neighborhoods)
      if (this.index < neighbor.index)
        this.add(0, neighbor)
  }
}

export type NeighborhoodLike = {
  index: number
  squareOfDistance: number
}
