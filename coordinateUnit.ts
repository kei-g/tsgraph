import { Coordinate } from './coordinate'

export class Degree {
	convert(coordinate: Coordinate<Degree>): Coordinate<Radian> {
		return new Coordinate<Radian>({
			latitude: coordinate.latitude * Math.PI / 180,
			longitude: coordinate.longitude * Math.PI / 180,
			unit: Radian,
		})
	}
}

export class Radian {
	convert(coordinate: Coordinate<Radian>): Coordinate<Degree> {
		return new Coordinate<Degree>({
			latitude: coordinate.latitude * 180 / Math.PI,
			longitude: coordinate.longitude * 180 / Math.PI,
			unit: Degree,
		})
	}
}