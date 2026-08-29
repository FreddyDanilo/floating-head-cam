#!/usr/bin/env node
import os from 'node:os'
import { spawn } from 'node:child_process'
import readline from 'node:readline'

const platform = os.platform() // win32 | linux | darwin
const userName =
  process.env.USER ||
  process.env.USERNAME ||
  process.env.LOGNAME ||
  os.userInfo?.().username ||
  'utilizador'

function run(cmd, args = [], opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      shell: platform === 'win32',
      ...opts
    })
    child.on('close', (code) => resolve(code ?? 1))
    child.on('error', () => resolve(1))
  })
}

function runCapture(cmd, args = []) {
  return new Promise((resolve) => {
    let out = ''
    const child = spawn(cmd, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: platform === 'win32'
    })

    child.stdout.on('data', (d) => (out += d.toString()))
    child.stderr.on('data', (d) => (out += d.toString()))

    child.on('close', (code) => resolve({ code: code ?? 1, output: out.trim() }))
    child.on('error', () => resolve({ code: 1, output: '' }))
  })
}

async function hasMake() {
  if (platform === 'win32') {
    const where = await runCapture('where', ['make'])
    return where.code === 0
  }
  const which = await runCapture('which', ['make'])
  return which.code === 0
}

function askYesNo(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      const v = answer.trim().toLowerCase()
      resolve(v === 's' || v === 'sim' || v === 'y' || v === 'yes')
    })
  })
}

async function commandExists(cmd) {
  if (platform === 'win32') {
    const r = await runCapture('where', [cmd])
    return r.code === 0
  }
  const r = await runCapture('which', [cmd])
  return r.code === 0
}

async function installLinux() {
  console.log('\n[Linux] A detetar gestor de pacotes...')
  if (await commandExists('apt')) {
    if ((await run('sudo', ['apt', 'update'])) !== 0) return 1
    return run('sudo', ['apt', 'install', '-y', 'build-essential'])
  }
  if (await commandExists('dnf')) return run('sudo', ['dnf', 'install', '-y', 'make', 'gcc', 'gcc-c++'])
  if (await commandExists('yum')) return run('sudo', ['yum', 'install', '-y', 'make', 'gcc', 'gcc-c++'])
  if (await commandExists('pacman')) return run('sudo', ['pacman', '-S', '--needed', 'base-devel'])
  if (await commandExists('zypper')) return run('sudo', ['zypper', 'install', '-y', 'make', 'gcc', 'gcc-c++'])
  return 1
}

async function installMac() {
  console.log('\n[macOS] A tentar instalar Command Line Tools...')
  // pode abrir prompt gráfico e devolver código não determinístico; tentamos na mesma
  await run('xcode-select', ['--install'])

  // verifica novamente
  if (await hasMake()) return 0

  if (await commandExists('brew')) {
    return run('brew', ['install', 'make'])
  }

  console.log('Homebrew não encontrado. Instala o Homebrew ou conclui as Command Line Tools da Apple.')
  return 1
}

async function installWindows() {
  console.log('\n[Windows] A detetar gestor de pacotes...')
  if (await commandExists('winget')) {
    // pacotes possíveis variam; esta opção costuma funcionar em muitos ambientes
    let code = await run('winget', ['install', '-e', '--id', 'GnuWin32.Make'])
    if (code === 0) return 0
  }
  if (await commandExists('choco')) {
    const code = await run('choco', ['install', 'make', '-y'])
    if (code === 0) return 0
  }
  if (await commandExists('scoop')) {
    const code = await run('scoop', ['install', 'make'])
    if (code === 0) return 0
  }
  return 1
}

async function main() {
  console.log('🔎 A procurar o comando "make" para permitir o uso de "make ..."\n')

  if (await hasMake()) {
    console.log('✅ make já está instalado.')
    process.exit(0)
  }

  console.log('⚠️  make não foi encontrado.')
  const consent = await askYesNo(`${userName}, posso instalar o make agora? (s/N): `)
  if (!consent) {
    console.log('Instalação cancelada pelo utilizador.')
    process.exit(1)
  }

  let code = 1
  if (platform === 'linux') code = await installLinux()
  else if (platform === 'darwin') code = await installMac()
  else if (platform === 'win32') code = await installWindows()
  else {
    console.log(`Sistema não suportado: ${platform}`)
    process.exit(1)
  }

  if (code !== 0) {
    console.log('\n❌ Não foi possível instalar automaticamente o make.')
    process.exit(1)
  }

  console.log('\n🔁 A validar instalação...')
  if (await hasMake()) {
    console.log('🎉 Sucesso: make instalado e disponível.')
    process.exit(0)
  }

  console.log('⚠️ make pode ter sido instalado, mas não está disponível nesta sessão.')
  console.log('Fecha e reabre o terminal e executa: make --version')
  process.exit(1)
}

main().catch((err) => {
  console.error('Erro inesperado:', err)
  process.exit(1)
})
