import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { expect, it, vi } from 'vitest'

it('registers an executable classic client module with the DSH loader', () => {
  const load = vi.fn()
  const source = readFileSync(new URL('../dist/client.js', import.meta.url), 'utf8')
  runInNewContext(source, { window: { __ModuleLoader__: { load } } })
  expect(load).toHaveBeenCalledOnce()
  const registration = load.mock.calls[0]![0] as { id: string, factory: (require: (id: string) => object) => { apply: unknown } }
  expect(registration.id).toBe('dsh-recent')
  expect(registration.factory(() => ({})).apply).toBeTypeOf('function')
})
