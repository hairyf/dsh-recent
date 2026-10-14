import type { SessionListState, SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client'
import type { WorkspaceSnapshot } from '@deepseek-ai/dsh-api-workspace-controller/client'
import { SessionId } from '@deepseek-ai/dsh-session/types'
import { expect, it } from 'vitest'
import { RECENT_LIMIT } from '../src/client/constants'
import { recentSessions, selectedSession } from '../src/client/recent'

it('projects durable recent activity without retaining or mutating the catalog', () => {
  const row = (id: string, updatedAt: number, extra: Partial<SessionSummary> = {}): SessionSummary => ({
    id: SessionId(id),
    displayTitle: 'Same title',
    updatedAt,
    running: false,
    blank: false,
    retainedBy: {},
    ...extra,
  })
  const rows = [
    row('old', 1),
    row('b', 100),
    row('a', 100),
    row('blank', 500, { blank: true }),
    row('archived', 500),
    row('child', 500, { parentId: SessionId('a') }),
    row('agent', 500, { origin: 'subagent' }),
    ...Array.from({ length: 12 }, (_, i) => row(`older-${i}`, -i)),
  ]
  const list: SessionListState = {
    ids: rows.map(row => row.id),
    byId: Object.fromEntries([...rows, row('retained-only', 1000, { retainedBy: { mainView: 1 } })].map(row => [row.id, row])),
    phase: 'ready',
    projectionsBySession: {},
  }
  const workspace: WorkspaceSnapshot = {
    items: [],
    archivedSessionIds: [SessionId('archived')],
    pinnedSessionIds: [],
    phase: 'ready',
    state: 'idle',
    error: null,
  }
  const original = structuredClone(list)
  expect(recentSessions({ list, workspace }).map(row => row.id)).toEqual([
    'a',
    'b',
    'old',
    ...Array.from({ length: RECENT_LIMIT - 3 }, (_, i) => `older-${i}`),
  ])
  expect(list).toEqual(original)
  expect(selectedSession(list, false)).toBe('retained-only')
  expect(selectedSession(list, true)).toBeUndefined()
  expect(recentSessions({ list: { ...list, ids: [] }, workspace })).toEqual([])
})
