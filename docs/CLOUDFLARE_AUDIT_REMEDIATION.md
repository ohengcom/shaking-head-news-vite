# Cloudflare 审查问题与彻底修复计划

日期：2026-10-27  
范围：Worker 架构、配置、依赖、UI、组件、安全、性能、可维护性、测试与部署。

## 1. 总体判断

项目采用 Vite + Workers Static Assets + Hono + KV，主要方向符合 Cloudflare 当前推荐。React、Radix UI、Tailwind、Vite、Hono、Zod、Wrangler 与 Cloudflare Vite 插件在审查时均对应当前稳定版本；Framer Motion、Vitest 和 TypeScript 的新大版本属于可选升级，不与安全修复捆绑进行。

本次修复优先处理可复现故障、授权与 SSRF、资源滥用、数据一致性、有效测试和部署安全，而不是盲目追逐版本号。所有本地依赖、缓存、构建和测试产物必须在 `C:\temp` 中运行，不进入 OneDrive 项目目录。

## 2. 必须修复问题与验收标准

| 编号  | 严重程度 | 问题与位置                                                                  | 修复计划                                                     | 验收标准                                                  |
| ----- | -------- | --------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------- |
| CF-01 | 阻断     | Cache API 响应 headers 不可变，`worker/index.ts` API 中间件导致缓存命中 500 | 在修改响应前重新构造可变 Response                            | 同一 locale 连续请求两次均成功，第二次确为缓存命中        |
| CF-02 | 阻断     | 本地单元测试初始化失败，旧 Workers 测试池已弃用                             | 迁移 `@cloudflare/vitest-plugin`，恢复真实测试执行           | 单元和 Worker 测试均有用例执行且通过，不允许 0 tests 假绿 |
| CF-03 | 高       | `lib/auth.ts` 把 Better Auth `increment` 的 TTL 当增量且永不过期            | 正确实现加一与 TTL；明确 KV 非原子限制，敏感计数使用协调存储 | 并发及窗口过期测试通过，不出现计数随 TTL 跳跃             |
| CF-04 | 高       | RSS 添加时 HEAD 直接 fetch，绕过 SSRF 防护                                  | 删除独立 HEAD 预检或统一走 bounded safeFetch，逐跳验证       | 私网、保留地址、危险端口和重定向用例被拒绝                |
| CF-05 | 高       | `newsSources` 不去重、不限长，可放大上游请求                                | schema 与 Worker 路由双层去重、限长、限制 JSON body          | 重复项只请求一次，超量输入返回 4xx                        |
| CF-06 | 高       | 通用设置接口可写 `isPro`，部分 Pro API 仅 UI 门控                           | 分离用户偏好与服务端权益字段，API 统一鉴权                   | 普通更新不能改变权益，免费用户调用 Pro API 返回 403       |
| CF-07 | 高       | 部署 workflow 在验证前多次 `secret put` 并立即部署                          | 验证后一次性随版本上传 secrets，再显式部署                   | 验证失败不产生生产版本或部署，日志不泄露 secret           |
| CF-08 | 中高     | 设置、RSS、统计的 KV read-modify-write 可覆盖并发写入                       | 每用户协调写入；持久化优先，内存只作有界缓存                 | 并行更新不丢字段、不重排丢源、不丢统计批次                |
| CF-09 | 中       | 上游失败被转为空成功并缓存一小时；冷启动无 single-flight                    | 区分完整/部分/失败响应，失败不缓存，合并同源并发请求         | 上游故障不被长期固化，冷启动共享同一 Promise              |
| CF-10 | 中       | 定制状态变更接口缺 Origin/Fetch Metadata 防线，私有响应缺 no-store          | 加统一请求校验、安全头和私有缓存策略                         | 跨站状态变更被拒绝，认证 API 响应明确 no-store            |
| CF-11 | 中       | 测试跳过关键安全路径，E2E 未断言 API 成功                                   | 补缓存、认证、RSS、授权、异常上游和真实统计测试              | 关键路径有正向与反向测试，CI 失败能阻断发布               |
| CF-12 | 中       | 开发依赖存在审计告警，CI audit 不阻断                                       | 随官方测试插件迁移消除漏洞，按风险设置门禁                   | 生产审计为 0，新增高危生产漏洞阻断 CI                     |

## 3. 性能、UI 与可维护性改进

