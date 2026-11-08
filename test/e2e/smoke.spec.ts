import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { commands } from 'vitest/browser'

declare module 'vitest/browser' {
  interface BrowserCommands {
    launchDsh: () => Promise<{ baseUrl: string }>
    openDshPage: () => Promise<{ url: string }>
    inspectRecent: () => Promise<{
      sessionIds: string[]
      titles: string[]
      collapsed: boolean
      expanded: boolean
      selectionLinked: boolean
      hoverLinked: boolean
      styleTags: number
    }>
    getDshErrors: () => Promise<string[]>
    closeDsh: () => Promise<void>
  }
}

describe('recent on official DSH 0.2.2-rc.1', () => {
  let openedUrl = ''

  beforeAll(async () => {
    await commands.launchDsh()
    openedUrl = (await commands.openDshPage()).url
  })

  afterAll(async () => {
    await commands.closeDsh()
  })

  it('opens the authenticated DSH shell in Chromium', async () => {
    const url = new URL(openedUrl)
    expect(url.protocol).toMatch(/^https?:$/u)
    expect(url.pathname).toBe('/')
    expect(await commands.getDshErrors()).toEqual([])
  })

  it('shows the ten latest normal sessions and links native row interactions', async () => {
    const state = await commands.inspectRecent()
    // Newest first; only the ten most recent ordinary Sessions are listed, so the
    // oldest two seeded Sessions and the subagent Session are excluded.
    expect(state.sessionIds).toEqual([
      'recent-e2e-12',
      'recent-e2e-11',
      'recent-e2e-10',
      'recent-e2e-09',
      'recent-e2e-08',
      'recent-e2e-07',
      'recent-e2e-06',
      'recent-e2e-05',
      'recent-e2e-04',
      'recent-e2e-03',
    ])
    expect(state.titles).toHaveLength(10)
    expect(state.titles.every(title => title.length > 0)).toBe(true)
    expect(state.collapsed).toBe(true)
    expect(state.expanded).toBe(true)
    expect(state.selectionLinked).toBe(true)
    expect(state.hoverLinked).toBe(true)
    expect(state.styleTags).toBe(1)
    expect(await commands.getDshErrors()).toEqual([])
  })
})
