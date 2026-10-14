import { fileURLToPath } from 'node:url'
import { guardStaleBuild } from 'tsdown-stale-guard'
import { snapshotApiPerEntry } from 'tsnapi/vitest'
import { beforeAll, describe } from 'vitest'

const root = fileURLToPath(new URL('..', import.meta.url))

describe('api snapshot', () => {
  beforeAll(async () => {
    for (const entry of ['host', 'client'])
      await guardStaleBuild({ root, hashFile: `node_modules/.cache/tsdown-stale-guard/${entry}.yaml` })
  })

  snapshotApiPerEntry(root)
})