| 编号  | 问题                                                    | 修复计划与预期收益                                                                     |
| ----- | ------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| CF-13 | RSS 总响应、条目与 DOM 数缺少预算                       | 限制 feed 数、总条目、单 feed 大小和并发；列表分页/增量展示，降低 CPU、内存与 DOM 峰值 |
| CF-14 | 模块级 recentWriteCache 无界，KV 写入有竞争             | 有界 LRU/TTL 或移除冗余缓存，避免长寿命 isolate 内存增长和陈旧读                       |
| CF-15 | mousemove 高频更新，统计批次失败静默丢弃                | rAF 节流；仅成功响应后移除批次，失败保留并退避重试                                     |
| CF-16 | 广告脚本与不可见实例无效加载、重试                      | 按偏好、广告位配置和可见性挂载，减少第三方流量与定时器                                 |
| CF-17 | 用户设置请求重复，云同步只在设置页完整应用              | 统一 settings provider，共享请求并在应用启动时应用全部偏好                             |
| CF-18 | member RSS 添加与 Pro 首页展示规则不一致                | 明确 member 可管理并阅读自定义 RSS，Pro 仅保留批量导入/导出等增强能力                  |
| CF-19 | RSS 重排序接受子集/重复 id，更新字段过宽                | 要求完整、唯一、等长 id 集合；更新采用字段白名单                                       |
| CF-20 | 设置/RSS 键盘操作、按钮名称、图表语义和嵌套 main 不规范 | 使用原生交互元素、aria-label、键盘排序及正确 landmark/图表语义                         |
| CF-21 | 外部新闻 URL 未限制协议，API 数据仅 TS cast             | http/https 白名单、运行时 schema 校验和稳定复合 React key                              |
| CF-22 | 回调地址、错误日志、通知设置及遗留重复代码              | 限制本地回调路径、生产错误脱敏、尊重通知设置、删除死代码                               |

## 4. 架构边界

- KV 适合读多写少、可接受最终一致性的数据，不提供原子 INCR、GETDEL 或跨请求事务。不能把“加锁注释”当作并发保证。
- 需要严格每用户协调的写入采用每用户 Durable Object，而不是单一全局 Durable Object。该变更需要 Wrangler binding 和 SQLite class migration，并在部署前完成本地 runtime 测试。
- Better Auth 无主数据库可使用 Stateless + Secondary Storage；本次不把引入主数据库当作强制前提，但需保持 OAuth token 与撤销边界清晰。
- Workers 原生出站请求不能可靠完成任意 DNS 解析结果的私网校验。代码层继续阻断字面私网目标、逐跳重定向和危险端口；高保障场景需域名白名单或 Cloudflare 网络层策略。
- 第三方新闻、RSS 与 AdSense 的可用性不属于仓库可完全控制范围；验收覆盖失败降级、预算与缓存行为，不承诺第三方永不失败。

## 5. 实施顺序

1. CF-01、CF-03～CF-06、CF-09～CF-10：先消除已知故障和安全边界问题。
2. CF-08、CF-13～CF-19：修复一致性、资源预算、状态同步与交互行为。
3. CF-20～CF-22：完成可访问性、输入校验和代码清理。
4. CF-02、CF-07、CF-11～CF-12：迁移测试并建立可靠部署门禁。
5. 在 `C:\temp` 隔离副本执行 lint、格式、类型、单元、Worker、E2E、构建、审计与 Wrangler dry-run。

## 6. 完成记录

验证环境：`C:\temp\shn-verify`（依赖、构建、测试全部在 C 盘临时目录执行，项目目录未产生 `node_modules`、`dist`、`playwright-report`、`test-results`）。

### 6.1 已修复

| 编号  | 实际修改                                                                                                                                                                             | 验证结果                                                                                   |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| CF-01 | `worker/index.ts` 新增 `toMutableResponse()`，中间件修改响应头前先重建 Response；`/api/feed/home` 支持 `?refresh=1` 绕过边缘缓存                                                     | 新增 Worker 测试「连续两次请求均 200 且无 immutable 报错」通过；新增 E2E 断言该 API 状态码 |
| CF-02 | 迁移到 `@cloudflare/vitest-plugin@1.4.8`（替换已弃用的 `@cloudflare/vitest-pool-workers`），同步 `vitest.worker.config.ts`、`tsconfig.json` 类型                                     | 单元测试 **181 通过 / 8 跳过**（此前 0 个用例执行），Worker 测试 5 个全部通过              |
| CF-03 | `lib/auth.ts` 的 KV 回退实现改为「每次 +1 并设置 TTL」；生产路径改用 Durable Object 的原子 `increment`                                                                               | 见 CF-08 的 DO 测试覆盖                                                                    |
| CF-04 | `lib/actions/rss.ts` 删除裸 `fetch(HEAD)`，新增 `assertReachableFeed()`：走 `safeFetch`（逐跳重定向校验、私网/端口/凭据拦截）+ 只读取前 64 KiB 判断是否 RSS/Atom                     | RSS 单测覆盖可达、404、超时、非 feed 内容                                                  |
| CF-05 | `types/settings.ts` 去重并限长 20；`worker/index.ts` 设置来源去重；`parseJsonBody` 限制 64 KiB                                                                                       | 新增测试「超大 JSON → 400」「跨站写请求 → 403」                                            |
| CF-06 | `updateSettings` 只接受 `UserSettingsInputSchema`（剔除 `userId`/`isPro`）；`/api/stats/summary`、`/api/rss/export` 服务端校验 Pro                                                   | 设置单测断言 `isPro` 不可被请求体改写                                                      |
| CF-07 | 部署工作流改为「校验构建 → `wrangler versions upload --secrets-file` → `versions deploy`」，删除构建前的逐个 `secret put`                                                            | `wrangler deploy --dry-run` 通过，绑定与迁移均被识别                                       |
| CF-08 | 新增每用户 Durable Object `UserCoordination`（SQLite 存储、版本号 CAS、原子 rate limit、TTL），新增 `lib/server/user-doc.ts` 统一读写；KV 只作回退与镜像，首次读取自动导入旧 KV 数据 | 设置/RSS/统计单测全部通过；`wrangler types` 已生成 `USER_COORDINATION` 绑定                |
| CF-09 | 首页 feed 区分 `success/degraded`，失败不写缓存；新增 in-flight 合并；daily 重试从 3 次降到 1 次                                                                                     | Worker 测试覆盖「降级不缓存」                                                              |
| CF-10 | 私有 API 统一 `cache-control: no-store`（含 `/api/auth`）、`nosniff`、`referrer-policy`；跨站写请求 403；`public/_headers` 增加 `frame-ancestors`/`X-Frame-Options`                  | 新增 3 个 Worker 测试                                                                      |
| CF-11 | 修正 RSS 重排序、URL 校验、抓取上限等失效用例；新增缓存命中与 API 状态断言                                                                                                           | E2E **38 通过 / 2 跳过**                                                                   |
| CF-12 | CI 拆分为「生产依赖高危阻断」+「开发依赖告警」                                                                                                                                       | 生产依赖审计 **0 漏洞**；开发依赖 4 项（详见残余风险）                                     |

