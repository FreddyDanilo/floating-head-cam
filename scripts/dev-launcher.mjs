import { spawn } from 'node:child_process'

const cmd = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const args = ['run', 'dev:raw']

function run(envExtra = {}) {
  return spawn(cmd, args, {
    stdio: 'inherit',
    env: { ...process.env, ...envExtra }
  })
}

let triedSafe = false
let child = run()

child.on('exit', (code, signal) => {
  const badExit = code !== 0 || signal
  if (badExit && !triedSafe) {
    triedSafe = true
    console.log('\n[launcher] normal mode failed, retrying with SAFE GPU mode...\n')
    child = run({ FHC_SAFE_GPU: '1' })
    child.on('exit', (c) => process.exit(c ?? 1))
    return
  }
  process.exit(code ?? 0)
})
