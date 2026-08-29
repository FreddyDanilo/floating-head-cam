import fs from 'node:fs'
import path from 'node:path'

const buildDir = path.resolve('build')
const notesPath = path.join(buildDir, 'release-notes.md')
const pkgPath = path.resolve('package.json')

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function getVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
    return pkg.version || '0.0.0'
  } catch {
    return '0.0.0'
  }
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function template(version) {
  return `## Floating Head Cam ${version}

- Release notes geradas automaticamente.
- Data: ${today()}.
`
}

ensureDir(buildDir)

if (!fs.existsSync(notesPath) || fs.readFileSync(notesPath, 'utf8').trim().length === 0) {
  fs.writeFileSync(notesPath, template(getVersion()), 'utf8')
  console.log(`Created ${notesPath}`)
} else {
  console.log(`Using existing ${notesPath}`)
}
