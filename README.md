# Shaking Head News (摇头看新闻)

边看新闻边活动颈椎的 Web 应用，支持新闻聚合、分层功能、云端同步和健康提醒。

[![License](https://img.shields.io/badge/license-MPL--2.0-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16.1-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue)](https://react.dev/)

## 当前状态（2026-02-25，vite版）

- 认证系统已迁移到 `Better Auth`（`/api/auth/[...all]`）。
- 保留双构建路径：
  - `Next.js`（主运行时，`npm run dev` / `npm run build`）
  - `vinext + Vite`（迁移中路径，`npm run dev:vinext` / `npm run build:vinext`）
- `type-check`、`lint`、`build`、`build:vinext` 可通过。
- 单元测试当前有失败项，详见 `docs/TESTING.md` 与 `docs/KNOWN_ISSUES.md`。

## 核心功能

- 新闻阅读：
  - 访客：每日简报 + AI 资讯。
  - 会员：可解锁更多热榜来源。
  - Pro：支持自定义 RSS 与 OPML 导入导出。
- 健康模式：
  - 固定模式和连续模式旋转。
  - 角度、间隔、目标等个性化设置。
- 账号与同步：
  - Google / Microsoft OAuth 登录。
  - 用户设置存储在 Upstash Redis（未配置时回退到内存）。
- 国际化与主题：
  - 中文 / 英文切换。
  - Light / Dark / System 主题。

## 技术栈

- Framework: Next.js 16, React 19
- Optional Runtime Path: vinext, Vite 7
- Auth: Better Auth
- State/Data: Zustand, Upstash Redis
- UI: Tailwind CSS 4, Radix UI, Framer Motion
- Quality: TypeScript, ESLint, Vitest, Playwright

## 快速开始

1. 安装依赖

```bash
npm install
```

2. 配置环境变量

```bash
cp .env.example .env.local
```

最小本地运行建议先配置：

- `BETTER_AUTH_URL`
- `BETTER_AUTH_SECRET`

3. 启动开发环境

```bash
npm run dev
```

访问 `http://localhost:3000`。

如果要验证 vinext 路径：

```bash
npm run dev:vinext
```

访问 `http://localhost:3001`。

## 常用命令

- `npm run dev`: Next.js 开发模式
- `npm run build`: Next.js 生产构建
- `npm run start`: Next.js 生产启动
- `npm run dev:vinext`: vinext 开发模式
- `npm run build:vinext`: vinext 生产构建
- `npm run type-check`: TypeScript 检查
- `npm run lint`: ESLint 检查
- `npm run test`: Vitest 单元测试
- `npm run test:e2e`: Playwright E2E 测试

## 文档

- [安装与环境配置](docs/SETUP.md)
- [架构说明](docs/ARCHITECTURE.md)
- [部署说明](docs/DEPLOYMENT.md)
- [Cloudflare 发布完整指南（vite版）](docs/CLOUDFLARE_DEPLOYMENT.md)
- [测试说明](docs/TESTING.md)
- [监控与分析接入](docs/MONITORING_QUICK_START.md)
- [已知问题](docs/KNOWN_ISSUES.md)
- [更新日志](CHANGELOG.md)

## Credits

- News API: [vikiboss/60s](https://github.com/vikiboss/60s)
