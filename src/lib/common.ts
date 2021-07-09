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
