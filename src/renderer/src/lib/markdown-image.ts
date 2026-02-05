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

  // Match inline images: ![alt](url) or ![alt](url "title")
  // Handle nested brackets in alt text and balanced parentheses in URL
  const imageStarts = findMarkdownImageStarts(markdown)
  for (const start of imageStarts) {
    const content = extractBalancedParenContent(markdown, start.urlStart)
    if (content) {
      const target = cleanupImageTarget(content)
      if (target) results.add(target)
    }
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

/**
 * Find all markdown image starts (![...](
 * Handles nested brackets in alt text
 */
function findMarkdownImageStarts(
  markdown: string
): Array<{ index: number; altEnd: number; urlStart: number }> {
  const results: Array<{ index: number; altEnd: number; urlStart: number }> = []
  let i = 0

  while (i < markdown.length) {
    if (markdown[i] === '!' && markdown[i + 1] === '[') {
      // Found potential image start
      const altStart = i + 2
      let depth = 1
      let j = altStart

      // Find matching ] for alt text (handle nested brackets)
      while (j < markdown.length && depth > 0) {
        if (markdown[j] === '[') depth++
        else if (markdown[j] === ']') depth--
        j++
      }

      // Check if followed by (
      if (depth === 0 && markdown[j] === '(') {
        results.push({
          index: i,
          altEnd: j - 1,
          urlStart: j + 1
        })
        i = j + 1
        continue
      }
    }
    i++
  }

  return results
}

function cleanupImageTarget(raw: string | undefined): string | null {
  if (!raw) return null
  let target = raw.trim()
  if (!target) return null
  if (target.startsWith('<') && target.endsWith('>')) {
    target = target.slice(1, -1).trim()
  }
  // Only truncate at space if followed by a quote (indicating title in markdown)
  // e.g., 'url "title"' or "url 'title'"
  // Don't truncate URLs with spaces like 'download (3).png'
  const titleMatch = target.match(/\s+["']/)
  if (titleMatch && titleMatch.index !== undefined) {
    target = target.slice(0, titleMatch.index)
  }
  return target || null
}

/**
 * Extract content from balanced parentheses starting at the given index
 * Handles nested parentheses like "download (1).png"
 */
function extractBalancedParenContent(text: string, startIndex: number): string | null {
  let depth = 1
  let i = startIndex

  while (i < text.length && depth > 0) {
    const char = text[i]
    if (char === '(') {
      depth++
    } else if (char === ')') {
      depth--
    }
    i++
  }

  if (depth === 0) {
    // Exclude the closing parenthesis
    return text.slice(startIndex, i - 1)
  }

  return null
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

/**
 * Represents extracted markdown data including content and image source mappings
 */
export type MarkdownData = {
  fileName: string
  content: string
  imageSourceToFileName: Map<string, string>
}

/**
 * Extracts markdown files and their image data from a file list
 * Returns both the extracted image files and the markdown data for later replacement
 */
export async function extractMarkdownDataFromFiles(
  files: File[],
  options?: ExtractOptions
): Promise<{ files: File[]; markdownData: MarkdownData[] }> {
  const markdownFiles = files.filter(isMarkdownFile)
  if (markdownFiles.length === 0) return { files: [], markdownData: [] }

  options?.onStage?.('scan')
  options?.onProgress?.(0, markdownFiles.length)

  const candidates: ImageCandidate[] = []
  const markdownDataList: MarkdownData[] = []

  for (let index = 0; index < markdownFiles.length; index += 1) {
    const file = markdownFiles[index]
    const content = await file.text()
    const sources = extractMarkdownImageSources(content)

    // Build image source to file name mapping
    const imageSourceToFileName = new Map<string, string>()
    const filePath = (file as FileWithPath).path
    const fileCandidates = resolveImageCandidates(sources, filePath)

    for (const candidate of fileCandidates) {
      if (candidate.kind === 'local') {
        const fileName = getFileNameFromPath(candidate.path)
        // Map the original source to the file name
        for (const source of sources) {
          const resolved = resolveLocalSource(source, filePath ? getDirectoryPath(filePath) : '')
          if (resolved && normalizePath(resolved) === normalizePath(candidate.path)) {
            imageSourceToFileName.set(source, fileName)
          }
        }
      } else if (candidate.kind === 'remote') {
        // Map remote URLs to their file name (extracted from URL)
        const fileName = getFileNameFromUrl(candidate.url)
        // Map the original source URL to the file name
        for (const source of sources) {
          if (isRemoteUrl(source) && source === candidate.url) {
            imageSourceToFileName.set(source, fileName)
          }
        }
      }
    }

    markdownDataList.push({
      fileName: file.name,
      content,
      imageSourceToFileName
    })

    candidates.push(...fileCandidates)
    options?.onProgress?.(index + 1, markdownFiles.length)
  }

  const uniqueCandidates = dedupeCandidates(candidates)
  if (uniqueCandidates.length === 0) return { files: [], markdownData: markdownDataList }

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

  return { files: dedupeFiles(results), markdownData: markdownDataList }
}

/**
 * Replaces image sources in markdown content with new URLs
 * Handles both inline images ![alt](source) and HTML img tags <img src="source">
 * Keeps original source if no replacement mapping exists
 */
export function replaceMarkdownImageSources(
  content: string,
  replacements: Map<string, string>
): string {
  let result = content

  // Replace inline markdown images: ![alt](source)
  // Use manual parsing to handle parentheses in URLs
  const imageStarts = findMarkdownImageStarts(result)
  // Process in reverse order to preserve indices
  for (let i = imageStarts.length - 1; i >= 0; i--) {
    const start = imageStarts[i]
    const urlContent = extractBalancedParenContent(result, start.urlStart)
    if (!urlContent) continue

    const source = cleanupImageTarget(urlContent)
    if (!source) continue

    // Try exact match first
    let replacement = replacements.get(source)

    // If no exact match, try with the raw urlContent
    if (!replacement) {
      replacement = replacements.get(urlContent.trim())
    }

    if (replacement) {
      // Find the end of the URL (closing parenthesis)
      let depth = 1
      let endIndex = start.urlStart
      while (endIndex < result.length && depth > 0) {
        if (result[endIndex] === '(') depth++
        else if (result[endIndex] === ')') depth--
        endIndex++
      }

      // Extract alt text (altEnd points to ']', so we exclude it)
      const alt = result.slice(start.index + 2, start.altEnd)

      // Replace the entire image syntax
      result = result.slice(0, start.index) + `![${alt}](${replacement})` + result.slice(endIndex)
    }
  }

  // Replace HTML img tags: <img src="source">
  const htmlRegex = /<img\s+([^>]*?)src\s*=\s*["']([^"']+)["']([^>]*?)>/gi
  result = result.replace(htmlRegex, (match, before, source, after) => {
    // Try exact match first
    let replacement = replacements.get(source)

    // If no exact match, try with cleaned source
    if (!replacement) {
      const cleaned = cleanupImageTarget(source)
      if (cleaned) {
        replacement = replacements.get(cleaned)
      }
    }

    if (replacement) {
      return `<img ${before}src="${replacement}"${after}>`
    }
    return match
  })

  return result
}

/**
 * Extracts file name from a file path
 */
function getFileNameFromPath(filePath: string): string {
  const normalized = normalizePath(filePath)
  const index = normalized.lastIndexOf('/')
  return index === -1 ? normalized : normalized.slice(index + 1)
}

/**
 * Extracts file name from a URL
 */
function getFileNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const index = pathname.lastIndexOf('/')
    const fileName = index === -1 ? pathname : pathname.slice(index + 1)
    // Remove query parameters if present
    return fileName.split('?')[0] || 'image'
  } catch {
    // Fallback: extract from string if URL parsing fails
    const cleaned = url.split('?')[0]
    const index = cleaned.lastIndexOf('/')
    return index === -1 ? cleaned : cleaned.slice(index + 1)
  }
}
