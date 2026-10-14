import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { RowLinks } from './types'

/** Shared by native Slot markers and Recent buttons; no native class names or ARIA are changed. */
export function createRowLinks(): RowLinks {
  const rows = new Map<HTMLElement, { id: SessionId, dispose: () => void }>()
  let hovered: HTMLElement | undefined
  let focused: HTMLElement | undefined
  let selected: SessionId | undefined
  const refresh = (): void => {
    const active = (hovered && rows.get(hovered)?.id) ?? (focused && rows.get(focused)?.id)
    for (const [row, { id }] of rows) {
      row.toggleAttribute('data-dsh-recent-hover', id === active)
      row.toggleAttribute('data-dsh-recent-selected', id === selected)
    }
  }
  const bind: RowLinks['bind'] = (row, id) => {
    const enter = (): void => {
      hovered = row
      refresh()
    }
    const leave = (): void => {
      if (hovered === row)
        hovered = undefined
      refresh()
    }
    const focus = (): void => {
      focused = row
      refresh()
    }
    const blur = (event: FocusEvent): void => {
      if (event.relatedTarget instanceof Node && row.contains(event.relatedTarget))
        return
      if (focused === row)
        focused = undefined
      refresh()
    }
    const dispose = (): void => {
      row.removeEventListener('pointerenter', enter)
      row.removeEventListener('pointerleave', leave)
      row.removeEventListener('focusin', focus)
      row.removeEventListener('focusout', blur)
      rows.delete(row)
      if (hovered === row)
        hovered = undefined
      if (focused === row)
        focused = undefined
      row.removeAttribute('data-dsh-recent-row')
      row.removeAttribute('data-dsh-recent-hover')
      row.removeAttribute('data-dsh-recent-selected')
      refresh()
    }
    rows.set(row, { id, dispose })
    row.setAttribute('data-dsh-recent-row', '')
    row.addEventListener('pointerenter', enter)
    row.addEventListener('pointerleave', leave)
    row.addEventListener('focusin', focus)
    row.addEventListener('focusout', blur)
    refresh()
    return dispose
  }
  return {
    bind,
    select(id) {
      selected = id
      refresh()
    },
    dispose() {
      for (const { dispose } of [...rows.values()])
        dispose()
    },
  }
}

/** ponytail: SDK alpha.1 has no list-tail Slot; replace with one when upstream exposes it. */
export function observeRecentMount(label: string, onMount: (mount: HTMLElement | null) => void): () => void {
  let tree: Element | undefined
  let mount: HTMLDivElement | undefined
  const sync = (): void => {
    const next = [...document.querySelectorAll('[role="tree"][aria-label]')]
      .find(node => node.getAttribute('aria-label') === label)
    if (tree === next && (!mount || mount.isConnected))
      return
    mount?.remove()
    tree = next
    mount = undefined
    if (tree) {
      mount = document.createElement('div')
      mount.className = 'dsh-recent'
      tree.after(mount)
    }
    onMount(mount ?? null)
  }
  const observer = new MutationObserver(sync)
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-label'] })
  sync()
  return () => {
    observer.disconnect()
    mount?.remove()
  }
}
