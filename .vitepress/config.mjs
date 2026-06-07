import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitepress'

const configDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(configDir, '..')
const generatedSource = path.join(projectRoot, '.vitepress-src')

const ignoredDirectories = new Set([
  '.git',
  '.obsidian',
  '.claude',
  '.claudian',
  '.vitepress',
  '.vitepress-src',
  'node_modules',
  '_resources'
])

const homeNavItem = {
  text: '首页',
  link: '/'
}

function compareByText(left, right) {
  return left.text.localeCompare(right.text, 'zh-CN', {
    numeric: true,
    sensitivity: 'base'
  })
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/')
}

function encodePathLink(link) {
  return link
    .split('/')
    .map((segment, index) => {
      if (index === 0 || segment === '') {
        return segment
      }

      return encodeURIComponent(segment)
    })
    .join('/')
}

function markdownPathToLink(relativePath) {
  const posixPath = toPosixPath(relativePath)

  if (posixPath === 'README.md' || posixPath === 'index.md') {
    return '/'
  }

  if (posixPath.endsWith('/README.md')) {
    return encodePathLink(`/${posixPath.replace(/\/README\.md$/, '/')}`)
  }

  if (posixPath.endsWith('/index.md')) {
    return encodePathLink(`/${posixPath.replace(/\/index\.md$/, '/')}`)
  }

  return encodePathLink(`/${posixPath.replace(/\.md$/, '')}`)
}

function createTreeNode(text, relativePath = '') {
  return {
    text,
    relativePath,
    link: undefined,
    children: new Map()
  }
}

function addMarkdownFile(rootNode, relativePath) {
  const parts = toPosixPath(relativePath).split('/')
  let currentNode = rootNode

  for (const part of parts.slice(0, -1)) {
    if (!currentNode.children.has(part)) {
      currentNode.children.set(part, createTreeNode(part))
    }

    currentNode = currentNode.children.get(part)
  }

  const fileName = parts.at(-1)
  if (fileName === 'README.md' || fileName === 'index.md') {
    currentNode.link = markdownPathToLink(relativePath)
    return
  }

  const text = fileName.replace(/\.md$/, '')
  currentNode.children.set(fileName, {
    text,
    relativePath,
    link: markdownPathToLink(relativePath),
    children: new Map()
  })
}

function walkMarkdownFiles(directory, baseDirectory = directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true })
  const markdownFiles = []

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name)) {
        continue
      }

      markdownFiles.push(...walkMarkdownFiles(path.join(directory, entry.name), baseDirectory))
      continue
    }

    if (!entry.isFile() || !entry.name.endsWith('.md') || entry.name === 'AGENTS.md') {
      continue
    }

    markdownFiles.push(path.relative(baseDirectory, path.join(directory, entry.name)))
  }

  return markdownFiles
}

function treeNodeToSidebarItem(node) {
  const childItems = Array.from(node.children.values())
    .map(treeNodeToSidebarItem)
    .sort(compareByText)

  const item = {
    text: node.text
  }

  if (node.link) {
    item.link = node.link
  }

  if (childItems.length > 0) {
    item.collapsed = true
    item.items = childItems
  }

  return item
}

function treeNodeToNavItem(node) {
  const childItems = Array.from(node.children.values())
    .map(treeNodeToNavItem)
    .sort(compareByText)

  const item = {
    text: node.text
  }

  if (node.link) {
    item.link = node.link
  }

  if (childItems.length > 0) {
    item.items = childItems
  }

  return item
}

function isMarkdownNote(entry) {
  return entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'AGENTS.md'
}

function getDirectoryLabel(relativeDirectory) {
  if (!relativeDirectory) {
    return '首页'
  }

  return path.basename(relativeDirectory)
}

function getDirectoryLink(relativeDirectory) {
  if (!relativeDirectory) {
    return '/'
  }

  return encodePathLink(`/${toPosixPath(relativeDirectory)}/`)
}

function getDirectorySidebarKey(relativeDirectory) {
  if (!relativeDirectory) {
    return '/'
  }

  return `/${toPosixPath(relativeDirectory)}/`
}

function createSidebarItemsForDirectory(directory, relativeDirectory = '') {
  const entries = fs.readdirSync(directory, { withFileTypes: true })
  const items = []
  const hasIndex = entries.some((entry) => {
    return entry.isFile() && (entry.name === 'README.md' || entry.name === 'index.md')
  })

  if (hasIndex) {
    items.push({
      text: getDirectoryLabel(relativeDirectory),
      link: getDirectoryLink(relativeDirectory)
    })
  }

  const childDirectories = entries
    .filter((entry) => entry.isDirectory() && !ignoredDirectories.has(entry.name))
    .map((entry) => {
      const childRelativeDirectory = relativeDirectory
        ? path.join(relativeDirectory, entry.name)
        : entry.name

      return {
        text: entry.name,
        link: getDirectoryLink(childRelativeDirectory)
      }
    })
    .sort(compareByText)

  const childFiles = entries
    .filter((entry) => {
      return isMarkdownNote(entry) && entry.name !== 'README.md' && entry.name !== 'index.md'
    })
    .map((entry) => {
      const relativePath = relativeDirectory
        ? path.join(relativeDirectory, entry.name)
        : entry.name

      return {
        text: entry.name.replace(/\.md$/, ''),
        link: markdownPathToLink(relativePath)
      }
    })
    .sort(compareByText)

  items.push(...childDirectories, ...childFiles)

  return items
}

