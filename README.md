# Shaking Head News

一边看新闻，一边让页面轻微倾斜，把一次短暂的刷新闻过程，顺手变成一次小幅度的颈部活动提醒。

[![License](https://img.shields.io/badge/license-MPL--2.0-blue.svg)](LICENSE)
[![Runtime](https://img.shields.io/badge/runtime-Cloudflare%20Workers-f38020)](https://workers.cloudflare.com/)
[![Frontend](https://img.shields.io/badge/frontend-Vite%20%2B%20React-646cff)](https://vite.dev/)
[![Version](https://img.shields.io/badge/version-2.3.1-2563eb)](CHANGELOG.md)

**在线演示：** https://sn.oheng.com  
**仓库地址：** https://github.com/ohengcom/shaking-head-news-vite

## 项目定位

大多数新闻阅读器只优化两件事：加载速度和内容密度。Shaking Head News 想做一点不一样的事：阅读区域会周期性地轻微旋转几度，提醒你不要一直保持同一个姿势盯着屏幕。

它既是一个小产品，也是一个可以直接参考的 Cloudflare-native 全栈示例：

- 使用 Cloudflare Workers 托管静态资源和 API
- 使用 Hono 编写 Worker 路由
- 使用 Better Auth 做登录态管理
- 使用 Cloudflare KV 存储用户设置、RSS 源和运动统计
- 前端基于 React Router、Tailwind CSS 4、Radix UI、Framer Motion
- 使用 Vitest、Playwright、Knip 做测试和仓库健康检查
- 使用 GitHub Actions 自动部署到 Cloudflare Workers

## 功能概览

- 每日简报和 IT 资讯聚合
- 登录用户可添加自定义 RSS 源
- Pro 预览用户支持 OPML 导入导出
- 可调节页面旋转模式、间隔和阅读偏好
- 颈部活动统计和健康提醒界面
- 中英文界面
- 明暗主题
- 支持广告位配置，自托管部署可启用无广告 Pro 预览模式

当前仓库中的 Pro 只是自托管预览能力，不包含真实计费流程。

## 技术栈

- 前端：Vite 8、React 19、React Router 7
- 边缘 API：Cloudflare Worker + Hono
- 认证：Better Auth
- 存储：Cloudflare KV
- UI：Tailwind CSS 4、Radix UI、Framer Motion、lucide-react
- 校验：Zod
- 测试：Vitest + Playwright
- 部署：Wrangler + GitHub Actions

## 运行结构

- `src/main.tsx`：浏览器端入口
- `src/styles/globals.css`：当前生效的浏览器样式
- `worker/index.ts`：Cloudflare Worker 入口和 HTTP 路由
- `wrangler.jsonc`：Worker、静态资源、KV、路由和 observability 配置
- `worker-configuration.d.ts`：由 `wrangler types` 生成的 Worker bindings 类型
- `components/`：共享 UI 和功能组件
- `lib/actions/`：运行在 Worker 侧的业务逻辑
- `lib/api/*-client.ts`：浏览器调用 Worker API 的封装
- `app/`：历史 Next.js 迁移参考目录，不参与当前 Vite 运行时

## 本地开发

```bash
npm install
cp .env.example .env.local
npm run dev
```

默认地址：`http://localhost:3001`

本地至少需要：

```env
BETTER_AUTH_URL=http://localhost:3001
BETTER_AUTH_SECRET=
```

本地 secret 可这样生成：

```bash
openssl rand -hex 32
```

## 常用命令

- `npm run dev`：启动本地 Vite 开发服务
- `npm run check`：执行 lint、type-check、单元测试和生产构建
- `npm run test:e2e:smoke`：执行 Chromium smoke 测试
- `npm run lint:unused`：检查未使用文件、导出、依赖和重复项
- `npm run types:worker`：重新生成 Cloudflare Worker 类型
- `npm run deploy`：构建并通过 Wrangler 部署
- `npm run clean`：清理本地构建和测试产物

## Cloudflare 部署

远程部署前建议先执行：

```bash
npx wrangler whoami
npm run check
npm run deploy
```

当前 Worker 路由策略：

- `assets.directory = ./dist/client`
- `assets.not_found_handling = single-page-application`
- `assets.run_worker_first = ["/api/*", "/ads.txt"]`
- `observability.enabled = true`
- `APP_SETTINGS_KV` 用于存储设置、统计、认证辅助存储和 RSS 状态

当你修改了 `wrangler.jsonc` 或 `.env.example` 后，记得重新生成 Worker 类型：

```bash
npm run types:worker
```

## 项目健康状态

当前仓库通过：

```bash
npm run lint:unused
npm run check
```

已知权衡和待清理项记录在 [Known Issues](docs/KNOWN_ISSUES.md)。目前最大的一项遗留是移除归档的 Next.js 目录，以及逐步替换掉临时的 Next 风格兼容 shim。

## 文档

- [Setup](docs/SETUP.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Testing](docs/TESTING.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Cloudflare Deployment](docs/CLOUDFLARE_DEPLOYMENT.md)
- [Monitoring Quick Start](docs/MONITORING_QUICK_START.md)
- [Known Issues](docs/KNOWN_ISSUES.md)

## 贡献

欢迎提 issue 和小规模 PR。比较适合继续推进的方向：

- 清理剩余的 Next 兼容 shim
- 提升 RSS 解析的边界处理和稳定性
- 增加截图和短 GIF 演示
- 改善与 motion preference 相关的无障碍体验
- 补充更多 Cloudflare 部署示例

提交前建议先跑：

```bash
npm run check
```

## 致谢

- 新闻接口来源：[vikiboss/60s](https://github.com/vikiboss/60s)

## License

MPL-2.0
