# Issues

## 2026-02-02 Task Execution

- LSP diagnostics unavailable on Windows due to Bun v1.3.5 crash; use Bun >= 1.3.6 or WSL to run LSP tools.
- `pnpm typecheck` fails with pre-existing errors in provider/settings routes unrelated to markdown generator changes.

## 2026-02-02 Bug Fix: markdownData was always empty

**Problem**: "Generate Markdown" button never appeared because `markdownData` was always empty.

**Root Cause**: In `global-upload-controller.tsx`, `setMarkdownData(result.markdownData)` was called BEFORE `openWithFiles()`. But `openWithFiles()` in `global-upload-store.ts` resets `markdownData: []`, so the data was immediately cleared.

**Fix**: Moved `setMarkdownData(result.markdownData)` to AFTER `openWithFiles()` call.

**Lesson**: When using Zustand stores, be careful about the order of state updates. If one action resets state that another action sets, the order matters.
