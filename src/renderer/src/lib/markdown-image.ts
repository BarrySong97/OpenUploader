type FilePayload = {
  name: string
  mimeType: string
  data: Uint8Array
}

type ImageCandidate = { kind: 'remote'; url: string } | { kind: 'local'; path: string }

type FileWithPath = File & { path?: string }

const markdownExtensions = ['.md', '.markdown', '.mdx']

type ProgressStage = 'scan' | 'load'

type ExtractOptions = {
  tempDir?: string
  onStage?: (stage: ProgressStage) => void
  onProgress?: (current: number, total: number) => void
}

export function isMarkdownFile(file: File): boolean {
  const name = file.name.toLowerCase()
  return markdownExtensions.some((ext) => name.endsWith(ext))
}

export async function extractMarkdownImagesFromFiles(
  files: File[],
  options?: ExtractOptions
): Promise<File[]> {
  const markdownFiles = files.filter(isMarkdownFile)
  if (markdownFiles.length === 0) return []

  options?.onStage?.('scan')
  options?.onProgress?.(0, markdownFiles.length)

  const candidates: ImageCandidate[] = []
  for (let index = 0; index < markdownFiles.length; index += 1) {
    const file = markdownFiles[index]
    const fileCandidates = await extractMarkdownImageCandidates(file)
    candidates.push(...fileCandidates)
    options?.onProgress?.(index + 1, markdownFiles.length)
  }

  const uniqueCandidates = dedupeCandidates(candidates)
  if (uniqueCandidates.length === 0) return []

  options?.onStage?.('load')
  options?.onProgress?.(0, uniqueCandidates.length)

  const results: File[] = []
  for (let index = 0; index < uniqueCandidates.length; index += 1) {
    try {
      const file = await loadCandidate(uniqueCandidates[index], options)
      results.push(file)
    } catch {
      // Ignore individual failures
    }
    options?.onProgress?.(index + 1, uniqueCandidates.length)
  }

  return dedupeFiles(results)
}

async function extractMarkdownImageCandidates(file: File): Promise<ImageCandidate[]> {
  const content = await file.text()
  const sources = extractMarkdownImageSources(content)
  if (sources.length === 0) return []

  const filePath = (file as FileWithPath).path
  return resolveImageCandidates(sources, filePath)
}

function extractMarkdownImageSources(markdown: string): string[] {
  const results = new Set<string>()

  const inlineRegex = /!\[[^\]]*?\]\(([^)]+)\)/g
  for (const match of markdown.matchAll(inlineRegex)) {
    const target = cleanupImageTarget(match[1])
    if (target) results.add(target)
  }

  const defRegex = /^\s*\[([^\]]+)\]:\s*(\S+)(?:\s+["'(].*["')])?/gm
  const definitions = new Map<string, string>()
  for (const match of markdown.matchAll(defRegex)) {
    const label = match[1].trim().toLowerCase()
    const target = cleanupImageTarget(match[2])
    if (label && target) {
      definitions.set(label, target)
    }
  }

  const refRegex = /!\[([^\]]*?)\]\[([^\]]*)\]/g
  for (const match of markdown.matchAll(refRegex)) {
    const label = (match[2] || match[1]).trim().toLowerCase()
    const target = definitions.get(label)
    if (target) results.add(target)
  }

  const htmlRegex = /<img\s+[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/gi
  for (const match of markdown.matchAll(htmlRegex)) {
    const target = cleanupImageTarget(match[1])
    if (target) results.add(target)
  }

  return Array.from(results)
}

function cleanupImageTarget(raw: string | undefined): string | null {
  if (!raw) return null
  let target = raw.trim()
  if (!target) return null
  if (target.startsWith('<') && target.endsWith('>')) {
    target = target.slice(1, -1).trim()
  }
  const spaceIndex = target.search(/\s+/)
  if (spaceIndex > -1) {
    target = target.slice(0, spaceIndex)
  }
  return target || null
}

