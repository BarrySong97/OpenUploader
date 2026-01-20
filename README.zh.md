# Open Uploader

中文 | [English](./README.md) | [下载](https://github.com/BarrySong97/OpenUploader/releases)

一个跨平台桌面应用程序，用于管理和上传文件到多个云存储服务商。

![Preview 3](./docs/images/preview3.png)

## 技术栈

- **Electron** - 跨平台桌面应用框架
- **React 19** - UI 框架，使用 TypeScript
- **Vite** - 快速构建工具和开发服务器
- **TanStack Router** - 类型安全的文件路由
- **TanStack Query** - 数据获取和缓存
- **tRPC** - 端到端类型安全的 API 层
- **Drizzle ORM** - TypeScript ORM，使用 PGlite 数据库
- **Tailwind CSS v4** - 实用优先的 CSS 框架
- **shadcn/ui** - Radix UI 组件库
- **React Hook Form + Zod** - 表单验证
- **Zustand** - 状态管理

## 功能特性

### 多服务商支持

- Amazon S3
- 阿里云 OSS
- 腾讯云 COS
- Supabase Storage
- 自定义 S3 兼容存储服务商

![Preview 8](./docs/images/preview8.png)

### 文件管理

- 上传文件到云存储桶
- 浏览和管理不同服务商的文件
- 批量文件操作
- 上传历史记录跟踪
- 图片预览（支持 blurhash 占位符）
- 拖放上传文件

![Preview 1](./docs/images/preview1.png)
![Preview 2](./docs/images/preview2.png)
![Preview 7](./docs/images/preview7.png)

### 图片压缩

- 多个内置压缩预设（封面、卡片、缩略图、内容、原图）
- 自定义压缩预设，可配置参数
- 可调节质量、尺寸和输出格式（WebP、JPEG、PNG）
- 多种适配模式（覆盖、包含、填充、内部、外部）
- 宽高比控制（16:9、4:3、1:1、自由）
- 实时压缩预览，支持前后对比
- 图片裁剪工具，支持宽高比锁定
- 自动格式转换
- 批量压缩支持
- 压缩统计（文件大小减少百分比）

![Preview 6](./docs/images/preview6.png)
![Preview 4](./docs/images/preview4.png)
![Preview 5](./docs/images/preview5.png)

## 开源协议

MIT License

Copyright (c) 2025

特此免费授予任何获得本软件副本和相关文档文件（"软件"）的人不受限制地处置该软件的权利，
包括但不限于使用、复制、修改、合并、发布、分发、再许可和/或出售该软件副本的权利，
以及允许获得该软件的人这样做的权利，但须符合以下条件：

上述版权声明和本许可声明应包含在该软件的所有副本或主要部分中。

本软件按"原样"提供，不提供任何形式的明示或暗示保证，包括但不限于对适销性、
特定用途的适用性和非侵权性的保证。在任何情况下，作者或版权持有人均不对任何索赔、
损害或其他责任负责，无论是在合同诉讼、侵权行为还是其他方面，由软件或软件的使用
或其他交易引起、产生或与之相关。
