import type { SessionEvent, SessionHeader } from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-session-persistence'
import type {} from '@deepseek-ai/dsh-session-title'
import { mkdir, realpath } from 'node:fs/promises'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { Session, SESSION_FORMAT_VERSION, SessionId } from '@deepseek-ai/dsh-session'
import * as JsonlPersistence from '@deepseek-ai/dsh-session-persistence-jsonl'

export interface RecentSessionFixture {
  sessionId: string
  title: string
}

export interface RecentSessionFixtures {
  workspacePath: string
  /** Ordinary nonblank Sessions, newest first. */
  sessions: RecentSessionFixture[]
  subagentSessionId: string
}

/** Seed an isolated DSH_HOME before launching the official CLI, without a model. */
export async function seedRecentSessions(home: string): Promise<RecentSessionFixtures> {
  const workspaceDirectory = join(home, 'recent-e2e-workspace')
  await mkdir(workspaceDirectory, { recursive: true })
  const workspacePath = await realpath(workspaceDirectory)
  const ctx = new Context()
  // The official base profile uses DSH_HOME/sessions and defaults to Zstandard.
  const persistence = ctx.plugin(JsonlPersistence, { root: join(home, 'sessions') })
  await persistence.await()

  const sessions: RecentSessionFixture[] = []
  const subagentSessionId = 'recent-e2e-subagent'
  const baseTime = Date.UTC(2026, 0, 1)

  try {
    // Only header-observable shapes are seeded: the official cold list derives
    // `blank` from the projection cache, which a seeded Session never writes,
    // so a seeded blank Session would be indistinguishable from a normal one.
    for (let index = 0; index < 13; index++) {
      const subagent = index === 12
      const sessionId = subagent ? subagentSessionId : `recent-e2e-${String(index + 1).padStart(2, '0')}`
      const title = subagent ? 'Recent E2E subagent' : `Recent E2E ${String(index + 1).padStart(2, '0')}`
      const createdAt = baseTime + index * 1000
      const header: SessionHeader = {
        version: SESSION_FORMAT_VERSION,
        id: SessionId(sessionId),
        createdAt,
        cwd: workspacePath,
        isSeeded: false,
        ...(subagent ? { origin: 'subagent', delegationDepth: 1, parentSession: SessionId('recent-e2e-12') } as const : {}),
      }
      const session = Session.create(header.id, undefined, header)
      const events: SessionEvent[] = []
      if (!subagent) {
        events.push(session.append('turn/start', { turn: 1 }))
        events.push(session.append('user/message', createUserMessage({
          content: [{ type: 'text', text: `Fixture message for ${title}` }],
          source: { kind: 'user' },
        }), { surfaceOp: 'append' }))
        events.push(session.append('turn/end', { turn: 1, reason: { kind: 'completed' } }))
      }
      events.push(session.append('session/title', { title, messageSeqs: [], source: { kind: 'user' } }))

      const handle = await ctx.sessionPersistence.create(session.header)
      try {
        // Keep distinct recency independent of CPU speed and filesystem timestamps.
        await handle.append(events.map(event => ({ ...event, time: createdAt + event.seq })))
        await handle.flush()
      }
      finally {
        await handle.close()
      }
      if (!subagent)
        sessions.unshift({ sessionId, title })
    }
  }
  finally {
    await persistence.dispose()
  }

  // WorkspaceRegistry bootstraps registrations from canonical cwd headers.
  return { workspacePath, sessions, subagentSessionId }
}
