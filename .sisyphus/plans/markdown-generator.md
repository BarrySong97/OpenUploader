# Generate Markdown with Replaced Image URLs

## TL;DR

> **Quick Summary**: Add a "Generate Markdown" button to the Upload Files Drawer that generates a new Markdown text with image URLs replaced by uploaded file paths. Users can choose between full URL (with endpoint) or just the key path.
>
> **Deliverables**:
>
> - Modified `markdown-image.ts` with content extraction and replacement functions
> - Modified `global-upload-store.ts` to store parsed markdown data
> - Modified `global-upload-controller.tsx` to capture markdown data during parsing
> - Modified `upload-files-drawer.tsx` with Generate Markdown dropdown button
>
> **Estimated Effort**: Medium
> **Parallel Execution**: NO - sequential (dependencies between tasks)
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 4

---

## Context

### Original Request

User wants to add a "Generate Markdown" feature to the Upload Files Drawer. After parsing images from Markdown files, users should be able to generate a new Markdown text with image URLs replaced by the uploaded file paths. The feature should offer two URL format options via a dropdown menu:

1. With ENDPOINT: Full URL (e.g., `https://bucket.s3.region.amazonaws.com/folder/image.png`)
2. Without ENDPOINT: Just the key/path (e.g., `/folder/image.png`)

### Interview Summary

**Key Discussions**:

- Button location: Inside Upload Files Drawer, independent of upload process
- URL format: Two options - with endpoint (full URL) or without (key only)
- The feature works with parsed markdown data, not dependent on actual uploads

**Research Findings**:

- `markdown-image.ts` has `extractMarkdownImageSources()` for extracting image sources
- `getPlainObjectUrl` in provider-service.ts builds full URLs based on provider type
- Upload store tracks `outputKey` for each uploaded file
- DropdownMenu component is available

### Metis Review

**Identified Gaps** (addressed):

- Image source to file mapping: Will use filename matching
- Unmapped images: Keep original source unchanged
- Reference-style images: Support inline and HTML img tags (reference-style out of scope)
- Clipboard errors: Show toast notification on success/failure

---

## Work Objectives

### Core Objective

Enable users to generate Markdown text with image URLs replaced by uploaded file paths, with options for full URL or key-only format.

### Concrete Deliverables

- `src/renderer/src/lib/markdown-image.ts`: New types and functions for markdown data extraction and replacement
- `src/renderer/src/stores/global-upload-store.ts`: New state for storing parsed markdown data
- `src/renderer/src/components/upload/global-upload-controller.tsx`: Integration with new extraction function
- `src/renderer/src/components/provider/upload-files-drawer.tsx`: Generate Markdown dropdown button

### Definition of Done

- [x] "Generate Markdown" dropdown button visible in Upload Files Drawer when markdown was parsed
- [x] Clicking "With Endpoint" generates markdown with full URLs and copies to clipboard
- [x] Clicking "Without Endpoint" generates markdown with key-only paths and copies to clipboard
- [x] Toast notification shows on successful copy
- [x] Button is disabled when no markdown data is available

### Must Have

- Dropdown menu with two options: "With Endpoint" and "Without Endpoint"
- Replace only mapped image sources, keep unmapped ones unchanged
- Copy generated markdown to clipboard
- Success/failure toast notification

### Must NOT Have (Guardrails)

- NO changes to upload pipeline or provider logic
- NO automatic uploads triggered by "Generate Markdown"
- NO new persistence beyond current state store
- NO support for reference-style markdown images (out of scope)
- NO full AST parsing or complex markdown transformations

---

## Verification Strategy (MANDATORY)

### Test Decision

- **Infrastructure exists**: YES (project has TypeScript type checking)
- **User wants tests**: Manual verification (no unit tests requested)
- **Framework**: TypeScript type checking + manual verification

### Automated Verification

Each TODO includes executable verification procedures:

**For TypeScript changes** (using Bash):

```bash
pnpm typecheck
# Assert: Exit code 0, no new type errors
```

**For UI changes** (using playwright skill):

```
1. Navigate to app
2. Drop a markdown file with images
3. Click "Parse images" in the dialog
4. Verify "Generate Markdown" dropdown button appears
5. Click dropdown, verify two options visible
6. Screenshot: .sisyphus/evidence/generate-markdown-button.png
```

---

## Execution Strategy

### Dependency Chain

```
Task 1: Extend markdown-image.ts
    ↓
Task 2: Extend global-upload-store.ts
    ↓
Task 3: Update global-upload-controller.tsx
    ↓
Task 4: Add UI to upload-files-drawer.tsx
```