function addDirectorySidebars(sidebar, directory, relativeDirectory = '') {
  const entries = fs.readdirSync(directory, { withFileTypes: true })
  const items = createSidebarItemsForDirectory(directory, relativeDirectory)

  if (items.length > 0) {
    sidebar[getDirectorySidebarKey(relativeDirectory)] = [
      {
        text: getDirectoryLabel(relativeDirectory),
        items
      }
    ]
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || ignoredDirectories.has(entry.name)) {
      continue
    }

    const childRelativeDirectory = relativeDirectory
      ? path.join(relativeDirectory, entry.name)
      : entry.name

    addDirectorySidebars(
      sidebar,
      path.join(directory, entry.name),
      childRelativeDirectory
    )
  }
}

function createNavigation() {
  const rootNode = createTreeNode('Learning Notes')

  for (const markdownFile of walkMarkdownFiles(generatedSource)) {
    addMarkdownFile(rootNode, markdownFile)
  }

  const rootChildren = Array.from(rootNode.children.values()).sort(compareByText)
  const topLevelItems = rootChildren.map(treeNodeToSidebarItem)
  const topLevelNavItems = rootChildren.map(treeNodeToNavItem)

  return {
    nav: [
      homeNavItem,
      ...topLevelNavItems
    ],
    sidebar: [
      homeNavItem,
      ...topLevelItems
    ]
  }
}

const generatedNavigation = createNavigation()

export default defineConfig({
  lang: 'zh-CN',
  title: 'Learning Notes',
  description: '跨学科中文学习笔记',
  srcDir: '.vitepress-src',
  head: [
    ['link', { rel: 'icon', href: '/favicon.svg?v=20260601a', type: 'image/svg+xml' }]
  ],
  cleanUrls: true,
  ignoreDeadLinks: true,
  srcExclude: ['AGENTS.md'],
  vite: {
    plugins: [
      {
        name: 'learning-notes-route-compat',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (!req.url) {
              next()
              return
            }

            const accept = req.headers.accept || ''
            if (!accept.includes('text/html')) {
              next()
              return
            }

            const url = new URL(req.url, 'http://localhost')
            if (url.pathname === '/README' || url.pathname === '/README.md') {
              res.statusCode = 302
              res.setHeader('Location', `/${url.search}${url.hash}`)
              res.end()
              return
            }

            if (url.pathname.endsWith('/README') || url.pathname.endsWith('/README.md')) {
              url.pathname = url.pathname.replace(/\/README(?:\.md)?$/, '/')
              res.statusCode = 302
              res.setHeader('Location', `${url.pathname}${url.search}${url.hash}`)
              res.end()
              return
            }

            if (url.pathname === '/index' || url.pathname === '/index.md') {
              res.statusCode = 302
              res.setHeader('Location', `/${url.search}${url.hash}`)
              res.end()
              return
            }

            if (url.pathname.endsWith('/index') || url.pathname.endsWith('/index.md')) {
              url.pathname = url.pathname.replace(/\/index(?:\.md)?$/, '/')
              res.statusCode = 302
              res.setHeader('Location', `${url.pathname}${url.search}${url.hash}`)
              res.end()
              return
            }

            if (url.pathname.endsWith('.md')) {
              url.pathname = url.pathname.replace(/\.md$/, '')
              res.statusCode = 302
              res.setHeader('Location', `${url.pathname}${url.search}${url.hash}`)
              res.end()
              return
            }

            next()
          })
        }
      }
    ],
    server: {
      allowedHosts: ['note.skylan.dev'],
      watch: {
        ignored: ['**/.vitepress/cache/**', '**/.vitepress/dist/**']
      }
    }
  },
  themeConfig: {
    nav: generatedNavigation.nav,
    sidebar: generatedNavigation.sidebar,
    outline: {
      level: [2, 3],
      label: '本页目录'
    },
    docFooter: {
      prev: '上一页',
      next: '下一页'
    },
    darkModeSwitchLabel: '外观',
    sidebarMenuLabel: '菜单',
    returnToTopLabel: '回到顶部'
  },
  markdown: {
    config(md) {
      const defaultFence = md.renderer.rules.fence
      const defaultLinkOpen = md.renderer.rules.link_open

      md.renderer.rules.fence = (tokens, idx, options, env, self) => {
        const token = tokens[idx]
        const language = token.info.trim().split(/\s+/)[0]

        if (language === 'mermaid') {
          return `<MermaidDiagram code="${md.utils.escapeHtml(token.content)}"></MermaidDiagram>`
        }

        return defaultFence(tokens, idx, options, env, self)
      }

      md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
        const hrefIndex = tokens[idx].attrIndex('href')

        if (hrefIndex >= 0) {
          const href = tokens[idx].attrs[hrefIndex][1]

          if (href.startsWith('/')) {
            tokens[idx].attrs[hrefIndex][1] = href
              .replace(/\/README(?:\.md)?(?=($|[?#]))/, '/')
              .replace(/\/index(?:\.md)?(?=($|[?#]))/, '/')
              .replace(/\.md(?=($|[?#]))/, '')
          }
        }

        return defaultLinkOpen
          ? defaultLinkOpen(tokens, idx, options, env, self)
          : self.renderToken(tokens, idx, options)
      }
    }
  }
})
