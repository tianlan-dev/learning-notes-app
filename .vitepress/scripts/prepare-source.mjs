import { constants } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, '../..')
const notesSource = path.join(projectRoot, 'learning-notes')
const generatedSource = path.join(projectRoot, '.vitepress-src')
const generatedPublic = path.join(generatedSource, 'public')
const staticPublic = path.join(projectRoot, '.vitepress', 'public')

const ignoredDirectories = new Set([
  '.git',
  '.obsidian',
  '.claude',
  '.claudian',
  '.vitepress',
  '.vitepress-src',
  'node_modules'
])

async function exists(filePath) {
  try {
    await fs.access(filePath, constants.F_OK)
    return true
  } catch {
    return false
  }
}

async function copyMarkdownDirectory(sourceDir, targetDir) {
  await fs.mkdir(targetDir, { recursive: true })

  const entries = await fs.readdir(sourceDir, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name) || entry.name === '_resources') {
        continue
      }

      await copyMarkdownDirectory(
        path.join(sourceDir, entry.name),
        path.join(targetDir, entry.name)
      )
      continue
    }

    if (!entry.isFile() || !entry.name.endsWith('.md') || entry.name === 'AGENTS.md') {
      continue
    }

    const targetName = entry.name === 'README.md' ? 'index.md' : entry.name
    await fs.copyFile(path.join(sourceDir, entry.name), path.join(targetDir, targetName))
  }
}

async function linkResources() {
  await fs.rm(generatedPublic, { recursive: true, force: true })
  await fs.mkdir(generatedPublic, { recursive: true })

  if (await exists(staticPublic)) {
    await fs.cp(staticPublic, generatedPublic, {
      recursive: true,
      force: true,
      filter: source => path.basename(source) !== '_resources'
    })
  }

  const resourcesDir = path.join(notesSource, '_resources')
  if (await exists(resourcesDir)) {
    await fs.symlink(resourcesDir, path.join(generatedPublic, '_resources'), 'dir')
  }
}

await fs.rm(generatedSource, { recursive: true, force: true })
await copyMarkdownDirectory(notesSource, generatedSource)
await linkResources()
