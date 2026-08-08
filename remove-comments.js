import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

function processDir(dir) {
  const files = fs.readdirSync(dir)
  for (const file of files) {
    const fullPath = path.join(dir, file)
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath)
    } else if (fullPath.match(/\.(ts|tsx|js|css)$/)) {
      let content = fs.readFileSync(fullPath, 'utf8')

      // Remove // comments, except if they start with /// (like reference path)
      content = content.replace(/(?<!:)\/\/ (?!@ts-ignore|\/).*$/gm, '')

      // Remove @ts-ignore comments too since the user asked to remove all except jsdocs
      content = content.replace(/\/\/ @ts-ignore.*$/gm, '')

      // Remove /* ... */ comments that are NOT /** ... */
      content = content.replace(/\/\*(?!\*)[^]*?\*\//g, '')

      // Remove empty lines that were left behind by comment removal
      content = content.replace(/^\s*[\r\n]/gm, '')

      fs.writeFileSync(fullPath, content)
    }
  }
}

processDir(path.join(currentDir, 'src'))
console.log('Comments removed')
