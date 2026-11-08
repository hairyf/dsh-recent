import type { Locator, Page } from 'playwright'
import type { BrowserCommand } from 'vitest/node'
import type { ShellScaffold } from './shell'
import { launchShell, logs } from './shell'
import { exchangeProcessLaunchToken } from './shell.utils'

interface BrowserDshSession {
  scaffold: ShellScaffold
  page?: Page
  errors: () => string[]
}

const sessions = new Map<string, BrowserDshSession>()

export const launchDsh: BrowserCommand<[], { baseUrl: string }> = async (context) => {
  if (context.provider.name !== 'playwright')
    throw new Error('DSH browser tests require the Playwright browser provider')

  const existing = sessions.get(context.sessionId)
  if (existing)
    return { baseUrl: existing.scaffold.baseUrl }

  const scaffold = await launchShell()
  sessions.set(context.sessionId, { scaffold, errors: () => [] })

  const exchange = await exchangeProcessLaunchToken(scaffold.baseUrl, scaffold.processLaunchUrl)
  if (exchange)
    await context.context.addCookies([exchange.cookie])

  return { baseUrl: scaffold.baseUrl }
}

/**
 * The official shell blocks its whole tree behind a first-run "Preview Notice"
 * modal (`#root[inert]`). A fresh E2E profile always shows it, so the harness
 * acknowledges it before any assertion touches the plugin UI.
 */
async function dismissFirstRunNotice(page: Page): Promise<void> {
  const notice = page.getByRole('dialog', { name: 'Preview Notice', exact: true })
  await notice.waitFor({ state: 'visible' })
  await notice.getByRole('button', { name: 'Continue', exact: true }).click()
  await notice.waitFor({ state: 'detached' })
  await dismissModelOnboarding(page)
}

/**
 * The official shell opens model onboarding for a profile without a provider.
 * It is an unrelated overlay that masks the whole window, so the harness closes
 * it (the modal's own Close control) before touching the plugin UI.
 */
async function dismissModelOnboarding(page: Page): Promise<void> {
  const onboarding = page.getByRole('dialog', { name: 'Get started', exact: true })
  try {
    await onboarding.waitFor({ state: 'visible', timeout: 5000 })
  }
  catch {
    return
  }
  await onboarding.getByRole('button', { name: 'Close', exact: true }).click()
  await onboarding.waitFor({ state: 'detached' })
}

export const openDshPage: BrowserCommand<[], { url: string }> = async (context) => {
  const session = sessions.get(context.sessionId)
  if (!session)
    throw new Error('DSH shell must be launched before opening the page')

  const page = await context.context.newPage()
  const consoleTripwire = logs(page)

  session.page = page
  session.errors = consoleTripwire.errors
  await page.goto(session.scaffold.baseUrl, { waitUntil: 'load' })
  await dismissFirstRunNotice(page)
  return { url: page.url() }
}

export const getDshErrors: BrowserCommand<[], string[]> = async (context) => {
  const session = sessions.get(context.sessionId)
  if (!session?.page)
    throw new Error('DSH page must be opened before reading browser errors')
  return session.errors()
}

export interface RecentInspection {
  sessionIds: string[]
  titles: string[]
  collapsed: boolean
  expanded: boolean
  selectionLinked: boolean
  hoverLinked: boolean
  styleTags: number
}

export const inspectRecent: BrowserCommand<[], RecentInspection> = async (context) => {
  const page = sessions.get(context.sessionId)?.page
  if (!page)
    throw new Error('DSH page must be opened before inspecting Recent')

  const recent = page.getByRole('region', { name: 'Recent', exact: true })
  await recent.waitFor({ state: 'visible' })
  await page.waitForFunction(() => document.querySelectorAll('.dsh-recent-row').length === 10)
  const titles = await recent.locator('.dsh-recent-row .dsh-recent-title').allTextContents()
  // Rows are identified by Session, not by title: a cold Session without a
  // projection-cache entry falls back to its cwd basename in the official list.
  const sessionIds = await recent.locator('.dsh-recent-row').evaluateAll(
    rows => rows.map(row => row.getAttribute('data-dsh-recent-session') ?? ''),
  )
  const header = recent.getByRole('button', { name: 'Recent', exact: true })
  await header.click()
  const collapsed = await header.getAttribute('aria-expanded') === 'false'
    && !await recent.locator('.dsh-recent-row').first().isVisible()
  await header.click()
  const expanded = await header.getAttribute('aria-expanded') === 'true'
    && await recent.locator('.dsh-recent-row').first().isVisible()

  const nativeRow = (id: string): Locator => page.locator(`[role="treeitem"][data-dsh-recent-session="${id}"]`)

  const first = recent.locator('.dsh-recent-row').first()
  await first.click()
  await page.waitForFunction(() => document.querySelector('.dsh-recent-row[aria-current="page"]'))
  await nativeRow(sessionIds[0]!).waitFor({ state: 'visible' })
  await page.waitForFunction(() => document.querySelector('[role="treeitem"][data-dsh-recent-selected]'))
  const selectionLinked = await nativeRow(sessionIds[0]!).getAttribute('data-dsh-recent-selected') !== null
    && await nativeRow(sessionIds[0]!).getAttribute('aria-selected') === 'true'
    && await first.getAttribute('aria-current') === 'page'
  // Hover a different Session so the clicked row's focus cannot satisfy this check.
  const second = recent.locator('.dsh-recent-row').nth(1)
  await nativeRow(sessionIds[1]!).hover()
  const hoverLinked = await second.getAttribute('data-dsh-recent-hover') !== null
    && await first.getAttribute('data-dsh-recent-hover') === null
  const styleTags = await page.locator('style[data-plugin="dsh-recent"]').count()
  return { sessionIds, titles, collapsed, expanded, selectionLinked, hoverLinked, styleTags }
}

export const closeDsh: BrowserCommand<[], void> = async (context) => {
  const session = sessions.get(context.sessionId)
  if (!session)
    return

  sessions.delete(context.sessionId)
  try {
    await session.page?.close()
  }
  finally {
    await session.scaffold.close()
  }
}
