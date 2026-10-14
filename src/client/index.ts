import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { PLUGIN_ID, ROOT_ENTRY, ROOT_SLOT, ROW_ENTRY, ROW_SLOT, SLOT_ORDER } from './constants'
import { createRowLinks } from './dom'
import { RecentGroup } from './recent-group'
import { RowMarker } from './row-marker'
import { mountRecentStyles } from './styles'

export function apply(ctx: Context): void {
  ctx.effect(mountRecentStyles)
  const links = createRowLinks()
  ctx.effect(() => () => links.dispose())
  ctx.slots.inject(ROOT_SLOT, () => ctx.slots.register({
    name: ROOT_SLOT,
    id: ROOT_ENTRY,
    order: SLOT_ORDER,
    registrant: PLUGIN_ID,
    inject: () => ({ links, locale: ctx.locale, open: (id: SessionId) => ctx.uiWorkspace.openSession(id) }),
  }, RecentGroup))
  ctx.slots.inject(ROW_SLOT, () => ctx.slots.register({
    name: ROW_SLOT,
    id: ROW_ENTRY,
    order: SLOT_ORDER,
    registrant: PLUGIN_ID,
    inject: () => ({ links }),
  }, RowMarker))
}
