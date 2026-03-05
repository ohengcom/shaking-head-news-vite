# Shaking Head News (摇头看新闻)

边看新闻边活动颈椎的 Web 应用，支持新闻聚合、健康提醒、分层功能和账号同步。

[![License](https://img.shields.io/badge/license-MPL--2.0-blue.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/runtime-Cloudflare%20Workers-f38020)](https://workers.cloudflare.com/)
[![vinext](https://img.shields.io/badge/framework-vinext-4b5563)](https://vinext.dev/)
[![Version](https://img.shields.io/badge/version-2.3.1-2563eb)](CHANGELOG.md)

## 当前状态（2026-03-05）

- 当前版本：`2.3.1`
- 生产域名：`https://sn.oheng.com`
- 主发布路径：`vinext + Vite + Cloudflare Workers`
- Auth：`Better Auth`（`/api/auth/[...all]`）
- `npm run dev` / `npm run build`（Next.js）为兼容脚本，主开发/发布建议使用 vinext 路径

## 核心功能

- 新闻阅读：每日简报、AI 资讯、热门榜单
- 订阅能力：Pro 用户支持自定义 RSS 与 OPML 导入导出
- 健康模式：支持固定/连续旋转，角度、间隔和目标可配置
- 账号与同步：Google / Microsoft OAuth，设置可同步到 Upstash Redis
- 国际化与主题：中英文切换，Light / Dark / System 主题

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

最少建议配置：

- `BETTER_AUTH_URL`（vinext 本地建议 `http://localhost:3001`）
- `BETTER_AUTH_SECRET`

3. 启动本地开发（推荐）

```bash
npm run dev:vinext
```

访问 `http://localhost:3001`。

## 常用命令

- `npm run dev:vinext`：vinext 开发模式（推荐）
- `npm run build:vinext`：vinext 生产构建（推荐）
- `npm run dev`：Next.js 开发模式（兼容）
- `npm run build`：Next.js 构建（兼容）
- `npm run type-check`：TypeScript 检查
- `npm run lint`：ESLint 检查
- `npm run test`：Vitest 单元测试
- `npm run test:e2e`：Playwright E2E 测试

## 部署（Cloudflare Workers）

- CI 工作流：`.github/workflows/deploy-cloudflare-workers.yml`
- 构建：`npm run build:vinext`
- 发布：`npx vinext deploy --name shaking-head-news-vite`
- 参考文档：`docs/CLOUDFLARE_DEPLOYMENT.md`

## 仓库清理约定

- 临时截图使用 `tmp-*` 命名，已在 `.gitignore` 中忽略，禁止提交
- 构建/测试输出目录（如 `.next/`、`coverage/`、`dist/`、`playwright-report/`、`test-results/`）仅作本地产物

## 文档索引

- [安装与环境配置](docs/SETUP.md)
- [架构说明](docs/ARCHITECTURE.md)
- [部署说明](docs/DEPLOYMENT.md)
- [Cloudflare 发布完整指南](docs/CLOUDFLARE_DEPLOYMENT.md)
- [测试说明](docs/TESTING.md)
- [监控与分析接入](docs/MONITORING_QUICK_START.md)
- [已知问题](docs/KNOWN_ISSUES.md)
- [更新日志](CHANGELOG.md)

## Credits

- News API: [vikiboss/60s](https://github.com/vikiboss/60s)
