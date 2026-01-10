# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Electron desktop application built with React 19, TypeScript, and Vite. The project uses `electron-vite` as the build tool and follows a three-process architecture: main process, preload script, and renderer process.

## Development Commands

### Setup
```bash
pnpm install
```

### Development
```bash
pnpm dev              # Start development server with HMR
pnpm start            # Preview production build
```

### Code Quality
```bash
pnpm lint             # Run ESLint with caching
pnpm format           # Format code with Prettier
pnpm typecheck        # Type check all TypeScript files
pnpm typecheck:node   # Type check main/preload processes only
pnpm typecheck:web    # Type check renderer process only
```

### Building
```bash
pnpm build            # Type check and build for current platform
pnpm build:win        # Build for Windows
pnpm build:mac        # Build for macOS
pnpm build:linux      # Build for Linux
pnpm build:unpack     # Build without packaging (for testing)
```

## Architecture

### Three-Process Model

1. **Main Process** (`src/main/`)
   - Entry point: `src/main/index.ts`
   - Manages application lifecycle, window creation, and native OS interactions
   - Handles IPC communication from renderer
   - Uses Node.js APIs and Electron main process APIs

2. **Preload Script** (`src/preload/`)
   - Entry point: `src/preload/index.ts`
   - Bridge between main and renderer processes
   - Exposes safe APIs to renderer via `contextBridge`
   - Currently exposes `window.electron` (from @electron-toolkit/preload) and `window.api` (custom APIs)

3. **Renderer Process** (`src/renderer/`)
   - Entry point: `src/renderer/src/main.tsx`
   - React application running in Chromium
   - Uses React 19 with TypeScript
   - Cannot directly access Node.js/Electron APIs (must use preload APIs)

### Key Configuration Files

- `electron.vite.config.ts` - Vite configuration for all three processes
- `tsconfig.json` - Root TypeScript config (uses project references)
- `tsconfig.node.json` - TypeScript config for main/preload (Node environment)
- `tsconfig.web.json` - TypeScript config for renderer (browser environment)
- `eslint.config.mjs` - ESLint configuration with React and TypeScript rules

### Path Aliases

The renderer process uses `@renderer/*` as an alias for `src/renderer/src/*`:
```typescript
// Instead of: import Foo from '../../components/Foo'
import Foo from '@renderer/components/Foo'
```

## IPC Communication

To add IPC communication between processes:

1. **Main process** - Register handler in `src/main/index.ts`:
   ```typescript
   ipcMain.on('channel-name', (event, arg) => { /* ... */ })
   // or
   ipcMain.handle('channel-name', async (event, arg) => { /* ... */ })
   ```

2. **Preload** - Expose API in `src/preload/index.ts`:
   ```typescript
   const api = {
     doSomething: (arg) => ipcRenderer.invoke('channel-name', arg)
   }
   ```

3. **Renderer** - Use exposed API:
   ```typescript
   window.api.doSomething(arg)
   ```

## Development Notes

- The app uses `electron-updater` for auto-updates
- Context isolation is enabled (secure by default)
- Sandbox is disabled in webPreferences (allows Node.js in preload)
- HMR is available in development mode
- DevTools can be opened with F12 in development
- External links automatically open in system browser

## UI Components

This project uses **shadcn/ui** (radix-maia style) with Tailwind CSS v4 for the renderer UI.

### Available Components

Located in `src/renderer/src/components/ui/`:
- alert-dialog, badge, button, card, combobox
- dropdown-menu, field, input, input-group, label
- select, separator, textarea

### Using Components

```typescript
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent } from '@/components/ui/card'

// Use in your component
<Button variant="default">Click me</Button>
```

### Adding New Components

Use the shadcn CLI to add more components:
```bash
pnpm dlx shadcn@latest add [component-name]
```

### Installing Dependencies

All frontend dependencies (React components, UI libraries, etc.) should be installed as devDependencies:
```bash
pnpm add -D [package-name]
```

### Styling

- **Tailwind CSS v4** with Vite plugin
- **OKLCH color space** for consistent colors
- **Dark mode** support via `.dark` class
- **CSS variables** for theming (see `src/renderer/src/index.css`)
- **Figtree Variable** font family
- **Border radius convention**: Use `rounded-md` for all cards and containers to maintain consistent corner radius throughout the application
  - Cards (via Card component): `rounded-md`
  - StatusCard component: `rounded-md`
  - Other containers: `rounded-md` (preferred default)

### Example Components

See `src/renderer/src/components/component-example.tsx` for usage examples of all UI components.

## Routing

This project uses **TanStack Router** for type-safe, file-based routing in the renderer process.

### Dependencies

- `@tanstack/react-router` - Core router library
- `@tanstack/router-plugin` - Vite plugin for automatic route generation
- `@tanstack/router-devtools` - Development tools for debugging routes

### Route Structure

Routes are defined in `src/renderer/src/routes/` using file-based routing:

```
src/renderer/src/routes/
├── __root.tsx        # Root layout with navigation
├── index.tsx         # Home page (/)
├── about.tsx         # About page (/about)
└── components.tsx    # Components page (/components)
```

### Configuration

- **electron.vite.config.ts** - TanStackRouterVite plugin is configured in the renderer plugins
- **tsconfig.web.json** - Excludes generated `routeTree.gen.ts` from type checking
- **.gitignore** - Generated route tree file is ignored

### Creating Routes

Create a new route by adding a file in the `routes/` directory:

```typescript
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/your-route')({
  component: YourComponent
})

function YourComponent() {
  return <div>Your content</div>
}
```

### Route Features

- **File-based routing** - Routes are automatically generated from files
- **Type-safe navigation** - Full TypeScript support for routes and params
- **Nested routes** - Support for nested layouts and routes
- **Route params** - Dynamic segments with `$paramName.tsx`
- **Search params** - Type-safe query parameters
- **Loaders** - Data loading before route renders
- **Dev tools** - Router devtools available in development mode

### Navigation

Use the `Link` component for navigation:

```typescript
import { Link } from '@tanstack/react-router'

<Link to="/about">About</Link>
<Link to="/blog/$postId" params={{ postId: '123' }}>Post</Link>
```

### Root Layout

The root layout (`__root.tsx`) provides:
- Navigation bar with active link styling
- Outlet for rendering child routes
- Router devtools in development mode

### Generated Files

The router plugin automatically generates `src/renderer/src/routeTree.gen.ts` during development. This file:
- Contains the complete route tree structure
- Provides type definitions for all routes
- Should not be edited manually
- Is excluded from git and TypeScript compilation

## Loading States Convention

项目中有两种 Loading 状态显示方式:

### Spinner (旋转图标)
适用于:
- 按钮操作中的加载状态
- 小区域的刷新操作
- 状态检查（如连接测试）

示例:
```tsx
<IconRefresh className={cn(isLoading && 'animate-spin')} />
```

### Skeleton (骨架屏)
适用于:
- 列表数据加载
- 表格数据加载
- 卡片内容加载
- 页面初始化加载

示例:
```tsx
import { Skeleton } from '@/components/ui/skeleton'

// 表格骨架
<TableRow>
  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
</TableRow>
```

### 选择原则
| 场景 | 推荐方式 |
|------|----------|
| 按钮点击后的操作 | Spinner |
| 列表/表格数据 | Skeleton |
| 卡片内容 | Skeleton |
| 状态刷新 | Spinner |
| 页面首次加载 | Skeleton |
