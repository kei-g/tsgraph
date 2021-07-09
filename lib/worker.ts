import { parentPort, workerData } from 'worker_threads'

import { Neighborhood, NeighborhoodCache, NeighborhoodLike } from './neighborhoods'
import { Random } from './standard'

type Message = {
  end?: {
    workerIndex: number
  }
  generateLink?: {
    from: number
  }
  link?: {
    from: number
    to: Uint32Array
  }
  neighborhoods?: NeighborhoodLike[]
  terminate?: boolean
}

const cache = new NeighborhoodCache(3, workerData.numberOfThreads, workerData.positions, workerData.index - 1)
const random = new Random.Device()
const workerIndex = workerData.index

function enqueueMessage(message: Message): Promise<void> {
  return new Promise<void>(resolve => {
    parentPort.postMessage(message)
    resolve()
  })
}

function generateLink(from: number): Promise<void> {
  return new Promise<void>(resolve => {
    const limit = (random.shortInteger & 1) + 2
    const neighborhoods = new Uint32Array(cache.neighborhoods(from, limit))
    enqueueMessage({ link: { from: from, to: neighborhoods } }).then(resolve)
  })
}

function receiveMessage(message: Message): void {
  if (message.generateLink)
    generateLink(message.generateLink.from)
  if (message.neighborhoods)
    receiveNeighborhoods(message.neighborhoods)
  else if (message.terminate) {
    console.log(`worker${workerIndex}: cache hit ratio=${cache.hitRatio}%`)
    parentPort.postMessage({ end: { workerIndex: workerIndex } })
    process.exit(0)
  }
}

function receiveNeighborhoods(neighborhoods: NeighborhoodLike[]): Promise<void> {
  return new Promise<void>(resolve => { cache.receive(neighborhoods), resolve() })
}

cache.notifier = (neighborhoods: Neighborhood[]) => enqueueMessage({ neighborhoods: neighborhoods })
parentPort.on('message', receiveMessage)