### Agent Dispatch Summary

| Task | Description                         | Recommended Agent |
| ---- | ----------------------------------- | ----------------- |
| 1    | Extend markdown-image.ts            | category="quick"  |
| 2    | Extend global-upload-store.ts       | category="quick"  |
| 3    | Update global-upload-controller.tsx | category="quick"  |
| 4    | Add UI to upload-files-drawer.tsx   | category="quick"  |

---

## TODOs

- [x] 1. Extend markdown-image.ts with content extraction and replacement functions

  **What to do**:
  - Add new types: `MarkdownData` (fileName, content, imageSourceToFileName map)
  - Add new function `extractMarkdownDataFromFiles()` that returns both extracted files AND markdown data
  - Add new function `replaceMarkdownImageSources(content, replacements)` that replaces image URLs in markdown content
  - The replacement function should handle:
    - Inline images: `![alt](source)`
    - HTML img tags: `<img src="source">`
  - Keep original source unchanged if no replacement mapping exists

  **Must NOT do**:
  - Do NOT modify existing `extractMarkdownImagesFromFiles()` function signature
  - Do NOT add support for reference-style images
  - Do NOT add complex AST parsing

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file modification with clear scope
  - **Skills**: `[]`
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 2, 3, 4
  - **Blocked By**: None

  **References**:
  - `src/renderer/src/lib/markdown-image.ts:73-106` - `extractMarkdownImageSources()` function showing regex patterns for image extraction
  - `src/renderer/src/lib/markdown-image.ts:26-62` - `extractMarkdownImagesFromFiles()` showing the extraction flow pattern

  **Acceptance Criteria**:

  ```bash
  pnpm typecheck
  # Assert: Exit code 0
  # Assert: No errors in markdown-image.ts
  ```

  **Commit**: YES
  - Message: `feat(markdown): add content extraction and replacement functions`
  - Files: `src/renderer/src/lib/markdown-image.ts`
  - Pre-commit: `pnpm typecheck`

---

- [x] 2. Extend global-upload-store.ts to store parsed markdown data

  **What to do**:
  - Import `MarkdownData` type from `markdown-image.ts`
  - Add new state field: `markdownData: MarkdownData[]`
  - Add new action: `setMarkdownData(data: MarkdownData[])`
  - Add new action: `clearMarkdownData()`
  - Clear markdown data when `clear()` or `setOpen(false)` is called

  **Must NOT do**:
  - Do NOT persist markdown data to any storage
  - Do NOT modify existing state fields or actions

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple state addition to existing store
  - **Skills**: `[]`
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 3, 4
  - **Blocked By**: Task 1

  **References**:
  - `src/renderer/src/stores/global-upload-store.ts:1-66` - Current store structure and patterns
  - `src/renderer/src/lib/markdown-image.ts` - MarkdownData type (after Task 1)

  **Acceptance Criteria**:

  ```bash
  pnpm typecheck
  # Assert: Exit code 0
  # Assert: No errors in global-upload-store.ts
  ```

  **Commit**: YES
  - Message: `feat(store): add markdown data state to global upload store`
  - Files: `src/renderer/src/stores/global-upload-store.ts`
  - Pre-commit: `pnpm typecheck`

---

- [x] 3. Update global-upload-controller.tsx to capture markdown data during parsing

  **What to do**:
  - Import `extractMarkdownDataFromFiles` from `markdown-image.ts`
  - Import `setMarkdownData` action from `global-upload-store`
  - In `handleParseMarkdown()` function:
    - Replace `extractMarkdownImagesFromFiles()` call with `extractMarkdownDataFromFiles()`
    - Store the returned `markdownData` in the global upload store using `setMarkdownData()`
    - Continue using the returned `files` as before

  **Must NOT do**:
  - Do NOT change the UI or user flow
  - Do NOT modify error handling behavior

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small integration change
  - **Skills**: `[]`
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 4
  - **Blocked By**: Task 1, 2

  **References**:
  - `src/renderer/src/components/upload/global-upload-controller.tsx:112-182` - `handleParseMarkdown()` function
  - `src/renderer/src/components/upload/global-upload-controller.tsx:24` - Current import of `extractMarkdownImagesFromFiles`

  **Acceptance Criteria**:

  ```bash
  pnpm typecheck
  # Assert: Exit code 0
  # Assert: No errors in global-upload-controller.tsx
  ```

  **Commit**: YES
  - Message: `feat(upload): capture markdown data during parsing`
  - Files: `src/renderer/src/components/upload/global-upload-controller.tsx`
  - Pre-commit: `pnpm typecheck`

