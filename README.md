# Shaking Head News (摇头看新闻)

边看新闻边活动颈椎的 Web 应用，支持新闻聚合、分层功能、云端同步和健康提醒。

[![License](https://img.shields.io/badge/license-MPL--2.0-blue.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/runtime-Cloudflare%20Workers-f38020)](https://workers.cloudflare.com/)
[![vinext](https://img.shields.io/badge/framework-vinext-4b5563)](https://vinext.dev/)
[![React](https://img.shields.io/badge/React-19.2-149eca)](https://react.dev/)

## 当前状态（2026-02-26）

- 生产部署主路径：`vinext + Vite + Cloudflare Workers`
- 生产域名：`https://sn.oheng.com`
- Auth：`Better Auth`（`/api/auth/[...all]`）
- `npm run dev` / `npm run build`（Next.js）保留为兼容脚本，不作为当前发布主路径

## 核心功能

- 新闻阅读
  - 访客：每日简报 + AI 资讯
  - 会员：可解锁更多热榜来源
  - Pro：支持自定义 RSS 与 OPML 导入导出
- 健康模式
  - 固定模式和连续模式旋转
  - 角度、间隔、目标等个性化设置
- 账号与同步
  - Google / Microsoft OAuth 登录
  - 用户设置存储在 Upstash Redis（未配置时回退到内存）
- 国际化与主题
  - 中文 / 英文切换
  - Light / Dark / System 主题

## 技术栈

- Runtime: Cloudflare Workers
- Framework: vinext, Vite 7, React 19
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

建议至少配置：

- `BETTER_AUTH_URL`（本地可用 `http://localhost:3001`）
- `BETTER_AUTH_SECRET`

3. 启动本地开发（vinext 主路径）

```bash
npm run dev:vinext
```

访问 `http://localhost:3001`。

## 常用命令

- `npm run dev:vinext`: vinext 开发模式（推荐）
- `npm run build:vinext`: vinext 生产构建（推荐）
- `npm run dev`: Next.js 开发模式（兼容）
- `npm run build`: Next.js 构建（兼容）
- `npm run type-check`: TypeScript 检查
- `npm run lint`: ESLint 检查
- `npm run test`: Vitest 单元测试
- `npm run test:e2e`: Playwright E2E 测试

## 部署（Cloudflare Workers）

- CI 工作流：`.github/workflows/deploy-cloudflare-workers.yml`
- 核心命令：`npx vinext deploy --name shaking-head-news-vite`
- 详细文档：`docs/CLOUDFLARE_DEPLOYMENT.md`

> 当前仓库默认以 Cloudflare Workers 为发布目标，不再以 Vercel 作为主路径。

## 文档

- [安装与环境配置](docs/SETUP.md)
- [架构说明](docs/ARCHITECTURE.md)
- [部署说明索引](docs/DEPLOYMENT.md)
- [Cloudflare 发布完整指南](docs/CLOUDFLARE_DEPLOYMENT.md)
- [测试说明](docs/TESTING.md)
- [监控与分析接入](docs/MONITORING_QUICK_START.md)
- [已知问题](docs/KNOWN_ISSUES.md)
- [更新日志](CHANGELOG.md)

## Credits

- News API: [vikiboss/60s](https://github.com/vikiboss/60s)
