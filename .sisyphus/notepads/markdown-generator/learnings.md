# Markdown Generator - Learnings

## Task 1: Extend markdown-image.ts

### Implementation Summary

Added three new exports to `src/renderer/src/lib/markdown-image.ts`:

1. **MarkdownData Type**
   - `fileName: string` - Name of the markdown file
   - `content: string` - Full markdown content
   - `imageSourceToFileName: Map<string, string>` - Maps original image sources to extracted file names

2. **extractMarkdownDataFromFiles() Function**
   - Signature: `(files: File[], options?: ExtractOptions) => Promise<{ files: File[]; markdownData: MarkdownData[] }>`
   - Returns both extracted image files AND markdown data for later replacement
   - Builds image source to file name mapping by resolving local image paths
   - Preserves existing `extractMarkdownImagesFromFiles()` behavior and signature
   - Reuses existing helper functions: `resolveImageCandidates()`, `dedupeCandidates()`, `loadCandidate()`, `dedupeFiles()`

3. **replaceMarkdownImageSources() Function**
   - Signature: `(content: string, replacements: Map<string, string>) => string`
   - Handles inline markdown images: `![alt](source)` → `![alt](newUrl)`
   - Handles HTML img tags: `<img src="source">` → `<img src="newUrl">`
   - Preserves original source if no mapping exists (key principle from plan)
   - Uses regex with capture groups to maintain formatting

### Key Design Decisions

1. **Image Source Mapping Strategy**
   - Maps original markdown image sources (as written in file) to extracted file names
   - Resolves relative paths using existing `resolveLocalSource()` helper
   - Normalizes paths for comparison using `normalizePath()`
   - Only maps local images; remote URLs are not mapped

2. **Function Composition**
   - `extractMarkdownDataFromFiles()` wraps existing extraction logic
   - Reuses all existing helper functions to maintain consistency
   - Minimal code duplication - only added new mapping logic

3. **Replacement Function Design**
   - Uses regex replace with callback to preserve non-matched sources
   - Handles both markdown and HTML formats in single pass
   - Maintains original formatting (alt text, attributes, etc.)

### Type Safety

- All new functions are fully typed with TypeScript
- `MarkdownData` type is exported for use in store (Task 2)
- No type errors in markdown-image.ts (verified with `npx tsc`)

### Testing Notes

- Pre-existing type errors in other files (providers, settings routes) are unrelated
- markdown-image.ts passes type checking cleanly
- Ready for integration in Task 2 (global-upload-store.ts)

## Patterns & Conventions

- Image source mapping uses `Map<string, string>` for O(1) lookups
- Path normalization always uses forward slashes (cross-platform)
- Regex patterns reuse existing patterns from `extractMarkdownImageSources()`
- Error handling: unmapped sources are silently preserved (no exceptions)

## Dependencies for Next Tasks

- Task 2 needs to import `MarkdownData` type from this file
- Task 3 needs to import `extractMarkdownDataFromFiles` function
- Task 4 needs to import `replaceMarkdownImageSources` function

## Task 1 Fix: Remote URL Mapping & Source Cleanup

### Issues Fixed

1. **Remote URL Mapping Missing**
   - Original implementation only mapped local image sources
   - Remote URLs (http/https) were extracted but not mapped to file names
   - Fix: Added `else if (candidate.kind === 'remote')` branch to map remote URLs

2. **Replacement Lookup Without Cleanup**
   - Original implementation looked up raw source strings from regex captures
   - Sources with whitespace or formatting variations would fail to match
   - Fix: Added fallback cleanup using `cleanupImageTarget()` before lookup

### Implementation Details

1. **Remote URL Mapping**
   - Added `getFileNameFromUrl()` helper to extract file names from URLs
   - Handles URL parsing with fallback for malformed URLs
   - Strips query parameters from URLs (e.g., `image.png?v=123` → `image.png`)
   - Maps original source URL as key in `imageSourceToFileName` map

2. **Source Cleanup in Replacement**
   - `replaceMarkdownImageSources()` now tries two lookup strategies:
     - First: exact match with raw source from regex
     - Second: match with cleaned source using `cleanupImageTarget()`
   - Preserves original source if neither lookup succeeds
   - Applies to both inline markdown and HTML img tags

### Code Changes

- Added `getFileNameFromUrl(url: string): string` helper function
- Updated `extractMarkdownDataFromFiles()` mapping loop to handle remote candidates
- Updated `replaceMarkdownImageSources()` to use cleanup before lookup

### Type Safety

- No new type errors introduced
- All functions remain fully typed
- Verified with `npx tsc` on markdown-image.ts

### Backward Compatibility

- Existing `extractMarkdownImagesFromFiles()` unchanged
- Existing `MarkdownData` type structure unchanged
- Replacement function maintains same signature and behavior for exact matches
- Only adds fallback cleanup logic for robustness

## Task 2: Extended global-upload-store.ts

### Implementation Details
- Added `MarkdownData[]` state field to store parsed markdown data
- Imported `MarkdownData` type from `@/lib/markdown-image`
- Added `setMarkdownData(data: MarkdownData[])` action to set markdown data
- Added `clearMarkdownData()` action to clear markdown data
- Integrated clearing into existing lifecycle methods:
  - `setOpen(false)` now clears markdown data
  - `clear()` now clears markdown data
  - `openWithFiles()` resets markdown data to empty array

### Key Patterns
- Zustand store uses immutable state updates via `set()`
- Markdown data is cleared whenever upload dialog closes or is reset
- Store maintains separation of concerns: files vs. markdown metadata

