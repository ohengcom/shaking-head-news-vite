# Cloudflare 发布完整指南（vinext + Vite）

适用范围：

- 当前仓库（`app/` App Router，`vite版`）
- 部署目标：Cloudflare Workers
- 构建路径：`vinext deploy`

更新时间：2026-02-25

## 1. 前置条件

1. Cloudflare 账号（已开通 Workers）。
2. 本机 Node.js `>= 22`（与 `package.json` 的 `engines` 一致）。
3. 已安装项目依赖：

```bash
npm install
```

4. 已登录 Wrangler（本机手动部署）：

```bash
npx wrangler login
```

如果是 CI/CD，请使用 `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`，不要依赖交互式登录。

## 2. 发布前自检

建议先在本地跑完一轮检查，避免把问题带到线上：

```bash
npm run type-check
npm run lint
npm run test
npm run build:vinext
```

## 3. 必做配置：补齐 Cloudflare Vite 插件

当前仓库的 `vite.config.ts` 还没有 `@cloudflare/vite-plugin`，需要先补上。

先安装依赖（`vinext deploy` 会自动补，但建议显式安装）：

```bash
npm i -D @cloudflare/vite-plugin wrangler
```

然后把 `vite.config.ts` 调整为（保留你现有 alias 与 RSC entries）：

```ts
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import rsc from '@vitejs/plugin-rsc'
import { cloudflare } from '@cloudflare/vite-plugin'
import vinext from 'vinext'
import { defineConfig } from 'vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@': rootDir,
    },
  },
  plugins: [
    vinext({ rsc: false }),
    rsc({
      entries: {
        rsc: 'virtual:vinext-rsc-entry',
        ssr: 'virtual:vinext-app-ssr-entry',
        client: 'virtual:vinext-app-browser-entry',
      },
    }),
    cloudflare({
      viteEnvironment: {
        name: 'rsc',
        childEnvironments: ['ssr'],
      },
    }),
  ],
})
```

说明：

- 你现在是 App Router，Cloudflare 构建需要 `cloudflare()` 插件参与。
- `vinext deploy` 只会在“没有 `vite.config.*`”时自动生成文件；当前仓库已有该文件，所以这一步要手动加。

## 4. 首次生成部署骨架（不真正发布）

先执行 dry-run，让 vinext 生成缺失文件并检查配置：

```bash
npx vinext deploy --dry-run --name shaking-head-news-vite
```

通常会生成：

- `wrangler.jsonc`
- `worker/index.ts`

并可能自动安装缺失依赖（如 `wrangler`、`@cloudflare/vite-plugin`）。

## 5. 检查并完善 `wrangler.jsonc`

建议以类似结构为准（字段可按你的域名与环境调整）：

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "shaking-head-news-vite",
  "compatibility_date": "2026-02-25",
  "compatibility_flags": ["nodejs_compat"],
  "main": "./worker/index.ts",
  "assets": {
    "binding": "ASSETS",
    "not_found_handling": "none",
  },
  "images": {
    "binding": "IMAGES",
  },
  "kv_namespaces": [
    {
      "binding": "VINEXT_CACHE",
      "id": "<prod-kv-id>",
      "preview_id": "<preview-kv-id>",
    },
  ],
  "vars": {
    "BETTER_AUTH_URL": "https://news.example.com",
    "NEWS_API_BASE_URL": "https://news.ravelloh.top",
    "NEXT_PUBLIC_LOG_LEVEL": "info",
  },
}
```

## 6. 环境变量与 Secrets 配置

建议分类：

- 放 `wrangler.jsonc` 的 `vars`（非敏感）：`BETTER_AUTH_URL`、`NEWS_API_BASE_URL`、`NEXT_PUBLIC_*`
- 用 `wrangler secret put`（敏感）：各种 `*_SECRET`、Token、OAuth 私钥

常见命令：

```bash
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put AUTH_MICROSOFT_ENTRA_ID_SECRET
npx wrangler secret put UPSTASH_REDIS_REST_TOKEN
```

如果你使用 `--env preview`，对应地加 `--env preview` 写入预览环境密钥。

注意：

- `NEXT_PUBLIC_*` 用在前端时，必须在构建阶段可用（CI 里要注入）。
- `BETTER_AUTH_URL` 必须是最终线上域名（`https://...`）。

## 7. ISR 缓存（本项目必须做）

当前仓库 `app/page.tsx` 存在 `export const revalidate = 3600`，属于 ISR 场景。

先创建 KV：

```bash
npx wrangler kv namespace create VINEXT_CACHE
npx wrangler kv namespace create VINEXT_CACHE --preview
```

把命令输出的 namespace id 写回 `wrangler.jsonc` 的 `kv_namespaces`（`id` / `preview_id`）。

## 8. 正式发布

生产环境发布：

```bash
npx vinext deploy --name shaking-head-news-vite
```

如果你已在 `wrangler.jsonc` 定义了 `env.preview`，可发布预览环境：

```bash
npx vinext deploy --preview --name shaking-head-news-vite
```

