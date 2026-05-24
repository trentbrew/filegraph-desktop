import net from 'node:net'
import { spawn } from 'node:child_process'

function isPortFree(port) {
  const canBind = (host) =>
    new Promise((resolve) => {
      const server = net
        .createServer()
        .once('error', () => resolve(false))
        .once('listening', () => {
          server.close(() => resolve(true))
        })
        .listen(port, host)
    })

  return Promise.all([canBind('127.0.0.1'), canBind('::1')]).then(([v4Free, v6Free]) => v4Free && v6Free)
}

async function findFreePort(startPort) {
  const maxTries = 50
  for (let i = 0; i < maxTries; i++) {
    const port = startPort + i
    // eslint-disable-next-line no-await-in-loop
    const free = await isPortFree(port)
    if (free) return port
  }
  throw new Error(`No free port found in range ${startPort}-${startPort + maxTries - 1}`)
}

async function main() {
  const basePort = Number(process.env.TAURI_VITE_PORT || 1997)
  const port = await findFreePort(basePort)
  const hmrPort = Number(process.env.TAURI_VITE_HMR_PORT || port + 1)

  const devUrl = `http://localhost:${port}`
  const configOverride = JSON.stringify({ build: { devUrl } })

  const child = spawn('pnpm', ['tauri', 'dev', '--config', configOverride], {
    stdio: 'inherit',
    env: {
      ...process.env,
      TAURI_VITE_PORT: String(port),
      TAURI_VITE_HMR_PORT: String(hmrPort),
    },
  })

  child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal)
    process.exit(code ?? 0)
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