### Type Safety
- Full TypeScript support with `MarkdownData` type from markdown-image module
- All state fields properly typed in `GlobalUploadState` interface
- Actions have proper type signatures

### Verification
- `pnpm typecheck` passes (no errors in this file)
- Pre-existing errors in other files are unrelated to these changes

## Task 3: Update global-upload-controller.tsx

**Completed**: Successfully updated the controller to capture markdown data during parsing.

### Changes Made:
1. **Import**: Replaced `extractMarkdownImagesFromFiles` with `extractMarkdownDataFromFiles`
2. **Store Hook**: Added `setMarkdownData` to the destructured store actions
3. **Function Call**: Updated `handleParseMarkdown` to:
   - Call `extractMarkdownDataFromFiles` instead of `extractMarkdownImagesFromFiles`
   - Destructure the returned object to get both `files` and `markdownData`
   - Call `setMarkdownData(result.markdownData)` to store the markdown data in global state
   - Use `result.files` instead of `extractedFiles` for the combined files

### Key Insight:
The new `extractMarkdownDataFromFiles` function returns an object with both extracted files AND markdown metadata (fileName, content, imageSourceToFileName mapping). This allows the controller to:
- Extract images as before (backward compatible)
- Capture markdown content and image mappings for later use in markdown rewriting

### Flow:
1. User drops markdown files
2. Controller calls `extractMarkdownDataFromFiles`
3. Returns both extracted image files AND markdown data
4. Markdown data is stored in global upload store via `setMarkdownData`
5. Files are combined and uploaded as before
6. Markdown data is now available for downstream processing (e.g., rewriting image sources)

### Verification:
- `pnpm typecheck` passes (no errors in this file)
- All imports resolved correctly
- Store action properly integrated
- Rest of upload flow unchanged

## Task 4: Generate Markdown Dropdown Button Implementation

### Implementation Details
- Added dropdown button to upload-files-drawer.tsx footer with two options:
  - "With Endpoint": Generates full URLs using `trpc.provider.getPlainObjectUrl`
  - "Without Endpoint": Generates key-only paths with leading slash
- Button only appears when `markdownData.length > 0`
- Uses `DropdownMenu` component from shadcn/ui
- Icons: `IconCopy` for button, `IconChevronDown` for dropdown indicator

### Key Components Used
1. **useGlobalUploadStore**: Access `markdownData` from store
2. **useToast**: Show success/failure notifications
3. **replaceMarkdownImageSources**: Helper function to replace image sources in markdown
4. **trpcUtils.provider.getPlainObjectUrl.fetch()**: Get full URL for uploaded files

### Logic Flow
1. Check if markdown data exists
2. Iterate through markdown data
3. Build replacement map from completed upload tasks
4. For "With Endpoint": Fetch full URL using provider object
5. For "Without Endpoint": Use key-only path with leading slash
6. Replace image sources in markdown content
7. Combine all markdown outputs with separator
8. Copy to clipboard
9. Show toast notification

### Important Patterns
- Provider object must be fetched from providers list using `providerId`
- `getPlainObjectUrl` returns object with `.url` property
- Fallback to key-only path if URL fetch fails
- Use `navigator.clipboard.writeText()` for clipboard copy
- Toast notifications use `variant: 'destructive'` for errors

### TypeScript Considerations
- No type errors in upload-files-drawer.tsx after implementation
- Existing project errors are unrelated to this task
- All imports properly typed and used

### UI/UX Details
- Button positioned in footer next to "Start Upload" button
- Wrapped in flex container with gap-2 for spacing
- Dropdown aligns to "end" for better positioning
- Button disabled when no markdown data available
- Clear visual hierarchy with icons and text

## Task 4 Fix: Correct Markdown Replacement Mapping

### Problem Identified
- Previous implementation mapped `fileName → URL` directly
- This caused replacements to fail because `replaceMarkdownImageSources` expects keys to be original source strings (e.g., `./images/photo.jpg`, `../assets/logo.png`)
- The `MarkdownData.imageSourceToFileName` Map stores `originalSource → fileName` mapping

### Solution Implemented
1. **Build lookup first**: Create `fileNameToTask` Map from completed upload tasks
2. **Iterate imageSourceToFileName**: For each markdown entry, iterate through `md.imageSourceToFileName.entries()`
3. **Map correctly**: Set replacements with key = `originalSource`, value = uploaded URL/path
4. **Skip missing tasks**: If no matching completed task found for a fileName, skip that source (leave unchanged)

### Key Changes
```typescript
// OLD (incorrect):
replacements.set(fileName, url)  // fileName = "photo.jpg"

// NEW (correct):
replacements.set(originalSource, url)  // originalSource = "./images/photo.jpg"
```

### Logic Flow
1. Build `fileNameToTask` lookup from `uploadStore.tasks` (completed only)
2. For each markdown entry:
   - Iterate `md.imageSourceToFileName` entries
   - Look up task by fileName
   - If task exists with outputKey, build URL and set `replacements[originalSource] = url`
   - If no task, skip (source remains unchanged in markdown)
3. Call `replaceMarkdownImageSources(md.content, replacements)`

### Why This Matters
- Markdown files can reference images with relative paths: `./img.jpg`, `../assets/img.jpg`, `subfolder/img.jpg`
- The replacement function needs to match these exact source strings
- The `imageSourceToFileName` Map provides the correct mapping from source → fileName
- We then look up fileName → task → outputKey to build the final URL

### TypeScript Verification
- No type errors in upload-files-drawer.tsx after fix
- Proper use of Map iteration with `.entries()`
- Correct handling of optional task lookup
