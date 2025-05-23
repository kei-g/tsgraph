import * as fs from 'fs'

export namespace Random {
  export class Device {
    private static readonly Base64Species = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    private readonly fd: number
    private readonly species: string
    private readonly stringLength: number

    constructor(stringLength: number = 16) {
      this.fd = fs.openSync('/dev/urandom', 'r')
      this.species = Device.Base64Species
      Object.freeze(Device.Base64Species)
      Object.freeze(this.fd)
      Object.freeze(this.species)
      this.stringLength = stringLength
    }

    get integer(): number {
      const buffer = Buffer.alloc(4)
      fs.readSync(this.fd, buffer, 0, 4, null)
      return buffer.readUInt32LE()
    }

    get shortInteger(): number {
      const buffer = Buffer.alloc(2)
      fs.readSync(this.fd, buffer, 0, 2, null)
      return buffer.readUInt16LE()
    }

    get string(): string {
      const buffer = Buffer.alloc(this.stringLength)
      fs.readSync(this.fd, buffer, 0, this.stringLength, null)
      const view = new Uint8Array(buffer)
      let string: string
      for (let i = 0; i < this.stringLength; i++) {
        const c = this.species[view[i] % this.species.length]
        string = string?.concat(c) ?? c
      }
      return string
    }
  }
}
