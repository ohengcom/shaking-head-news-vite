# 部署总览（2026-02-25，vite版）

本项目当前保留两条运行路径：

- `Next.js` 路径：历史兼容
- `vinext + Vite` 路径：当前迁移与 Cloudflare 发布主路径

## 推荐路径

如果你要部署到 Cloudflare Workers，使用 vinext 路径：

- 入口文档：`docs/CLOUDFLARE_DEPLOYMENT.md`
- 核心命令：`npx vinext deploy --name shaking-head-news-vite`

## 文档分工

- `docs/CLOUDFLARE_DEPLOYMENT.md`
  - 完整发布流程（配置、Secrets、KV、CI/CD、自定义域名、排错）
- `docs/DEPLOYMENT.md`（当前文件）
  - 只保留部署路线与索引，避免和主指南重复

## 迁移提示

当前仓库已有 `vite.config.ts`，但首次上 Cloudflare 前请确认已加入 `@cloudflare/vite-plugin`。

详见：

- `docs/CLOUDFLARE_DEPLOYMENT.md` 的“必做配置：补齐 Cloudflare Vite 插件”章节。
