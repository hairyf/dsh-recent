import type { ReactElement } from 'react'
import type { RowMarkerProps } from './types'
import { useEffect, useRef } from 'react'

/** The public action Slot supplies identity; only the semantic treeitem is patched. */
export function RowMarker({ sessionId, links }: RowMarkerProps): ReactElement {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const row = ref.current?.closest<HTMLElement>('[role="treeitem"]')
    return row ? links.bind(row, sessionId) : undefined
  }, [links, sessionId])
  return <span ref={ref} hidden />
}
