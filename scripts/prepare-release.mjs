import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)+$|^\d+\.\d+\.\d+$/

function fail(message) {
  console.error(`error: ${message}`)
  process.exit(1)
}

const version = process.argv[2]
if (!version) fail('usage: npm run release:prepare -- <version> (e.g. 1.1.0)')
if (!SEMVER.test(version)) fail(`invalid semver: ${version}`)

const dirty = execSync('git status --porcelain', { encoding: 'utf8' }).trim()
if (dirty) fail('working tree is not clean — commit or stash your changes first')

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
if (version === pkg.version) fail(`version ${version} is already the current version`)

const changelog = readFileSync('CHANGELOG.md', 'utf8')
if (changelog.includes(`## [${version}]`)) {
  fail(`CHANGELOG.md already has a [${version}] section`)
}

const unreleasedStart = changelog.indexOf('## [Unreleased]')
if (unreleasedStart === -1) fail('no [Unreleased] section found in CHANGELOG.md')

const nextHeading = changelog.indexOf('\n## [', unreleasedStart)
const unreleasedBody = changelog
  .slice(
    unreleasedStart + '## [Unreleased]'.length,
    nextHeading === -1 ? undefined : nextHeading
  )
  .trim()

if (!unreleasedBody) fail('[Unreleased] section is empty — nothing to release')

const today = new Date().toISOString().slice(0, 10)
const replacement = `## [Unreleased]\n\n## [${version}] - ${today}\n\n${unreleasedBody}\n`
const updatedChangelog =
  changelog.slice(0, unreleasedStart) +
  replacement +
  (nextHeading === -1 ? '\n' : changelog.slice(nextHeading))

writeFileSync('CHANGELOG.md', updatedChangelog)
execSync(`npm version ${version} --no-git-tag-version`, { stdio: 'inherit' })

console.log(`\nrelease ${version} prepared (${today})`)
console.log('\nnext steps:')
console.log('  git add CHANGELOG.md package.json package-lock.json')
console.log(`  git commit -m "chore: release v${version}"`)
console.log(`  git tag v${version}`)
console.log('  git push && git push origin <tag>')