---

- [x] 4. Add Generate Markdown dropdown button to upload-files-drawer.tsx

  **What to do**:
  - Import required components:
    - `DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger` from `@/components/ui/dropdown-menu`
    - `IconFileText, IconChevronDown` from `@tabler/icons-react`
    - `toast` from `sonner`
    - `useGlobalUploadStore` from `@renderer/stores/global-upload-store`
    - `replaceMarkdownImageSources` from `@/lib/markdown-image`
    - `trpc` for `getPlainObjectUrl` query
  - Get `markdownData` from `useGlobalUploadStore`
  - Add a `generateMarkdown(withEndpoint: boolean)` function that:
    - For each markdown in `markdownData`:
      - Build replacements map: original source → new URL
      - For "With Endpoint": Use `trpc.provider.getPlainObjectUrl` to get full URL
      - For "Without Endpoint": Use `/${prefix}${fileName}` format (key only with leading slash)
      - Call `replaceMarkdownImageSources(content, replacements)`
    - Combine all generated markdown (if multiple files)
    - Copy to clipboard using `navigator.clipboard.writeText()`
    - Show success toast
  - Add the dropdown button in the Summary section (before the existing summary div):
    - Button text: "Generate Markdown"
    - Icon: `IconFileText`
    - Dropdown items: "With Endpoint", "Without Endpoint"
    - Disabled when `markdownData.length === 0`

  **Must NOT do**:
  - Do NOT trigger any uploads
  - Do NOT modify the upload flow
  - Do NOT add complex error handling beyond toast

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: UI addition with clear scope
  - **Skills**: `[]`
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: None
  - **Blocked By**: Task 1, 2, 3

  **References**:
  - `src/renderer/src/components/provider/upload-files-drawer.tsx:1200-1216` - Summary section where button should be added
  - `src/renderer/src/components/ui/dropdown-menu.tsx` - DropdownMenu component API
  - `src/renderer/src/main/services/provider-service.ts:324-407` - `getPlainObjectUrl` logic for URL building
  - `src/renderer/src/components/provider/file-detail-sheet.tsx:61-71` - Example of using `getPlainObjectUrl` query

  **Acceptance Criteria**:

  ```bash
  pnpm typecheck
  # Assert: Exit code 0
  # Assert: No errors in upload-files-drawer.tsx
  ```

  **Manual Verification** (using playwright):

  ```
  1. Start dev server: pnpm dev
  2. Navigate to app
  3. Drop a markdown file containing image references
  4. Click "Parse images" when prompted
  5. Verify "Generate Markdown" dropdown button appears above the summary
  6. Click dropdown, verify "With Endpoint" and "Without Endpoint" options
  7. Click "Without Endpoint"
  8. Verify toast shows "Markdown copied to clipboard"
  9. Paste clipboard content, verify image URLs are replaced with key paths
  ```

  **Commit**: YES
  - Message: `feat(upload): add Generate Markdown dropdown button`
  - Files: `src/renderer/src/components/provider/upload-files-drawer.tsx`
  - Pre-commit: `pnpm typecheck`

---

## Commit Strategy

| After Task | Message                                                            | Files                        | Verification   |
| ---------- | ------------------------------------------------------------------ | ---------------------------- | -------------- |
| 1          | `feat(markdown): add content extraction and replacement functions` | markdown-image.ts            | pnpm typecheck |
| 2          | `feat(store): add markdown data state to global upload store`      | global-upload-store.ts       | pnpm typecheck |
| 3          | `feat(upload): capture markdown data during parsing`               | global-upload-controller.tsx | pnpm typecheck |
| 4          | `feat(upload): add Generate Markdown dropdown button`              | upload-files-drawer.tsx      | pnpm typecheck |

---

## Success Criteria

### Verification Commands

```bash
pnpm typecheck  # Expected: Exit code 0
pnpm lint       # Expected: Exit code 0 (or only pre-existing errors)
```

### Final Checklist

- [x] "Generate Markdown" dropdown button visible when markdown was parsed
- [x] "With Endpoint" option generates full URLs
- [x] "Without Endpoint" option generates key-only paths
- [x] Unmapped images keep original source
- [x] Toast notification on successful copy
- [x] Button disabled when no markdown data
- [x] No changes to upload pipeline
- [x] All TypeScript types pass
