import type { ReactElement, ReactPortal } from 'react'
import type { RecentGroupProps, RecentRowProps } from './types'
import { IconChevronDownOutlineRegular, IconChevronRightOutlineRegular, IconClockOutlineRegular, relativeTime, StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { observeRecentMount } from './dom'
import { recentSessions, selectedSession } from './recent'

function RecentRow({ row, selected, links, open, state, status, time }: RecentRowProps): ReactElement {
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => ref.current ? links.bind(ref.current, row.id) : undefined, [links, row.id])
  return (
    <button
      ref={ref}
      type="button"
      className="dsh-recent-row"
      aria-current={selected ? 'page' : undefined}
      title={row.cwd ? `${row.displayTitle}\n${row.cwd}` : row.displayTitle}
      onClick={() => open(row.id)}
    >
      <span className="dsh-recent-leading" aria-hidden="true">{state !== 'idle' && <StateDot state={state} />}</span>
      <span className="dsh-recent-title">{row.displayTitle}</span>
      <span className="dsh-recent-sr">{status}</span>
      <span className="dsh-recent-time" aria-hidden="true">{time}</span>
    </button>
  )
}

export function RecentGroup({ useSessions, useWorkspaces, useSessionStatus, usePanelInfo, links, open, locale }: RecentGroupProps): ReactPortal | null {
  const list = useSessions(s => s)
  const workspace = useWorkspaces(s => s)
  const statuses = useSessionStatus(s => s)
  const panelActive = usePanelInfo(s => s.activePanelId !== null)
  const language = useSyncExternalStore(fn => locale.subscribe(fn), () => locale.getSnapshot()).active
  const zh = language.startsWith('zh')
  const treeLabel = locale.bind('workspace')('section.sessions')
  const [mount, setMount] = useState<HTMLElement | null>(null)
  const [expanded, setExpanded] = useState(true)
  const [error, setError] = useState(false)
  const currentId = selectedSession(list, panelActive)
  const rows = recentSessions({ list, workspace })
  const contentId = useId()

  useEffect(() => observeRecentMount(treeLabel, setMount), [treeLabel])
  useEffect(() => {
    links.select(currentId)
    return () => links.select(undefined)
  }, [links, currentId])

  const navigate: RecentGroupProps['open'] = (id) => {
    setError(false)
    try {
      open(id)
    }
    catch {
      setError(true)
    }
  }
  if (!mount)
    return null
  const ready = list.phase === 'ready' && workspace.phase === 'ready'
  return createPortal(
    <section aria-label="Recent">
      <button type="button" className="dsh-recent-header" aria-expanded={expanded} aria-controls={contentId} onClick={() => setExpanded(!expanded)}>
        <span className="dsh-recent-leading" aria-hidden="true">{expanded ? <IconChevronDownOutlineRegular /> : <IconChevronRightOutlineRegular />}</span>
        <IconClockOutlineRegular aria-hidden="true" />
        <span className="dsh-recent-title">Recent</span>
      </button>
      <div id={contentId} hidden={!expanded}>
        {workspace.state === 'error'
          ? <p className="dsh-recent-message" role="status">{zh ? '无法加载最近会话' : 'Could not load recent sessions'}</p>
          : !ready
              ? <p className="dsh-recent-message" role="status">{zh ? '加载中…' : 'Loading…'}</p>
              : rows.length === 0
                ? <p className="dsh-recent-message">{zh ? '暂无最近会话' : 'No recent sessions'}</p>
                : rows.map((row) => {
                    const status = statuses.get(row.id)
                    const state = status?.pendingInteraction ? 'warning' : (status?.running ?? row.running) ? 'ongoing' : status?.completionUnread ? 'done' : 'idle'
                    const label = state === 'warning' ? (zh ? '等待处理' : 'Needs attention') : state === 'ongoing' ? (zh ? '运行中' : 'Running') : state === 'done' ? (zh ? '已完成' : 'Completed') : (zh ? '空闲' : 'Idle')
                    const bucket = relativeTime(row.updatedAt, Date.now())
                    const time = bucket.unit === 'now' ? (zh ? '刚刚' : 'now') : `${bucket.n}${({ minutes: zh ? '分' : 'min', hours: zh ? '时' : 'h', days: zh ? '天' : 'd', months: zh ? '月' : 'mo', years: zh ? '年' : 'y' })[bucket.unit]}`
                    return <RecentRow key={row.id} row={row} selected={row.id === currentId} links={links} open={navigate} state={state} status={label} time={time} />
                  })}
      </div>
      {error && <p className="dsh-recent-message" role="alert">{zh ? '打开会话失败，请重试' : 'Could not open session; please try again'}</p>}
    </section>,
    mount,
  )
}