### 6.2 性能、UI 与可维护性

- RSS 抓取：单请求上限 30 → 10，单源 20 条、总 200 条，新增 5 分钟缓存与 in-flight 合并（CF-13）。
- `recentWriteCache` 增加 256 条上限与过期清理（CF-14）。
- `TiltWrapper`：mousemove 改为 rAF 合并 + 0.2° 阈值；统计批次改为「服务端确认成功后才出队」，失败保留重试（CF-15）。
- 广告：脚本只在非 Pro、开启广告且已登录态确定后加载；移动端不再挂载两个隐藏侧栏广告实例（CF-16）。
- 设置：新增 `lib/api/settings-cache.ts` 共享缓存，`useUserTier`/启动同步/广告判定复用同一请求；启动时应用语言、主题、字号、布局、旋转偏好（CF-17）。
- 自定义 RSS 不再要求 Pro 才能读取，与 member 可添加的设置一致（CF-18）。
- RSS 重排序要求完整且唯一的 id 集合；更新使用字段白名单（CF-19）。
- 可访问性：设置页来源行改为真实 `button`、增删与上移/下移按钮补齐 `aria-label`，RSS 列表增加键盘排序；图表 `role="img"` 改为 `role="group"`，柱形改为可聚焦的 `role="img"`（CF-20）。
- 新闻 URL 限制为 http(s)，`NewsList` 使用 `source::id` 复合 key（CF-21）。
- 删除重复 `components/theme-toggle.tsx` 与空壳 `SessionProvider`；生产环境不再回传内部错误信息，日志 URL 去掉 query（CF-22）。

### 6.3 验证摘要

| 项目                        | 结果                        |
| --------------------------- | --------------------------- |
| `tsc --noEmit`              | 通过                        |
| `eslint`                    | 通过（0 error / 0 warning） |
| `prettier --check`          | 全部文件符合格式            |
| 单元测试                    | 16 文件 / 181 通过 / 8 跳过 |
| Worker 测试                 | 2 文件 / 5 通过             |
| E2E（Chromium）             | 38 通过 / 2 跳过            |
| `npm run build`             | 成功                        |
| `wrangler deploy --dry-run` | 成功，识别 DO + KV + Assets |
| `npm audit --omit=dev`      | 0 漏洞                      |

### 6.4 残余风险与部署注意

1. **部署才会生效**：线上「Can't modify immutable headers」来自旧版本，需重新部署；首次部署会应用 `v1` 的 `new_sqlite_classes` 迁移并创建 `UserCoordination`。
2. **KV → DO 数据迁移**：DO 首次读取时按 key 从 KV 导入，旧的 `user:<id>:settings`、`user:<id>:rss-sources`、`user:<id>:stats:<date>` 无需手工迁移；导入后以 DO 为准，KV 仅作镜像。
3. **成本模型变化**：设置/统计/RSS 的读写由 KV 变为每用户 Durable Object 请求，请按实际访问量核对 Workers 免费额度。
4. **SSRF 边界**：Workers 无法在请求前解析并校验任意 DNS 结果，公共域名指向私网仍可能绕过；高保障场景需域名白名单或网络层策略。
5. **开发依赖告警**：`miniflare → undici` 的高危/中危告警只能通过降级 `@cloudflare/vite-plugin` 消除（`npm audit fix --force`），属工具链风险，未采用；CI 已对生产依赖高危阻断。
6. **测试栈版本**：`@cloudflare/vitest-plugin` 与 Vitest 4 组合已验证；升级到 Vitest 5 需重跑 Worker 测试。
