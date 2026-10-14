// @vitest-environment jsdom
import type { SessionListState } from '@deepseek-ai/dsh-api-session-controller/client'
import type { WorkspaceSnapshot } from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { RecentGroupProps } from '../src/client/types'
import { SessionId } from '@deepseek-ai/dsh-session/types'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { createRowLinks } from '../src/client/dom'
import { RecentGroup } from '../src/client/recent-group'

vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => ({
  IconChevronDownOutlineRegular: () => null,
  IconChevronRightOutlineRegular: () => null,
  IconClockOutlineRegular: () => null,
  StateDot: () => null,
  relativeTime: () => ({ unit: 'now', n: 0 }),
}))

it('renders below workspaces, opens the exact session, reflects selection and unmounts cleanly', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  const id = SessionId('recent-session')
  const list: SessionListState = {
    ids: [id],
    byId: { [id]: { id, displayTitle: 'Recent task', updatedAt: Date.now(), running: true, blank: false, retainedBy: { mainView: 1 } } },
    phase: 'ready',
    projectionsBySession: {},
  }
  const workspace: WorkspaceSnapshot = { items: [], archivedSessionIds: [], pinnedSessionIds: [], phase: 'ready', state: 'idle', error: null }
  const localeSnapshot = { active: 'en' }
  const links = createRowLinks()
  const open = vi.fn()
  // Only the standard hooks consumed by this component are needed in this isolated Slot harness.
  const props = {
    useSessions: selector => selector(list),
    useWorkspaces: selector => selector(workspace),
    useSessionStatus: selector => selector(new Map()),
    usePanelInfo: selector => selector({ activePanelId: null }),
    links,
    open,
    locale: { subscribe: () => () => {}, getSnapshot: () => localeSnapshot, bind: () => () => 'Sessions' },
  } as RecentGroupProps
  const tree = document.createElement('div')
  tree.setAttribute('role', 'tree')
  tree.setAttribute('aria-label', 'Sessions')
  const host = document.createElement('div')
  document.body.append(tree, host)
  const root = createRoot(host)
  try {
    await act(async () => root.render(<RecentGroup {...props} />))
    const row = document.querySelector<HTMLButtonElement>('.dsh-recent-row')!
    expect(tree.nextElementSibling?.className).toBe('dsh-recent')
    expect(row.textContent).toContain('Recent task')
    expect(row.textContent).toContain('Running')
    expect(row.getAttribute('aria-current')).toBe('page')
    await act(async () => row.click())
    expect(open).toHaveBeenCalledExactlyOnceWith(id)
    open.mockImplementationOnce(() => {
      throw new Error('Unavailable')
    })
    await act(async () => row.click())
    expect(document.querySelector('[role="alert"]')?.textContent).toContain('Could not open session')
    const toggle = document.querySelector<HTMLButtonElement>('.dsh-recent-header')!
    await act(async () => toggle.click())
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(document.getElementById(toggle.getAttribute('aria-controls')!)?.hidden).toBe(true)
  }
  finally {
    await act(async () => root.unmount())
    links.dispose()
    expect(document.querySelector('.dsh-recent')).toBeNull()
    document.body.replaceChildren()
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false })
  }
})
