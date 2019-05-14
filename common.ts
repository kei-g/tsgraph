export type Comparator<T> = (lhs: T, rhs: T) => number
export type Predicate<T> = (object: T) => boolean
export type Selector<T, U> = SelectorWithIndex<T, U> | SelectorWithoutIndex<T, U>
export type SelectorWithIndex<T, U> = (element: T, index: number) => U
export type SelectorWithoutIndex<T, U> = (element: T) => U

export function ascending(lhs: number, rhs: number): number {
	return lhs - rhs
}

export function descending(lhs: number, rhs: number): number {
	return rhs - lhs
}

export function except<T>(object: T): Predicate<T> {
	return (element: T) => element != object
}

export function notnull<T>(object: T): boolean {
	return !!object
}

export function sequence(max: number): number[] {
	return [...new Array(max).keys()]
}

export class DuplicateException<T> extends Error {
	constructor(readonly object: T) {
		super(`Duplicate ${object}`)
	}
}

export class PriorityQueue<T> {
	private readonly items: T[] = [undefined]

	constructor(private readonly comparator: Comparator<T>) {
	}

	add(value: T): void {
		this.items.push(value)
		for (let i = this.length; 1 < i;) {
			const j = Math.floor(i / 2)
			if (this.compare(i, j) < 0)
				break
			this.swap(i, j)
			i = j
		}
	}

	private compare(lhs: number, rhs: number): number {
		return this.comparator(this.items[lhs], this.items[rhs])
	}

	get isEmpty(): boolean {
		return this.length == 0
	}

	private get length(): number {
		return this.items.length - 1
	}

	pop(): T {
		if (this.isEmpty)
			throw 'No item in PriorityQueue'
		const value = this.swap(1, this.length)
		this.items.pop()
		this.sink(1)
		return value
	}

	private sink(i: number): void {
		for (let j = i * 2; j <= this.length; j *= 2) {
			const k = j + 1
			if (j < this.length && this.compare(j, k) < 0)
				j = k
			if (this.compare(i, j) < 0)
				this.swap(i, j)
		}
	}

	private swap(i: number, j: number): T {
		[this.items[i], this.items[j]] = [this.items[j], this.items[i]]
		return this.items[j]
	}

	update(value: T): void {
		let [i, j] = [1, this.length]
		while (i < j) {
			const k = Math.floor((i + j) / 2)
			const item = this.items[k + 1]
			if (this.comparator(item, value) < 0)
				i = k + 1
			else
				j = k
		}
		this.sink(i)
	}
}