function resolveImageCandidates(sources: string[], markdownPath?: string): ImageCandidate[] {
  const baseDir = markdownPath ? getDirectoryPath(markdownPath) : ''
  const candidates: ImageCandidate[] = []

  for (const source of sources) {
    if (!source || source.startsWith('data:')) continue

    if (isRemoteUrl(source)) {
      candidates.push({ kind: 'remote', url: source })
      continue
    }

    const localTarget = resolveLocalSource(source, baseDir)
    if (!localTarget) continue
    const normalized = normalizePath(localTarget)
    candidates.push({ kind: 'local', path: normalized })
  }

  return candidates
}

function resolveLocalSource(source: string, baseDir: string): string | null {
  if (source.startsWith('file://')) {
    return fileUrlToPath(source)
  }

  const cleaned = stripQueryAndHash(source)
  if (isAbsolutePath(cleaned)) return cleaned

  if (!baseDir) return null
  return resolveRelativePath(cleaned, baseDir)
}

function stripQueryAndHash(source: string): string {
  const index = Math.min(
    ...[source.indexOf('?'), source.indexOf('#')].filter((value) => value !== -1)
  )
  return index === Infinity ? source : source.slice(0, index)
}

function isRemoteUrl(source: string): boolean {
  return /^https?:\/\//i.test(source)
}

function isAbsolutePath(source: string): boolean {
  if (source.startsWith('/')) return true
  return /^[a-zA-Z]:[\\/]/.test(source)
}

function resolveRelativePath(relativePath: string, baseDir: string): string | null {
  try {
    const baseUrl = toFileUrl(ensureTrailingSlash(baseDir))
    const resolved = new URL(relativePath, baseUrl)
    return fileUrlToPath(resolved.toString())
  } catch {
    return null
  }
}

function toFileUrl(filePath: string): string {
  const normalized = normalizePath(filePath)
  const encoded = encodeURI(normalized)
  if (encoded.startsWith('/')) {
    return `file://${encoded}`
  }
  return `file:///${encoded}`
}

function fileUrlToPath(fileUrl: string): string | null {
  try {
    const url = new URL(fileUrl)
    let pathname = decodeURIComponent(url.pathname)
    if (/^\/[a-zA-Z]:/.test(pathname)) {
      pathname = pathname.slice(1)
    }
    return pathname
  } catch {
    return null
  }
}

function ensureTrailingSlash(path: string): string {
  const normalized = normalizePath(path)
  return normalized.endsWith('/') ? normalized : `${normalized}/`
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/')
}

function getDirectoryPath(filePath: string): string {
  const normalized = normalizePath(filePath)
  const index = normalized.lastIndexOf('/')
  return index === -1 ? '' : normalized.slice(0, index)
}

function dedupeCandidates(candidates: ImageCandidate[]): ImageCandidate[] {
  const results: ImageCandidate[] = []
  const seen = new Set<string>()
  for (const candidate of candidates) {
    const key = candidate.kind === 'remote' ? `remote:${candidate.url}` : `local:${candidate.path}`
    if (seen.has(key)) continue
    seen.add(key)
    results.push(candidate)
  }
  return results
}

async function loadCandidate(candidate: ImageCandidate, options?: ExtractOptions): Promise<File> {
  if (candidate.kind === 'local') {
    const payload = await window.api.readFile(candidate.path)
    return createFileFromPayload(payload)
  }

  if (!window.api.downloadRemoteFile || !options?.tempDir) {
    throw new Error('downloadRemoteFile is not available')
  }

  const payload = await window.api.downloadRemoteFile(candidate.url, options.tempDir)
  const filePayload = await window.api.readFile(payload.path)
  return createFileFromPayload({
    name: payload.name,
    mimeType: payload.mimeType,
    data: filePayload.data
  })
}

function createFileFromPayload(payload: FilePayload): File {
  const data = payload.data instanceof Uint8Array ? payload.data : new Uint8Array(payload.data)
  const arrayBuffer = Uint8Array.from(data).buffer
  return new File([arrayBuffer], payload.name, { type: payload.mimeType || '' })
}

function dedupeFiles(files: File[]): File[] {
  const seen = new Set<string>()
  const results: File[] = []
  for (const file of files) {
    const key = `${file.name}:${file.size}:${file.lastModified}`
    if (seen.has(key)) continue
    seen.add(key)
    results.push(file)
  }
  return results
}
