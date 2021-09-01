import { chmodSync, lstatSync, readdirSync, realpathSync } from 'fs'

type OctalNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7

function apply(
  modifiers: RegExpMatchArray[],
  path: string,
  recursive?: true,
): void {
  try {
    const stats = lstatSync(path)
    if (stats.isDirectory())
      if (recursive)
        for (const name of readdirSync(path))
          apply(
            modifiers,
            [path, name].join('/'),
            recursive,
          )
    const conv = (
      perm: string,
      whom: string,
    ): number => {
      const mapper = mapperFromString(whom)
      return perm?.split('')
        ?.map(octalNumberFromString)
        ?.reduce(
          (p: number, mask: number) =>
            p | mapper(mask),
          0,
        )
    }
    let mode = stats.mode
    for (const modifier of modifiers) {
      const {
        whom,
        perm1,
        sign1,
        perm2,
        sign2,
      } = modifier.groups
      const perm = perm1 ?? perm2
      const sign = perm1 ? sign1 : sign2
      if (whom === undefined
        || perm === undefined
        || sign === undefined)
        continue
      const mask = conv(perm1 ?? perm2, whom)
      if (mask === undefined)
        continue
      switch (sign) {
        case '+':
          mode |= mask
          break
        case '-':
          mode = mode & ~mask
          break
      }
    }
    chmodSync(path, mode)
  }
  catch (err: unknown) {
    console.error(
      err instanceof Error
        ? err.message
        : err,
    )
  }
}

function main(): void {
  let i = process.argv.findIndex(
    (argv: string) =>
      realpathSync(argv) === __filename
  )
  if (i++ < 0)
    process.exit(1)
  const mode = /(?<whom>[ugoa]*)((?<sign1>[-+=])(?<perm1>[Xrstwx]*|[ugo]))+|(?<sign2>[-+=])(?<perm2>[0-7]+)/g
  Object.freeze(mode)
  let modifiers: RegExpMatchArray[], recursive: true
  for (; i < process.argv.length;) {
    const argv = process.argv[i++]
    if (argv === '-R' || argv === '--recursive')
      recursive = true
    else if (modifiers === undefined) {
      const matched = argv.matchAll(mode)
      if (!matched)
        process.exit(1)
      modifiers = [...matched]
    }
    else
      apply(modifiers, argv, recursive)
  }
}

function mapperFromString(whom: string): (mask: number) => number {
  console.assert(typeof whom === 'string')
  console.assert(whom.length <= 1)
  const map = {
    'a': (m: number) => m << 6 | m << 3 | m,
    '': (m: number) => m << 6 | m << 3 | m,
    'g': (m: number) => m << 3,
    'o': (m: number) => m,
    'u': (m: number) => m << 6,
  }
  if (!Object.isFrozen(map))
    Object.freeze(map)
  console.assert(whom in map)
  return map[whom]
}

function octalNumberFromString(value: string): OctalNumber {
  console.assert(typeof value === 'string')
  console.assert(value.length === 1)
  const map = {
    'r': 4,
    'w': 2,
    'x': 1,
  } as Record<string, OctalNumber>
  if (!Object.isFrozen(map)) {
    for (let i = 0; i < 8; i++)
      map[i.toString()] = i as OctalNumber
    Object.freeze(map)
  }
  console.assert(value in map)
  return map[value]
}

main()
