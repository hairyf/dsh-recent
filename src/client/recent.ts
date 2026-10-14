import type { SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { RecentState } from './types'
import { RECENT_LIMIT } from './constants'

/** The catalog's durable activity time also seeds history after a client reload. */
export function recentSessions({ list, workspace }: RecentState): SessionSummary[] {
  const archived = new Set(workspace.archivedSessionIds)
  return list.ids
    .map(id => list.byId[id])
    .filter(row => row && !row.blank && !row.parentId && row.origin !== 'subagent' && !archived.has(row.id))
    .sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id))
    .slice(0, RECENT_LIMIT)
}

export function selectedSession(list: RecentState['list'], panelActive: boolean): SessionId | undefined {
  return panelActive ? undefined : Object.values(list.byId).find(row => (row.retainedBy.mainView ?? 0) > 0)?.id
}
