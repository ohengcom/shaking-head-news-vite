# Shaking Head News

边读新闻，边做轻量颈部活动提醒。

[![License](https://img.shields.io/badge/license-MPL--2.0-blue.svg)](LICENSE)
[![Runtime](https://img.shields.io/badge/runtime-Cloudflare%20Workers-f38020)](https://workers.cloudflare.com/)
[![Frontend](https://img.shields.io/badge/frontend-Vite%20%2B%20React-646cff)](https://vite.dev/)
[![Version](https://img.shields.io/badge/version-2.3.1-2563eb)](CHANGELOG.md)

在线演示：https://sn.oheng.com  
仓库地址：https://github.com/ohengcom/shaking-head-news-vite

## 项目定位

Shaking Head News 不是普通新闻聚合页。它把“久坐刷新闻”这个场景，改造成一次低负担的颈部活动提醒：

- 阅读区会做小幅、可控的倾斜或轮换
- 用户在看新闻时会自然地轻微转头或调整姿势
- 核心卖点不是“治疗”，而是“减少长时间固定姿势阅读”

这个定位对用户是能讲通的，但前提是表达要足够克制、具体，避免夸大医疗效果。更准确的产品语言应当是：

- 颈部活动提醒
- 久坐阅读姿势打断
- 边看新闻边做轻量头颈活动

## 功能概览

- 每日简报和 IT 资讯聚合
- 登录用户可添加自定义 RSS 源
- Pro 预览用户支持 OPML 导入导出
- 可调节页面旋转模式、间隔和阅读偏好
- 颈部活动统计与提醒
- 中英文界面
- 明暗主题
- 支持广告位配置和自托管 Pro 预览模式

当前仓库中的 Pro 仅是自托管预览能力，不包含真实计费。

## 技术栈

- 前端：Vite 8、React 19、React Router 7
- 边缘 API：Cloudflare Workers + Hono
- 认证：Better Auth
- 存储：Cloudflare KV
- UI：Tailwind CSS 4、Radix UI、Framer Motion、lucide-react
- 校验：Zod
- 测试：Vitest + Playwright
- 部署：Wrangler + GitHub Actions

## 运行结构

- `src/main.tsx`：浏览器入口
- `src/app/App.tsx`：SPA 根应用
- `src/styles/globals.css`：主样式入口
- `worker/index.ts`：Cloudflare Worker 入口和路由
- `components/`：共享 UI 和业务组件
- `lib/actions/`：Worker 侧业务逻辑
- `lib/api/*-client.ts`：浏览器访问 Worker API 的封装
- `lib/i18n.ts`、`lib/router.ts`、`lib/link.tsx`：当前主线运行时使用的本地能力封装
- `wrangler.jsonc`：Worker、静态资源、KV、路由和 observability 配置
- `worker-configuration.d.ts`：由 `wrangler types` 生成的 Worker bindings 类型

当前仓库主线已经是单一运行时：`Vite SPA + Cloudflare Worker`。不再保留 Next.js 兼容入口。

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

- `npm run dev`：启动本地开发服务
- `npm run check`：执行 lint、type-check、单元测试和生产构建
- `npm run test:e2e:smoke`：执行 Chromium smoke 测试
- `npm run lint:unused`：检查未使用文件、导出、依赖和重复项
- `npm run types:worker`：重新生成 Worker 类型
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
- `APP_SETTINGS_KV` 用于存储设置、统计、认证辅助数据和 RSS 状态

修改 `wrangler.jsonc` 或 `.env.example` 后，记得重新生成 Worker 类型：

```bash
npm run types:worker
```

## 项目健康状态

当前仓库应长期保持通过：

```bash
npm run lint:unused
npm run check
```

已知权衡记录在 [Known Issues](docs/KNOWN_ISSUES.md)。

## 文档

- [Setup](docs/SETUP.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Testing](docs/TESTING.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Cloudflare Deployment](docs/CLOUDFLARE_DEPLOYMENT.md)
- [Monitoring Quick Start](docs/MONITORING_QUICK_START.md)
- [Known Issues](docs/KNOWN_ISSUES.md)

## 贡献

欢迎提 issue 和小规模 PR。比较值得继续投入的方向：

- 强化首页首屏卖点表达和使用前后对比
- 增加真实动效截图和短 GIF
- 提升 RSS 解析的边界处理和稳定性
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
