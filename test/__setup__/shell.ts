import type { ChildProcess } from 'node:child_process'
import type { Page } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { setTimeout } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { x } from 'tinyexec'
import { seedRecentSessions } from './fixtures'
import { dshCommand, exchangeProcessLaunchToken, freePort, stop, trustedProcessLaunchUrl } from './shell.utils'

export interface ShellScaffold {
  baseUrl: string
  processLaunchUrl: string
  home: string
  api: (path: string, init?: RequestInit) => Promise<Response>
  close: () => Promise<void>
}

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url))
const DSH_VERSION = '0.2.2-rc.1'

export function logs(page: Page): { errors: () => string[] } {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const location = msg.location().url
      errors.push(location ? `${msg.text()} (${location})` : msg.text())
    }
  })
  page.on('response', (response) => {
    if (response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`)
  })
  page.on('pageerror', err => errors.push(String(err)))
  return { errors: () => [...errors] }
}

export async function launchShell(): Promise<ShellScaffold> {
  const { command, args } = dshCommand()
  const home = mkdtempSync(join(tmpdir(), 'dsh-e2e-home-'))
  const env = { ...process.env, DSH_HOME: home, CI: 'true' }
  let child: ChildProcess | undefined
  let closed = false
  const close = async (): Promise<void> => {
    if (closed)
      return
    closed = true
    try {
      if (child)
        await stop(child)
    }
    finally {
      rmSync(home, { recursive: true, force: true })
    }
  }

  try {
    const version = await x(command, [...args, '--version'], {
      timeout: 30_000,
      throwOnError: true,
      nodeOptions: { cwd: REPO_ROOT, env },
    })
    if (version.stdout.trim() !== DSH_VERSION)
      throw new Error(`DSH E2E requires official CLI ${DSH_VERSION}, received ${JSON.stringify(version.stdout.trim())}`)

    await x('pnpm', ['run', 'build'], {
      timeout: 300_000,
      throwOnError: true,
      nodeOptions: { cwd: REPO_ROOT, env, stdio: 'inherit' },
    })
    // Build explicitly so pack cannot run prepare and modify hooks or global skills.
    await x('pnpm', ['pack', '--config.ignore-scripts=true', '--pack-destination', home], {
      timeout: 300_000,
      throwOnError: true,
      nodeOptions: { cwd: REPO_ROOT, env, stdio: 'inherit' },
    })
    const tarballs = readdirSync(home).filter(name => name.endsWith('.tgz'))
    if (tarballs.length !== 1)
      throw new Error(`pnpm pack produced ${tarballs.length} tarballs, expected one`)
    const tarball = join(home, tarballs[0]!)
    await x(command, [...args, 'plugin', '--profile', 'web', 'add', '--ignore-scripts', tarball], {
      timeout: 300_000,
      throwOnError: true,
      nodeOptions: { cwd: REPO_ROOT, env, stdio: 'inherit' },
    })

    await seedRecentSessions(home)

    const port = await freePort()
    const baseUrl = `http://127.0.0.1:${port}`
    child = spawn(command, [...args, '--profile', 'web', '--port', String(port), '--no-open'], {
      cwd: process.env.DSH_E2E_DSH_CWD ?? REPO_ROOT,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
    })
    let spawnError: Error | undefined
    child.once('error', (error) => {
      spawnError = error
    })
    let processLaunchUrl = ''
    let startupOutput = ''
    for (const stream of [child.stdout, child.stderr]) {
      stream?.on('data', (chunk: Uint8Array) => {
        startupOutput = (startupOutput + chunk.toString()).slice(-8192)
        for (const line of startupOutput.split(/\r?\n/u)) {
          const match = /^dsh web:\s+(https?:\/\/\S+)\s*$/u.exec(line)
          if (match && trustedProcessLaunchUrl(baseUrl, match[1]!) !== null)
            processLaunchUrl = match[1]!
        }
      })
    }

    const deadline = Date.now() + 120_000
    for (; ;) {
      if (spawnError)
        throw spawnError
      if (child.exitCode !== null || child.signalCode !== null)
        throw new Error(`dsh exited ${child.exitCode ?? child.signalCode}:\n${startupOutput.slice(-2000)}`)
      let ready = false
      if (processLaunchUrl) {
        try {
          const response = await fetch(baseUrl, { signal: AbortSignal.timeout(2000) })
          ready = response.ok || response.status === 401
          await response.body?.cancel()
        }
        catch {
          // Connection failures are expected while the server is booting.
        }
      }
      if (ready)
        break
      if (Date.now() > deadline)
        throw new Error(`dsh boot timeout (startup URL=${processLaunchUrl ? 'ready' : 'missing'}):\n${startupOutput.slice(-2000)}`)
      await setTimeout(1000)
    }

    const session = await exchangeProcessLaunchToken(baseUrl, processLaunchUrl)
    const cookieHeader = session ? `${session.cookie.name}=${session.cookie.value}` : undefined
    return {
      baseUrl,
      processLaunchUrl,
      home,
      api: async (path: string, init: RequestInit = {}) => {
        const headers = new Headers(init.headers)
        if (cookieHeader)
          headers.set('cookie', cookieHeader)
        return fetch(new URL(path, baseUrl), {
          ...init,
          headers,
          signal: init.signal ?? AbortSignal.timeout(30_000),
        })
      },
      close,
    }
  }
  catch (error) {
    try {
      await close()
    }
    catch (cleanupError) {
      throw new AggregateError([error, cleanupError], 'DSH E2E startup and cleanup failed')
    }
    throw error
  }
}