发布后会输出 `*.workers.dev` 地址，先做冒烟验证：

- `/`
- `/login`
- `/settings`
- `/rss`
- `/stats`
- `/api/auth/[...all]` 相关登录流程

## 9. 绑定自定义域名与 OAuth 回调

### 9.1 绑定域名

可在 `wrangler.jsonc` 增加 `routes`（示例）：

```jsonc
{
  "routes": [
    {
      "pattern": "news.example.com",
      "custom_domain": true,
    },
  ],
}
```

然后重新部署：

```bash
npx wrangler deploy
```

### 9.2 更新 OAuth 回调地址

域名切换后，务必同时更新：

- `BETTER_AUTH_URL=https://news.example.com`
- Google/Microsoft OAuth 控制台中的回调 URL（按 Better Auth provider 实际路径配置，例如 `.../api/auth/callback/google`、`.../api/auth/callback/microsoft`）

## 10. GitHub Actions 持续部署（示例）

`.github/workflows/deploy-cloudflare.yml`：

```yaml
name: Deploy Cloudflare Workers

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm run test
      - run: npx vinext deploy --name shaking-head-news-vite
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          BETTER_AUTH_URL: ${{ secrets.BETTER_AUTH_URL }}
          BETTER_AUTH_SECRET: ${{ secrets.BETTER_AUTH_SECRET }}
          GOOGLE_CLIENT_ID: ${{ secrets.GOOGLE_CLIENT_ID }}
          GOOGLE_CLIENT_SECRET: ${{ secrets.GOOGLE_CLIENT_SECRET }}
          AUTH_MICROSOFT_ENTRA_ID_ID: ${{ secrets.AUTH_MICROSOFT_ENTRA_ID_ID }}
          AUTH_MICROSOFT_ENTRA_ID_SECRET: ${{ secrets.AUTH_MICROSOFT_ENTRA_ID_SECRET }}
          AUTH_MICROSOFT_ENTRA_ID_TENANT_ID: ${{ secrets.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID }}
          UPSTASH_REDIS_REST_URL: ${{ secrets.UPSTASH_REDIS_REST_URL }}
          UPSTASH_REDIS_REST_TOKEN: ${{ secrets.UPSTASH_REDIS_REST_TOKEN }}
          NEXT_PUBLIC_ADSENSE_CLIENT_ID: ${{ secrets.NEXT_PUBLIC_ADSENSE_CLIENT_ID }}
          NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR: ${{ secrets.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR }}
          NEXT_PUBLIC_ADSENSE_SLOT_HEADER: ${{ secrets.NEXT_PUBLIC_ADSENSE_SLOT_HEADER }}
          NEXT_PUBLIC_ADSENSE_SLOT_FOOTER: ${{ secrets.NEXT_PUBLIC_ADSENSE_SLOT_FOOTER }}
          NEXT_PUBLIC_ADSENSE_SLOT_INLINE: ${{ secrets.NEXT_PUBLIC_ADSENSE_SLOT_INLINE }}
          NEXT_PUBLIC_GA_ID: ${{ secrets.NEXT_PUBLIC_GA_ID }}
          NEXT_PUBLIC_VERCEL_ANALYTICS: ${{ secrets.NEXT_PUBLIC_VERCEL_ANALYTICS }}
          NEXT_PUBLIC_SENTRY_DSN: ${{ secrets.NEXT_PUBLIC_SENTRY_DSN }}
          NEXT_PUBLIC_LOG_LEVEL: ${{ secrets.NEXT_PUBLIC_LOG_LEVEL }}
          NEWS_API_BASE_URL: ${{ secrets.NEWS_API_BASE_URL }}
```

## 11. 常见故障排查

1. `Unauthorized` / `Authentication error`

- 检查 `CLOUDFLARE_API_TOKEN` 是否具备 Workers/KV 权限，且属于正确账号。

2. 部署成功但 ISR 不生效

- 检查 `VINEXT_CACHE` 绑定是否存在，`kv_namespaces` 的 `id` 是否已替换占位符。

3. OAuth 登录回调报错

- 检查 `BETTER_AUTH_URL`、OAuth 回调 URL、以及 Cloudflare 自定义域名是否完全一致（协议、域名、路径）。

4. `NEXT_PUBLIC_*` 在页面中为空

- 这类变量需要在构建时存在，确保 CI `env` 注入完整。

## 12. 官方参考链接

- Cloudflare Vite 插件：`https://developers.cloudflare.com/workers/vite-plugin/`
- Wrangler 安装与更新：`https://developers.cloudflare.com/workers/wrangler/install-and-update/`
- Workers 环境变量与 Secrets：`https://developers.cloudflare.com/workers/configuration/environment-variables/`
- Workers 路由与自定义域名：`https://developers.cloudflare.com/workers/configuration/routing/routes/`
- Wrangler GitHub Actions / 外部 CI：`https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/`
- KV 命令参考：`https://developers.cloudflare.com/kv/reference/kv-commands/`
