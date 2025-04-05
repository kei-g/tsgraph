import { Comparator } from '@kei-g/priority-queue'
import { Random } from './random'

export type AnticlockwiseIndex = 0 | 1 | 2 | 3

export class ComparisonResult {
  private static readonly Anglers = [
    ComparisonResult.angleForNorthern,
    ComparisonResult.angleForNorthern,
    ComparisonResult.angleForSouthWest,
    ComparisonResult.angleForSouthEast,
  ]

  private static angleForNorthern(c: ComparisonResult): number {
    return Math.acos(c.adjacent / c.hypotenuse)
  }

  private static angleForSouthEast(c: ComparisonResult): number {
    return Math.PI * 2 + Math.asin(c.opposite / c.hypotenuse)
  }

  private static angleForSouthWest(c: ComparisonResult): number {
    return Math.PI - Math.asin(c.opposite / c.hypotenuse)
  }

  readonly adjacent: number
  readonly index: AnticlockwiseIndex
  readonly opposite: number

  constructor(base: PointLike, other: PointLike) {
    this.adjacent = other.x - base.x
    this.opposite = other.y - base.y
    const south = +(this.opposite < 0) as 0 | 1
    const west = +(this.adjacent < 0) as 0 | 1
    const sign = (1 - south * 2) as 1 | -1
    this.index = (south * 3 + west * sign) as AnticlockwiseIndex
  }

  get angle(): number {
    return ComparisonResult.Anglers[this.index](this)
  }

  get degree(): number {
    return this.angle * 180 / Math.PI
  }

  get equal(): boolean {
    return this.adjacent == 0 && this.opposite == 0
  }

  get hypotenuse(): number {
    return Math.hypot(this.adjacent, this.opposite)
  }

  get squareOfDistance(): number {
    return this.adjacent * this.adjacent + this.opposite * this.opposite
  }
}

export class Point implements PointLike {
  static ascending<P extends PointLike>(point: P): Comparator<P> {
    const squareOfDistance = Point.squareOfDistance(point)
    return (lhs: P, rhs: P) => squareOfDistance(lhs) - squareOfDistance(rhs)
  }

  static descending<P extends PointLike>(point: P): Comparator<P> {
    const squareOfDistance = Point.squareOfDistance(point)
    return (lhs: P, rhs: P) => squareOfDistance(rhs) - squareOfDistance(lhs)
  }

  static ascendingByX<P extends PointLike>(lhs: P, rhs: P): number {
    return lhs.x - rhs.x
  }

  static ascendingByY<P extends PointLike>(lhs: P, rhs: P): number {
    return lhs.y - rhs.y
  }

  static convert(p: PointLike): Point {
    return new Point(p.x, p.y)
  }

  static from(device: Random.Device): Point {
    return new Point(device.integer, device.integer)
  }

  static readonly squareOfDistance: (base: PointLike) => (point: PointLike) => number = function (base: PointLike): (point: PointLike) => number {
    return function (point: PointLike): number {
      const dx = point.x - base.x
      const dy = point.y - base.y
      return dx * dx + dy * dy
    }
  }

  readonly x: number
  readonly y: number

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }

  get JSON(): string {
    return `{"x":${this.x},"y":${this.y}}`
  }

  compareTo(point: PointLike): ComparisonResult {
    return new ComparisonResult(this, point)
  }

  distanceTo(point: PointLike): number {
    return Math.hypot(this.x - point.x, this.y - point.y)
  }

  dotProduct(point: PointLike): number {
    return this.x * point.x + this.y * point.y
  }

  equal(point: PointLike): boolean {
    return this.x == point?.x && this.y == point?.y
  }

  squareOfDistanceTo(point: PointLike): number {
    const dx = point.x - this.x
    const dy = point.y - this.y
    return dx * dx + dy * dy
  }

  toString(): string {
    return `${this.x},${this.y}`
  }
}

export type PointLike = {
  x: number
  y: number
}
