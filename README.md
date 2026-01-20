# Open Uploader

A cross-platform desktop application for managing and uploading files to multiple cloud storage providers.

## Tech Stack

- **Electron** - Cross-platform desktop application framework
- **React 19** - UI framework with TypeScript
- **Vite** - Fast build tool and development server
- **TanStack Router** - Type-safe file-based routing
- **TanStack Query** - Data fetching and caching
- **tRPC** - End-to-end type-safe API layer
- **Drizzle ORM** - TypeScript ORM with PGlite database
- **Tailwind CSS v4** - Utility-first CSS framework
- **shadcn/ui** - Radix UI component library
- **React Hook Form + Zod** - Form validation
- **Zustand** - State management

## Features

### Multi-Provider Support

- Amazon S3
- Alibaba Cloud OSS
- Tencent Cloud COS
- Supabase Storage
- Custom S3-compatible storage providers

### File Management

- Upload files to cloud storage buckets
- Browse and manage files across different providers
- Batch file operations
- Upload history tracking
- Image preview with blurhash placeholders
- Drag-and-drop file upload

### Image Compression

- Multiple built-in compression presets (Cover, Card, Thumbnail, Content, Original)
- Custom compression presets with configurable parameters
- Adjustable quality, dimensions, and output format (WebP, JPEG, PNG)
- Multiple fit modes (cover, contain, fill, inside, outside)
- Aspect ratio control (16:9, 4:3, 1:1, free)
- Real-time compression preview with before/after comparison
- Image cropping tool with aspect ratio lock
- Automatic format conversion
- Batch compression support
- Compression statistics (file size reduction percentage)

### Provider Management

- Add and configure multiple storage providers
- Test connection before saving
- Manage multiple buckets per provider
- Recent providers quick access in sidebar

### User Interface

- Dark mode support
- Responsive layout with collapsible sidebar
- Recent buckets navigation
- Active route indicators
- Type-safe navigation

## License

MIT License

Copyright (c) 2025

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
