import { PLUGIN_ID } from './constants'

/** Match native workspace rows through public theme tokens, never CSS-module hashes. */
export function mountRecentStyles() {
  const style = document.createElement('style')
  style.dataset.plugin = PLUGIN_ID
  style.dataset.pluginCss = PLUGIN_ID
  style.textContent = `
.dsh-recent { flex: none; min-height: 0; max-height: 42%; overflow-y: auto; padding-bottom: 16px; pointer-events: auto; }
.dsh-recent button { box-sizing: border-box; display: flex; align-items: center; width: 100%; border: 0; border-radius: var(--dsw-radius-md); background: transparent; color: var(--dsw-alias-label-primary); padding: 0 8px; font: inherit; text-align: start; cursor: pointer; user-select: none; }
.dsh-recent .dsh-recent-header { height: 34px; gap: 6px; }
.dsh-recent .dsh-recent-row { height: 32px; padding-inline-start: 24px; }
.dsh-recent .dsh-recent-leading { display: inline-flex; align-items: center; justify-content: center; flex: none; width: 16px; height: 20px; color: var(--dsw-alias-label-tertiary); }
.dsh-recent svg { width: 16px; height: 16px; flex: none; }
.dsh-recent .dsh-recent-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; line-height: 20px; }
.dsh-recent .dsh-recent-row .dsh-recent-title { margin: 0 6px 0 4px; }
.dsh-recent .dsh-recent-time { flex: none; color: var(--dsw-alias-label-tertiary); font-size: 10px; line-height: 16px; }
.dsh-recent button:hover, [data-dsh-recent-row][data-dsh-recent-hover], [data-dsh-recent-row][data-dsh-recent-selected] { background: var(--dsw-alias-interactive-bg-hover); }
.dsh-recent button:focus-visible { outline: 2px solid var(--dsw-alias-label-primary); outline-offset: -2px; }
.dsh-recent .dsh-recent-message { margin: 4px 8px 8px 28px; font-size: 12px; color: var(--dsw-alias-label-tertiary); }
.dsh-recent .dsh-recent-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
`
  document.head.append(style)
  return () => style.remove()
}
