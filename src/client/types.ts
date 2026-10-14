import type { SessionListState, SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client'
import type { WorkspaceSnapshot } from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionRowOwnerProps } from '@deepseek-ai/dsh-client-ui-workspace/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'

export interface RowLinks {
  bind: (row: HTMLElement, id: SessionId) => () => void
  select: (id: SessionId | undefined) => void
  dispose: () => void
}

export type RowMarkerProps = SessionRowOwnerProps & { links: RowLinks }
export type RecentGroupProps = PropsRuntime<'shell.overlay'> & {
  links: RowLinks
  open: (id: SessionId) => void
  locale: LocaleRuntime
}
export interface RecentRowProps {
  row: SessionSummary
  selected: boolean
  links: RowLinks
  open: (id: SessionId) => void
  state: 'warning' | 'ongoing' | 'done' | 'idle'
  status: string
  time: string
}
export interface RecentState {
  list: SessionListState
  workspace: WorkspaceSnapshot
}
