import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const OUTPUT = 'build/release-notes.md'

function extractSection(changelog, title) {
  const lines = changelog.split('\n')
  const startIdx = lines.findIndex((line) => line.trim() === `## [${title}]`)
  if (startIdx === -1) return null

  let endIdx = lines.length
  for (let i = startIdx + 1; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (trimmed.startsWith('## [')) {
      endIdx = i
      break
    }
    if (/^\[[^\]]+\]:\s*\S/.test(trimmed)) {
      endIdx = i
      break
    }
  }
  return lines.slice(startIdx + 1, endIdx).join('\n').trim()
}

const version = JSON.parse(readFileSync('package.json', 'utf8')).version
const changelog = readFileSync('CHANGELOG.md', 'utf8')

const notes =
  extractSection(changelog, version) ??
  extractSection(changelog, 'Unreleased') ??
  `Release ${version}`

mkdirSync(dirname(OUTPUT), { recursive: true })
writeFileSync(OUTPUT, `${notes}\n`)
console.log(`Release notes for ${version} written to ${OUTPUT}`)
