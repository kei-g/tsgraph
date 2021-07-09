import { Degree, Radian } from './coordinateUnit'

const symbolOfCoordinateUnit = Symbol()

export class Coordinate<T extends Degree | Radian> implements CoordinateParameter<T> {
  readonly latitude: number
  readonly longitude: number

  constructor(param: CoordinateParameter<T>) {
    this.latitude = param.latitude
    this.longitude = param.longitude
    this[symbolOfCoordinateUnit] = param.unit
  }

  get Degree(): Coordinate<Degree> {
    return this.unit === Radian ? new this.unit().convert(this) : this
  }

  get JSON(): string {
    return `{"longitude":${this.longitude},"latitude":${this.latitude},"unit":${new this.unit().JSON}}`
  }

  get Radian(): Coordinate<Radian> {
    return this.unit === Degree ? new this.unit().convert(this) : this
  }

  get unit(): { new(): T } {
    return this[symbolOfCoordinateUnit]
  }

  toString(): string {
    return `${this.longitude}, ${this.latitude}`
  }
}

const hubeny = (equatorialRadius: number, squareOfEccentricity: number, meridianRadiusOfCurvature: number) => (from: Coordinate<Radian>, to: Coordinate<Radian>) => {
  const c = Math.cos((from.latitude + to.latitude) / 2)
  const W = Math.sqrt(1 - squareOfEccentricity * (1 - c * c))
  const dxN = (from.longitude - to.longitude) * c * equatorialRadius / W
  const dyM = (from.latitude - to.latitude) * meridianRadiusOfCurvature / (W * W * W)
  return Math.sqrt(dxN * dxN + dyM * dyM)
}

const equatorialRadius = 6378137 // 赤道半径
const squareOfEccentricity = 0.00669437999019758 // 離心率の平方
const meridianRadiusOfCurvature = 6335439.32729246 // 子午線曲率半径
export const distanceWGS84 = hubeny(equatorialRadius, squareOfEccentricity, meridianRadiusOfCurvature)

export type CoordinateParameter<T extends Degree | Radian> = {
  latitude: number
  longitude: number
  unit: { new(): T }
}
