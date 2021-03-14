export class Neighborhood {
	static selectIndex(neighborhood: Neighborhood): number {
		return neighborhood.index
	}

	constructor(readonly distance: number, readonly index: number) {
	}

	isFatherThan(distance: number, index: number): boolean {
		return distance < this.distance && index != this.index
	}
}

export class NeighborhoodArray extends Array<Neighborhood> {
	private add(distance: number, index: number, limit: number): void {
		this.push(new Neighborhood(distance, index))
		this.process = this.insert0
	}

	private insert0(distance: number, index: number, limit: number): void {
		this.insert1(distance, index, limit) ??
			this.length < limit ?
				this.push(new Neighborhood(distance, index)) :
				(this.process = this.insert1, Object.freeze(this.process))
	}

	private insert1(distance: number, index: number, limit: number): number | undefined {
		const found = this.findIndex((neighborhood: Neighborhood) => neighborhood.isFatherThan(distance, index))
		if (0 <= found) {
			const rhs = this.splice(found)
			this.push(new Neighborhood(distance, index))
			const available = limit - this.length
			return available <= 0 ? found : (this.push(...rhs.slice(0, available)), found)
		}
	}

	process: (distance: number, index: number, limit: number) => void = this.add
}