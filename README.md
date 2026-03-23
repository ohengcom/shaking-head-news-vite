# Shaking Head News

边看新闻边活动颈椎的 Cloudflare 原生 Web 应用。

[![License](https://img.shields.io/badge/license-MPL--2.0-blue.svg)](LICENSE)
[![Runtime](https://img.shields.io/badge/runtime-Cloudflare%20Workers-f38020)](https://workers.cloudflare.com/)
[![Frontend](https://img.shields.io/badge/frontend-Vite%20%2B%20React-646cff)](https://vite.dev/)
[![Version](https://img.shields.io/badge/version-2.3.1-2563eb)](CHANGELOG.md)

## 当前架构

- 前端：Vite 8 + React 19 + React Router 7
- 边缘后端：Cloudflare Worker + Hono
- 鉴权：Better Auth
- 存储：Cloudflare KV
- UI：Tailwind CSS 4 + Radix UI + Framer Motion
- 测试：Vitest + Playwright

项目已经从 `vinext`/Next 运行时迁移到 Cloudflare 明确支持的 Vite 原生方案，当前主路径是：

- SPA 静态资源：`dist/client`
- Worker 入口：[worker/index.ts](/c:/Users/sli/OneDrive/Projects/shaking-head-news-vite/worker/index.ts)
- Cloudflare Vite 集成：[vite.config.ts](/c:/Users/sli/OneDrive/Projects/shaking-head-news-vite/vite.config.ts)
- 部署配置：[wrangler.jsonc](/c:/Users/sli/OneDrive/Projects/shaking-head-news-vite/wrangler.jsonc)

## 本地开发

```bash
npm install
cp .env.example .env.local
npm run dev
```

默认访问 `http://localhost:3001`。

## 必要环境变量

至少配置：

- `BETTER_AUTH_URL`
- `BETTER_AUTH_SECRET`

常用可选项：

- `NEWS_API_BASE_URL`
- `VITE_ADSENSE_CLIENT_ID`
- `VITE_ADSENSE_SLOT_SIDEBAR`
- `VITE_ADSENSE_SLOT_HEADER`
- `VITE_ADSENSE_SLOT_FOOTER`
- `VITE_ADSENSE_SLOT_INLINE`
- `VITE_GA_ID`
- `VITE_SENTRY_DSN`
- `VITE_LOG_LEVEL`

当前代码对旧的 `NEXT_PUBLIC_*` 名称保留兼容读取，但新配置应统一使用 `VITE_*`。

## 常用命令

- `npm run dev`：本地开发
- `npm run build`：构建 Worker 与客户端资源
- `npm run preview`：预览前端构建结果
- `npm run deploy`：构建后执行 `wrangler deploy`
- `npm run type-check`
- `npm run lint`
- `npm test`
- `npm run test:e2e`

## Cloudflare 部署

部署前先确认 Wrangler 已登录：

```bash
npx wrangler whoami
```

然后执行：

```bash
npm run deploy
```

当前 `wrangler.jsonc` 已按 SPA + API Worker 方式配置：

- `assets.directory = ./dist/client`
- `assets.not_found_handling = single-page-application`
- `assets.run_worker_first = ["/api/*", "/ads.txt"]`

## 代码组织

- `src/`：Vite SPA 入口、路由、provider、Next 兼容 shim
- `worker/`：Cloudflare Worker API
- `components/`：复用 UI 与业务组件
- `lib/actions/`：Worker 侧业务逻辑
- `lib/api/*-client.ts`：前端 API 客户端
- `app/`：历史 Next 目录，当前不参与构建

## 文档

- [安装与环境](docs/SETUP.md)
- [架构说明](docs/ARCHITECTURE.md)
- [部署说明](docs/DEPLOYMENT.md)
- [Cloudflare 发布指南](docs/CLOUDFLARE_DEPLOYMENT.md)
- [测试说明](docs/TESTING.md)
- [监控接入](docs/MONITORING_QUICK_START.md)
- [当前已知问题](docs/KNOWN_ISSUES.md)

## Credits

- News API: [vikiboss/60s](https://github.com/vikiboss/60s)
