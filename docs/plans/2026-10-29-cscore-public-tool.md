# C Score Public Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> 执行方式仍服从会话授权和实际可用技能。本文只规划工作，不自动启动代理、安装依赖、建站或发布。

**Goal:** 构建一个公开、开源、单页的本地 c-score 工具，让用户导入个人 Scopus 导出文件，同时得到 career 与 single-year 结果，并与所选 field/subfield 的官方公开作者及参考分位数比较。

**Architecture:** Nuxt 静态生成一个 `/` 页面；文件解析、论文匹配、指标计算和报告导出都在浏览器内完成。独立 TypeScript 计算模块使用固定版本的官方参数，Python 研究脚本作为交叉验证基准。官方参考文件在发布前离线转为按版本和 subfield 分片的静态数据，用户原始数据不发送给服务器。

**Tech Stack:** Nuxt 4、Nuxt UI 4、TypeScript、Tailwind CSS（Nuxt UI 配套）、Papa Parse、Apache ECharts；Vitest、Playwright、axe-core 用于验证。使用 npm 和 lockfile。Node 采用满足依赖要求的偶数版本 LTS，最低遵守 Nuxt 官方当前的 Node 22 要求，初始化时再核对 package engines。

## Global Constraints

- **All in one page**：只有一个产品页面；教程、方法、隐私说明也在此页的锚点、折叠区或对话框内，不新增独立流程路由。
- **Let the layout speak**：按任务顺序组织内容，靠标题、间距、对齐、表格和状态解释流程。不做大幅 hero、后台侧边栏、装饰性仪表盘、满屏卡片或无信息价值动画。
- **有轮子找轮子，不自己造**：使用现成文件输入、选择器、表格、折叠区、弹窗和图表；只编写 c-score 领域规则和文件适配逻辑。
- **Career 与 single-year 必须一起完成**：首版不能通过删除任一种模式缩小范围。对应自引口径的数据齐全后，一次计算两种时间模式。
- 含自引和排除全部作者自引都支持；缺其中一种数据时明确显示“未提供”，不能自动替代或填零。
- 用户文件、作者身份、匹配修正、分数均留在设备。无登录、无机构 API、无爬虫；默认不持久保存用户原始文件。
- 不引入 Nuxt Content、数据库、运行时后端、全局状态库或完整国际化框架。首版界面采用英文服务全球用户，英文文案集中管理，教程另准备中英文字幕材料。
- 不宣称官方认证、官方入选或精确全球百分位。用户选择的是比较领域，不改变 c-score，也不等同官方作者归类。
- 官方参数、作者表和分类数据保留各自许可与出处；不能因应用代码开源就把数据改标为 MIT。
- 根目录当前不是 Git 仓库。未来应用放在新的 `cscore-web/`，执行时建立独立版本控制；本次不创建该应用或提交现有研究数据。
- 表中的时间预算是工作量估计，不是交付日期承诺。

## 当前证据与尚未完成的工作

已存在的材料均在 `docs/research/scopus-export-2026-10-29/`：

| 证据 | 已验证内容 | 使用边界 |
|---|---|---|
| `validate_cscore.py`、`validation-report.json` | 1,516 篇论文一对一关联；四种分数已算出；官方汇总指标反算误差小于 1e-12 | 只验证一位作者，不代表全部作者 |
| `reference/maxlog.json`、`manifest.json` | V9 四组参数、来源和哈希 | 参数属于固定参考版本 |
| `reference/method-verification.md` | Hm、作者位置集合和 log1p 逻辑与公开早期代码核对 | 已核对的是 V2 公开代码及 V9 参数，不是 V9 私有生产代码 |
| `walkthrough.md`、16 张 PNG | Scopus 论文和年度引用导出路径、截断开关、自引设置、26 年窗口 | 截图来自有机构订阅的会话，含账户缩写和机构品牌 |
| 本地论文及引用 CSV | 真实解析、匹配和数值验证输入 | 不自动成为可公开再分发的样例或测试 fixture |
| `originDoc/` 两份作者 Excel | 官方 career/single-year 已发布结果 | 不是所有 Scopus 作者的逐篇底层数据 |

发现的真实异常必须进入产品规则：论文文件有 40 个引用数为空，不能填零；引用文件没有 EID/DOI，不能按行号拼接；两个导出的 Total 摘要各比逐篇合计多 1，不能强行补差；年度文件可能含“引用年早于出版年”的记录，须保留来源并按选定方法处理。

## 阶段与验收总览

| 阶段 | 可审查交付物 | 完成门槛 | 估计工作量 |
|---|---|---|---|
| 0 数据与范围基线 | 数据契约、版本清单、公共/私有样例边界 | 所需字段、年份口径和异常规则明确 | 0.5–1 天 |
| 1 基本单页前端 | 使用合成数据即可操作的完整页面骨架 | 同页完成导入到结果浏览，布局清楚 | 1–2 天 |
| 2 数据与计算引擎 | 解析、关联、年份覆盖、六项指标和四种分数 | Python 与 TypeScript 对相同输入一致 | 2–3 天 |
| 3 完整用户动线 | 导出助手、动态补文件、身份确认、异常恢复 | 首次用户无需改 CSV 即可走通 | 1–2 天 |
| 4 官方对照与报告 | 两模式结果、领域对比、图表、可下载审计报告 | 所有比较具有一致口径和明确来源 | 1–2 天 |
| 5 测试与发布候选 | 数值、解析、E2E、隐私和可访问性验证记录 | 关键旅程和真实数据交叉验证通过 | 1–2 天 |
| 6 Tutorial 材料 | 截图清单、图文指南、分镜、旁白、字幕稿、补录清单 | 每个步骤对应真实界面及当前产品 | 1 天 |
| 7 静态发布与交付 | 可部署构建、开源说明、最终复核清单 | 本地预览通过；发布动作单独执行 | 0.5–1 天 |

依赖顺序：0 → 1 → 2 → 3 → 4 → 5 → 7。阶段 6 的素材盘点可在阶段 0 开始；产品画面和正式录制要等阶段 5 的界面稳定。每阶段结束保留可验证产物和简短变更记录，不把阶段完成等同于整个产品上线。

## 页面结构与组件复用

页面按以下顺序自然向下展开，不采用会隐藏上下文的多页 wizard：

```text
标题、用途一句话、本地处理说明、加载演示入口

1 选择官方参考版本和引用年度
  如何导出文件（折叠图文步骤）

2 拖入所有 CSV
  每个文件的识别结果、年份、自引设置、移除/替换
  本人 Author ID 确认、缺失数据提示、需要补导的具体窗口

3 核对需要处理的论文（有异常时才展开）
  候选关联、缺失作者信息、重复/冲突记录
  计算按钮和当前数据完整性

4 结果
  Career 与 Single-year 两项摘要同时可见
  含/排自引切换、Field → Subfield → 比较作者
  Career / Single-year 详细视图页签
  六项指标表、雷达图、名单分布/邻近作者
  下载报告、逐篇依据（折叠）

方法、数据来源、教程、隐私、开源链接（同页折叠区/页脚）
```

| 需求 | 优先采用的轮子 | 自己编写的边界 |
|---|---|---|
| 页面容器与基础表单 | Nuxt UI `Container`、`FormField`、`Button` | 布局和领域文案 |
| 多文件选择 | Nuxt UI `FileUpload`，接收原生 File | 只连接本地解析，不配置上传地址 |
| 文件状态与补导提示 | `Alert`、`Badge`、`Accordion` | 覆盖检查和恢复建议 |
| Field/Subfield/作者搜索 | `SelectMenu` | 版本化选项和依赖关系 |
| 论文核对 | `Table`、`Modal`、`SelectMenu` | 候选匹配和选择记录 |
| 时间模式 | `Tabs`＋两个简洁摘要区域 | 两套计算结果 |
| 图形比较 | ECharts 雷达图和散点/分布图，按需导入模块 | 数据映射、坐标含义、图旁文字表 |
| CSV 导入 | Papa Parse | 两种 Scopus 文件结构适配 |
| 官方 Excel 离线处理 | 既有 Python 数据处理方式，读取库按既有环境复用 | 输出版本化静态数据，不把 Excel 解析库塞入网页 |

桌面在容器足够宽时将指标表与图表并排；窄容器按顺序堆叠。表格可局部横向滚动，整页不能横向溢出。使用 Nuxt UI 的语义颜色与排版默认值，只定一个主色、统一内容宽度和少量间距；不另建一套 Button/Table/Modal。

## 文件与模块分工

以下是待创建的目标结构，不代表当前已经存在。每个领域模块保持纯函数，组件不直接计算指标。

```text
cscore-web/
  app/app.vue                         UApp 根包装
  app/pages/index.vue                 唯一页面，组织区域和滚动锚点
  app/assets/css/main.css             库样式入口及必要布局
  app/components/ImportPanel.vue      多文件识别与覆盖提示
  app/components/ExportGuide.vue      同页导出步骤和补导说明
  app/components/ReviewPanel.vue      身份与论文异常确认
  app/components/ResultsPanel.vue     两模式摘要和详细结果
  app/components/ComparisonPanel.vue  领域、作者和图表
  app/components/MethodNotes.vue      方法、数据、隐私折叠说明
  app/composables/useAnalysis.ts      本页状态、失效和重新计算
  app/lib/cscore/contracts.ts         数据与状态契约
  app/lib/cscore/parse.ts             Scopus CSV 适配
  app/lib/cscore/match.ts             论文一对一关联
  app/lib/cscore/coverage.ts          引用年度及自引覆盖检查
  app/lib/cscore/metrics.ts           六项指标与归一化
  app/lib/cscore/report.ts            本地审计 JSON/指标 CSV
  app/lib/reference.ts               静态参考数据与版本检查
  app/lib/messages.ts                集中的英文产品文案
  public/reference/v9/manifest.json   参考版本、许可、范围、哈希
  public/reference/v9/maxlog.json     四组参数
  public/reference/v9/subfields.json  分类和可用对照项目
  public/reference/v9/cohorts/        按主 subfield 分片的作者数据
  scripts/build-reference.py          离线整理官方参考数据
  tests/fixtures/public/              合成 CSV、预期结果和公开许可说明
  tests/unit/                        核心规则测试
  tests/private/                     真实样本验证入口，不含真实原始文件
  tests/e2e/                         关键旅程和隐私检查
  docs/journeys.md                    用户动作、系统反馈和恢复路径
  docs/tutorial/                     教程材料与截图索引
  docs/release-checklist.md           发布复核记录
  nuxt.config.ts
  vitest.config.ts
  playwright.config.ts
  package.json
  package-lock.json
```

## Stage 0 数据契约与基线

### Task 0.1 固定参考版本和输入规则

**Files:** 读取现有 `validation-report.json`、`validate_cscore.py`、`reference/maxlog.json`、`reference/manifest.json` 和官方作者表 Key 页；创建 `docs/cscore/data-contract.md`（执行时）。Stage 0 只写父工作区文档，不预先创建 `cscore-web/`，避免下一阶段初始化遇到非空目录。

**Interfaces:** 输出下列契约，后续模块统一使用，不在每个组件中另起命名。

```ts
export type SelfMode = 'with-self' | 'without-self'
export type Scope = 'career' | 'single-year'
export type MetricName = 'NC' | 'H' | 'Hm' | 'NCS' | 'NCSF' | 'NCSFL'
export type Metrics = Record<MetricName, number>
export interface Paper {
  eid: string
  title: string
  publicationYear: number
  authorIds: string[]
  authorCount: number
  sourceTitle: string
  issn: string[]
  volume: string
  issue: string
  doi?: string
}
export interface ReferenceVersion {
  id: string
  citationYear: number
  careerStartYear: number
  maxlog: Record<Scope, Record<SelfMode, Metrics>>
}
export interface CalculationResult {
  scope: Scope
  selfMode: SelfMode
  metrics: Metrics
  contributions: Metrics
  cScore: number
  paperCount: number
}
```

- [ ] 从当前报告记录四个 CSV 计算值及四个官方已发布值，保留两组数据，不能用官方值覆盖 CSV 结果。
- [ ] 固定初始参考为 V9、引用年度 2025、career 引用窗口 1996–2025；出版年份筛选和引用年份筛选分别记录，不因窗口相同而混为一谈。
- [ ] 明确选定年份不任意开放：下拉只提供具有对应官方参数和参考数据的版本。
- [ ] 重新运行 `python3 docs/research/scopus-export-2026-10-29/validate_cscore.py`；预期四种结果生成、关联 1,516/1,516、无未解决关联。记录运行日期，不把历史截图当本次验证。
- [ ] 记录未知项：无订阅者的完整导出能力尚未验证；其他作者尚未覆盖；官方快照差异不能保证为零。

**Gate:** 字段、窗口、模式、缺失值和引用来源均有明确规则。

### Task 0.2 样例与公开边界

**Files:** 创建 `docs/cscore/fixture-spec.md`、`docs/cscore/reference-sources.md`；私有输入仍保留现有研究目录。真正的应用测试 CSV 在 Stage 2 创建。

- [ ] 定义最小论文 CSV 和引用 CSV 的合成内容，覆盖英文/非英文姓名、翻译标题、零引用、空引用数、同名论文和多年度窗口；不把真实文件“改个名字”当匿名样例。
- [ ] 在 fixture spec 中逐例写明输入行、预期关联、六项指标、年份覆盖和错误状态，Stage 2 按此生成公共 CSV。
- [ ] 真实验证通过 `CSCORE_PRIVATE_FIXTURES` 指定外部目录；应用仓库忽略私有数据和生成报告，CI 不依赖个人机器文件。
- [ ] 公开参数、分类和作者数据各写来源、版本和许可。Science-Metrix 分类的具体许可变体在打包前核对，未核对前不复制进入公开分发。

**Gate:** 公共样例的输入行、预期结果和许可边界已明确，Stage 2 可据此创建独立运行的测试；真实导出不会随应用开源。此时尚未建立测试工程，不要求提前运行未来测试。

## Stage 1 基本单页前端

### Task 1.1 建立最小静态应用

**Files:** 创建 `cscore-web/package.json`、lockfile、`nuxt.config.ts`、`app/app.vue`、`app/pages/index.vue`、`app/assets/css/main.css`。

**Interfaces:** `/` 是唯一产品路由；页面先使用合成数据，不等待真实引擎完成。

- [ ] 按官方命令 `npm create nuxt@latest cscore-web` 初始化最小项目；采用 Nuxt 4 稳定版，核对 engines 后锁定依赖。只选择本项目需要的模板选项。
- [ ] 初始化完成后将 Stage 0 的数据契约与来源说明复制到应用 `docs/`，作为独立仓库的固定基线；后续以应用内版本为准，不维护两套持续变动的契约。
- [ ] 安装 Nuxt UI 与配套 Tailwind：`npm install @nuxt/ui tailwindcss`；根组件使用 `UApp`，样式引入官方入口。
- [ ] 为类型检查安装 `npm install -D typescript vue-tsc`；只保留 Nuxt UI 最小模块配置，不加入无需求的模板扩展。
- [ ] 配置静态生成。`npm run generate` 映射 `nuxt generate`，`npm run typecheck` 映射 `nuxt typecheck`；保留预生成页面正文，文件访问和图表在客户端生命周期内运行。
- [ ] 设置最小页面标题、描述、同页锚点。教程/隐私不另开页面，不添加无需求的导航体系。
- [ ] 在 `cscore-web/` 执行 `npm run typecheck`、`npm run generate`；预期类型检查通过，`.output/public/index.html` 含可读说明正文。

**Gate:** 静态文件可预览，不需要应用服务器或 API。

### Task 1.2 完成任务驱动的单页骨架

**Files:** 创建六个组件、`app/lib/messages.ts`；修改 `index.vue` 和样式入口。

- [ ] 按页面结构放置导入、核对、结果、比较、方法区域；首屏能看到本地导入入口与“如何导出”。
- [ ] 用合成演示数据实现四个可审查状态：空页、文件已识别、需要补导、结果完成。演示入口明确标记 synthetic example，不伪装为真实学者。
- [ ] Career 与 Single-year 两项摘要同时可见，详细内容使用现成 Tabs；切换不会离开页面或隐藏导入上下文。
- [ ] 仅使用现成组件和简单 HTML 布局；不要为状态提示另造状态组件库。
- [ ] 用浏览器人工检查 390、768、1440 CSS px 宽度与 200% 缩放；页面无整体横向溢出，表格仅在自身区域滚动。

**Gate:** 用户不读技术说明也能判断入口、当前状态和下一步。此阶段只验收结构，不为可逆的颜色/间距调整写镜像测试。

## Stage 2 数据与计算引擎

### Task 2.1 解析两种 Scopus 导出

**Files:** `contracts.ts`、`parse.ts`、`vitest.config.ts`、`package.json`、`tests/unit/parse.spec.ts`、公共 CSV fixtures 与其 `README.md`。

**Interfaces:** `parseScopusFile(file: File): Promise<ParsedFile>`；`ParsedFile` 在同一任务定义为论文文件或引用文件的判别联合，包含文件哈希、识别类型、原始元数据、warnings 和逐行来源。引用行保留标题/出版年/期刊/ISSN/卷期，逐年计数与 `<year`、`>year` 桶分开保存；缺失计数使用 `null`，不能使用零。

- [ ] 先运行 `npm install papaparse`、`npm install -D vitest @types/papaparse`，创建 Vitest 配置，将 `test:unit` 定义为 `vitest run tests/unit`。按 Stage 0 spec 生成公共 CSV，再增加解析用例。
- [ ] 使用 Papa Parse 处理 BOM、引号、分隔符和跨行字段；参考 Bibliometrix 的字段兼容经验，自行实现小型 Scopus 适配，不复制整个 R 分析体系。
- [ ] 通过内容定位 Citation overview 的年度表头与 `Publication Year` 行，不能固定跳过 N 行。识别 all-authors exclusion、selected-author exclusion 和未知设置；后两者不能冒充官方排自引口径。
- [ ] 作者 ID 按位置解析；姓名字段里的 HTML entity 分号不能误增作者人数。本人 ID 缺失、重复出现、ID 数与可靠作者人数矛盾时生成阻断问题。
- [ ] 支持同类型多个文件和任意文件名；识别重复文件哈希，拒绝未知格式并给出正确导出入口。
- [ ] 在实现前加入实际错误用例，再运行 `npm run test:unit -- tests/unit/parse.spec.ts`，确认未实现时失败、实现后通过。

**Gate:** 不依赖文件名或行号；空计数、零计数和表头摘要不混淆。

### Task 2.2 一对一关联与年度覆盖

**Files:** `match.ts`、`coverage.ts`、`tests/unit/match.spec.ts`、`tests/unit/coverage.spec.ts`。

**Interfaces:** `matchPapers(papers, overviews): MatchResult` 输出已关联行和待处理候选；`assessCoverage(matches, reference): CoverageResult` 按 scope/self-mode 返回 `ready`、`missing-years`、`missing-counts` 或 `needs-review`。修正决定以文件哈希＋原始行身份关联，源文件改变后重新验证。

- [ ] 标题 Unicode/HTML 解码及标点规范化后匹配出版年；多个候选再用 ISSN、原始期刊名、卷期消歧。翻译附标题和 `<` 截断使用研究验证过的受限规则，保留匹配依据。
- [ ] 不按行号拼接，不将相同标题当同一论文，不用模糊匹配或 LLM 静默选候选。未唯一匹配的行进入人工确认。
- [ ] 同一 EID 的重复论文不重复加分；跨文件相同年度计数相同可以合并，不同则要求用户选择来源/重新导出，不能求和或取最大值掩盖冲突。
- [ ] 逐年检查覆盖，重叠年份比对一致；不要把外侧年份桶与显式年份重复相加。
- [ ] 默认引导覆盖目标年末的 26 年窗口。以 2025 为例，2000–2025 的 `<2000` 桶全为零时不需补早期文件；如果非零且不能分离 1996 前引用，要求补 1996–2021 窗口，不凭最早出版年假定没有更早引用。
- [ ] 单年只取目标年；career 只计版本定义的起止年。对缺失年度或含空值的年度，返回不完整状态，不生成完整分数。
- [ ] 运行 `npm run test:unit -- tests/unit/match.spec.ts tests/unit/coverage.spec.ts`，验证含零引隐藏、缺窗口、翻译标题、同名同年论文、冲突计数及补导后恢复。

**Gate:** 真实样本全量关联；合成歧义样本必须停在 review，不能为了提高匹配率强行通过。

### Task 2.3 计算与交叉验证

**Files:** `metrics.ts`、`tests/unit/metrics.spec.ts`、`tests/private/python-parity.spec.ts`。

**Interfaces:** `calculateMetrics(papers, citations, authorIds): Metrics`；`normalizeScore(metrics, maxlog): { contributions: Metrics; cScore: number }`；按 scope/self-mode 组合产生 `CalculationResult`。所有函数不依赖 Vue、DOM 或网络。

```ts
import { expect, test } from 'vitest'
import { calculateMetrics, normalizeScore } from '../../app/lib/cscore/metrics'

test('single and first contributions are sets, and Hm is fractional', () => {
  const papers = [
    { eid: '2-s2.0-1', authorIds: ['self'], authorCount: 1 },
    { eid: '2-s2.0-2', authorIds: ['self', 'b'], authorCount: 2 },
    { eid: '2-s2.0-3', authorIds: ['a', 'b', 'c', 'self'], authorCount: 4 }
  ]
  const citations = new Map([['2-s2.0-1', 10], ['2-s2.0-2', 5], ['2-s2.0-3', 1]])
  expect(calculateMetrics(papers, citations, new Set(['self']))).toEqual({
    NC: 16, H: 2, Hm: 1.5, NCS: 10, NCSF: 15, NCSFL: 16
  })
})

test('zero indicators produce zero score', () => {
  const zero = { NC: 0, H: 0, Hm: 0, NCS: 0, NCSF: 0, NCSFL: 0 }
  const denominator = { NC: 1, H: 1, Hm: 1, NCS: 1, NCSF: 1, NCSFL: 1 }
  expect(normalizeScore(zero, denominator).cScore).toBe(0)
})
```

- [ ] 上述输入使用计算层所需的最小 paper 形状；在 contracts 中为计算输入定义 `MetricPaper = Pick<Paper, 'eid' | 'authorIds' | 'authorCount'>`，避免测试依赖无关字段。
- [ ] Hm 按引用数降序、EID 次序计算累计 `1/authorCount`；同引次数排序与公开方法一致，测试 numeric EID 与长字符串精度，不把 EID 转成可能丢精度的普通 Number。
- [ ] 单作者在 NCS、NCSF、NCSFL 中分别计一次，通讯作者不自动当作末位作者。
- [ ] `sum(Math.log1p(x) / maxlog)`；分母已是对数，不再次取 log。不把超过历史归一化范围的值裁剪回 1，也不强制 c-score ≤ 6。
- [ ] 空输入可以用于算法测试返回零，但没有有效个人论文的产品输入不得显示“完整个人评估”。
- [ ] 用官方汇总行反算四种分数，绝对误差 ≤ 1e-12；用同一私有逐篇输入与 Python 比对整数指标完全相同，Hm/分数误差 ≤ 1e-10。
- [ ] 将 `test:unit` 配置为 `vitest run tests/unit`，`test:private` 配置为 `vitest run tests/private`；执行对应命令并保留结果。

**Gate:** 一次产出 career/single-year；公式准确性与底层快照差异分别报告。

## Stage 3 用户动线与恢复

### Task 3.1 导入和补导助手

**Files:** `ImportPanel.vue`、`ExportGuide.vue`、`useAnalysis.ts`、`messages.ts`、`docs/journeys.md`。

**Interfaces:** 页面状态使用 `empty → inspecting → needs-input/needs-review → ready → calculated`；替换输入、年份、身份或人工关联时使受影响结果失效。切换比较领域不使计算结果失效。

- [ ] 默认提示三份文件：论文、含自引年度引用、排全部作者自引年度引用。用户可以分批拖入，无需一次备齐；同一年度矩阵服务 career 和 single-year。
- [ ] 每张文件条目显示识别类型、论文数、引用年份、自引设置、移除/替换。不能仅显示绿色勾号却不说明识别了什么。
- [ ] 自动提出本人 ID 候选，由用户确认；多 ID 只在用户确认属于同一人时合并，仍按 EID 去重，不远程修改 Scopus 档案。
- [ ] 动态显示缺失清单和具体补导窗口。普通完整输入三份；本次这类有早期引用的数据，两种自引口径最多五份。不要宣称所有未来版本/超大作者都固定只需五份，导出批次上限变化另提示分批。
- [ ] 两种自引口径分别显示完整性；已齐全口径可查看两种时间结果，未齐全口径禁用并说明所缺文件。下载“完整四模式报告”必须四模式均齐全。
- [ ] 无订阅用户可以加载合成演示、学习方法、使用自行合法取得的数据；明确当前没有免费替用户获取完整 Scopus 数据的功能，不给出无权限的下载承诺。

**Gate:** 无需用户改 CSV、改名、整理表格或理解 Hm 才能完成导入。

### Task 3.2 异常核对与结果失效

**Files:** `ReviewPanel.vue`、`useAnalysis.ts`、`playwright.config.ts`、`package.json`、`tests/e2e/import-recovery.spec.ts`。

- [ ] 只自动展开需要处理的论文；展示原始标题、年份、期刊、候选 EID、作者位置及引用来源，用户点击确认/更换。
- [ ] 缺作者人数、本人位置或某年引用数时，提供替换文件/重新导出的具体操作；不以估计 Hm 或比例推算排自引来补数据。
- [ ] 重复导入同文件不会增加论文或引用；移除一个来源后，保留未受影响文件，重新评估覆盖并清除失效结果。
- [ ] 比较领域变化只换 cohort；参考版本/引用年度变化则重新检查数据和重算两种时间结果。
- [ ] 错误在对应区域内解释，焦点移动到需要处理的位置；长操作用 `aria-live` 报告状态。拒绝格式错误后仍可立即选新文件。
- [ ] 先安装 `npm install -D @playwright/test @axe-core/playwright serve`，执行 `npx playwright install`，创建 Playwright 配置。将 `test:e2e` 定义为 `playwright test`，`preview:static` 定义为 `serve .output/public -l 4173`，配置 webServer 启动该静态预览。
- [ ] 先运行 `npm run generate` 生成当前静态站，再运行 `npm run test:e2e -- tests/e2e/import-recovery.spec.ts` 验证恢复路径，避免使用 Stage 1 的旧构建。

**Gate:** 用户犯错后可以在原页面继续，不丢掉全部已导入内容，不看到过期分数。

## Stage 4 官方对照与透明报告

### Task 4.1 静态参考数据与比较

**Files:** `scripts/build-reference.py`、`reference.ts`、`ComparisonPanel.vue`、`public/reference/v9/`、`tests/unit/reference.spec.ts`。

**Interfaces:** `loadReference(versionId): Promise<ReferenceVersion>`；`loadCohort(versionId, subfieldId, scope): Promise<Cohort>`。`Cohort` 包含完整公开入选记录、对应主 subfield、数据冻结时间、自引口径和覆盖说明，不能把采样子集称完整名单。

- [ ] 从官方作者表、阈值表和参数生成参考 manifest；离线核对行数、模式、分类名称、哈希和许可。构建命令固定为 `python3 scripts/build-reference.py --source-dir ../originDoc --parameters-dir ../docs/research/scopus-export-2026-10-29/reference --out-dir public/reference/v9`，脚本定义这些参数。
- [ ] Field → Subfield 选择对照人群。默认按官方主 subfield 取 cohort；显示全 field 汇总时明确与单个主 subfield 比较不同，不把第二领域混入同一个排名而不说明。
- [ ] 大文件按 subfield/scope 分片，初始仅加载参数、分类和 manifest，选择领域后才请求对应公开静态文件；不生成几十万作者页面。
- [ ] 图表阶段安装 `npm install echarts`，只导入使用到的图表模块；交互图表在客户端创建，销毁时释放实例。
- [ ] 雷达图画六项归一化贡献，配原始值表；可比较本人、明确选择的官方作者和“公开入选名单中位数”参考轮廓，后者不冒称真实作者。
- [ ] 分布图和邻近作者表明确是公开入选名单。官方阈值只显示其实际提供的分位区间；不插值为精确全球百分位，不拿名单最低分当 Top 2% 门槛。
- [ ] 参考分母、作者 cohort 和阈值版本必须一致；不一致时停止比较。超出历史参考范围不裁剪用户分数。
- [ ] 运行 `npm run test:unit -- tests/unit/reference.spec.ts`，验证切换领域不改变本人的四个 c-score，切换模式选用正确参数和 cohort。

**Gate:** 每一个比较标签都能说明“相对于哪些人、哪个年份、哪种自引口径”。

### Task 4.2 报告与逐篇解释

**Files:** `ResultsPanel.vue`、`report.ts`、`MethodNotes.vue`、`tests/unit/report.spec.ts`。

- [ ] 两项时间模式摘要同时呈现；各指标可展开贡献论文。初始不把全部逐篇数据铺满页面。
- [ ] 本地下载审计 JSON：工具版本、参考版本、目标年份、文件哈希、自引设置、覆盖窗口、人工关联决定、六项指标、六项贡献和总分。默认不含全部论文原文，用户主动选择时才包含详细本地记录。
- [ ] 同一导入区支持读取本工具审计 JSON：校验 schema/工具版本后只恢复设置和待验证决定；必须重选原 CSV 并核对哈希才能应用旧决定。缺原数据或哈希不同，不显示保存分数为当前有效结果。为此增加 `tests/unit/report-reuse.spec.ts`。
- [ ] 指标 CSV 保留精度及单位，处理公式注入字符；不将展示四舍五入的值用于再次计算。
- [ ] 使用浏览器打印提供可读报告，配 print CSS；首版不增加 PDF 生成服务或自造 PDF 排版引擎。
- [ ] 明确导出快照时间、官方冻结时间和当前计算来源；将摘要与逐篇合计差异写入审计项，不用差额强行校正论文。
- [ ] 报告生成后用 `npm run test:unit -- tests/unit/report.spec.ts tests/unit/report-reuse.spec.ts` 核对六项贡献之和等于报告总分、模式/版本没有串用，以及恢复决定必须验证原文件。

**Gate:** 分数可以被他人按输入和参数复核，导出过程不离开用户设备。

## Stage 5 测试与发布候选

### Task 5.1 核心测试矩阵

**Files:** `vitest.config.ts`、`playwright.config.ts`、`tests/unit/`、`tests/e2e/`、`docs/release-checklist.md`。

| 验证层 | 必须覆盖的情况 | 成功证据 |
|---|---|---|
| 数值单元测试 | 零引用、Hm 同引排序、合著人数、单/首/末集合、四套分母、超历史范围 | 精确人工小例子和参数反算通过 |
| 解析与关联 | BOM/引号/翻译标题/HTML entity、空引用、未知自引声明、同标题不同论文、重复导入 | 自动关联仅在唯一可证时发生 |
| 年份覆盖 | 1996 边界、26 年补窗、重叠冲突、零早期桶、隐藏零引、出版年与引用年区别 | 不缺年、不重复加、不用 Total 冒充目标窗口 |
| 关键 E2E | 三文件完成四模式；五文件补窗完成；仅一个自引口径；缺失→补导→重算 | 用户同页到达可复核结果 |
| 失效与恢复 | 替换文件、移除来源、换年份/身份、重选领域、错误文件后重试 | 不显示失效分数，领域不改分数 |
| 隐私 | 导入、核对、比较、下载、清空 | 用户内容不进入任何请求、URL、遥测或持久存储 |
| 可访问性 | 键盘流程、焦点恢复、读屏状态、图表数据表、缩放和窄屏 | axe 扫描＋人工键盘检查 |
| 性能 | 1,516 篇真实规模及合成 5,000 篇、长作者列表 | 可取消解析，长操作有反馈，无持续卡死 |
| 真实样本 | 已有 Ioannidis；未上榜作者；跨学科/多 ID；大规模合著 | 合法取得的本地输入逐项核对并记录差异 |

- [ ] E2E 每条旅程独立建立初态，不写相互依赖的串行步骤测试。优先按 role/label 定位，只有无法语义定位时加 test id。
- [ ] 使用 Chromium、Firefox、WebKit 跑关键桌面旅程；至少在 Chromium 跑 390 px 窄屏导入/查看/恢复。原生文件选择由测试框架注入 fixture，不伪装访问 Scopus。
- [ ] 隐私测试以合成唯一标记作为论文标题，监听请求方法、URL、查询、请求体及 beacon；只允许同源静态资源请求，不允许分析数据 POST、远端分析、错误上报或将私人信息带进公开数据请求。
- [ ] 额外断言 localStorage/IndexedDB 不保留导入数据，清空后页面没有本人记录。离线后已加载的样例计算和本地报告下载可用；不承诺首次离线打开或未下载 cohort 也可用。
- [ ] 性能在固定设备和数据规模记录；以本地准备完文件后 5 秒内得到结果为初始目标，超 1 秒显示进度。若实测出现持续长任务，再将计算迁入原生 Worker；不先构建通用任务队列。
- [ ] 至少覆盖上述额外三类作者；如果暂时没有合法真实输入，公开合成测试照常完成，但“广泛真实验证通过”这一发布条件保持未完成，不能用同一作者复制三份替代。

**Gate:** 公式、关联、四种结果、错误恢复、隐私和键盘旅程均通过；不只凭截图判断可用。

### Task 5.2 固定验证命令与实测记录

**Files:** `package.json`、`docs/release-checklist.md`。

```bash
# 在 cscore-web/ 内执行；脚本须在前述阶段建立。
npm ci
npm run typecheck
npm run test:unit
npm run test:private
npm run generate
npm run test:e2e
```

- [ ] `test:private` 在有 `CSCORE_PRIVATE_FIXTURES` 的本地环境运行；无私有文件的 CI 明确列为未运行，不将 skipped 计为通过。
- [ ] 复核 Stage 3 已建立的 Playwright 静态 webServer 配置，确认运行最新 `.output/public/`，不以 Nuxt dev server 通过代替静态发布验证。
- [ ] 为每项检查记录命令、运行环境、结果与失败项。测试应与实际用户结果有关，不为 CSS 取值或组件内部实现逐条写快照。
- [ ] 候选构建通过后，仅在有新增变更或失败时重跑相关检查；最终发布前再跑一遍完整必要检查。

**Gate:** 可复现地从干净安装得到已验证的静态构建。

## Stage 6 Tutorial 材料准备

### Task 6.1 整理已验证素材并写图文指南

**Files:** `docs/tutorial/asset-manifest.csv`、`docs/tutorial/export-guide.en.md`、`docs/tutorial/export-guide.zh.md`、`docs/tutorial/recording-checklist.md`；引用现有研究截图，不覆盖原图。

**Interfaces:** 素材清单包含 `asset_id, source_path, observed_date, screen_state, account_visible, intended_scene, reuse_status`。`reuse_status` 只取 `reference-only`、`approved-for-public-use`、`needs-recapture`。

- [ ] 盘点现有 16 张截图，逐项链接真实按钮与设置。含账户缩写/机构品牌的截图默认 reference-only，不直接发布。
- [ ] 图文主线使用三个文件同时支持四模式：作者页 Export all → CSV；保留 citation information＋ISSN；关闭 Excel 截断；进入 Citation overview；关闭隐藏零引；含自引导出；排全部作者自引导出；拖入本工具。
- [ ] 单独准备早期引用补导分支：解释 26 年 UI 自动调整、如何按工具提示补窗口，不教用户自己手工拼表。
- [ ] 明确 Authors 搜索结果的 Export CSV 与作者页论文 Export all 不同；排 selected-author 自引与排 all-authors 自引不同；年份指引用发生年。
- [ ] 加入三条恢复短说明：导错作者列表、文件缺年、论文匹配冲突。无订阅访问条件写在导出前，不演示绕过权限。
- [ ] 用合成数据制作网站公开样例和下载包；不能直接附真实研究 CSV。现有真实数据仅供本地验证和经确认的演示操作。
- [ ] 比较当前产品行为与旧 walkthrough：旧文中“一个论文 CSV 足够”的表述不能直接复制，改为有计数缺失需补引用文件；正式教程以新验证过的完整流程为准。

**Gate:** 阅读图文指南即可准备完整输入，且不需要 Excel 整理。

### Task 6.2 分镜、旁白、字幕稿与补录

**Files:** `docs/tutorial/storyboard.md`、`docs/tutorial/narration.en.txt`、`docs/tutorial/narration.zh.txt`、`docs/tutorial/captions-draft.csv`、`docs/tutorial/qa.md`。

- [ ] 准备 3 段可独立观看的教程：主流程约 3–4 分钟；早期窗口补导约 1–2 分钟；异常核对与结果解读约 1–2 分钟。时间为目标节奏，不编造精确画面时间码。
- [ ] 每场写清画面来源、实际操作、旁白、一行字幕、预期停留时间和完成状态；所有 Scopus 按钮来自已观察界面，所有网站画面来自阶段 5 的实际构建。
- [ ] 主流程从“这次要获得 career 和 single-year”直接进入操作，避免长片头；录到真实下载完成，再拖入文件，不能把截图动画冒充操作成功。
- [ ] 结果解读展示两种时间模式、两种自引口径、field/subfield 对照、六项贡献和快照差异；不把“分数接近官方”讲成已认证准确排名。
- [ ] 录制前使用专用演示环境并核查画面，不展开账户菜单、不暴露邮箱或其他个人页面。保留研究原图；如裁剪公开画面，记录裁剪范围，不能伪装为无订阅环境。
- [ ] 分镜和旁白稳定后再录制。最终 SRT 由录制/音轨实测对齐，字幕草稿不能直接假称同步完成。
- [ ] 教程 QA 按图文指南让另一位未参与开发者实际导出和导入；记录卡点、按钮变化、字幕可读性，再修订。

**Gate:** 本计划范围内的教程交付为可录制材料和清楚的补录清单；视频成片在执行此阶段时按另行确定的录制安排生成，不能把已有截图当成已完成视频。

## Stage 7 静态发布与开源交付

### Task 7.1 发布候选和交付清单

**Files:** `README.md`、`LICENSE`、`THIRD_PARTY_NOTICES.md`、`docs/release-checklist.md`、静态托管配置。

- [ ] README 写清本地运行、单页静态部署、支持输入、四种结果、参考版本、限制和验证命令。应用源码许可与数据许可分开。
- [ ] 检查构建不含私有 CSV、原始截图中的账户信息、绝对本机路径、token 或研究目录内容；官方参考分片只包含声明许可的公开材料。
- [ ] 自托管使用到的字体、图标和图表资源，移除无需求的远程字体/埋点请求。只在用户点击外部来源链接时离开工具。
- [ ] 用静态预览完成首次访问、刷新、同页锚点、导入、两时间模式、两自引口径、对比、报告下载和清空。
- [ ] 更新教程到实际候选构建版本，给出来源/方法/隐私同页入口；记录独立使用者完成率与问题清单，不为统计该指标默认增加在线追踪。
- [ ] 阶段结束产出可审查的 `.output/public/`、测试记录和开源材料。公开部署在目标平台和域名明确后执行；此计划本身不触发发布。

**Gate:** 所有首版要求完成，未解决项有明确影响和处理状态；不通过删掉 career、跳过异常或关闭测试来获得绿色检查。

## 关键用户旅程验收

| ID | 用户目标与条件 | 系统反馈与成功条件 | 恢复与测试 |
|---|---|---|---|
| J1 首次使用 | 有 Scopus 访问，第一次准备数据 | 同页教程说明 3 个基本文件，导入后一次得到 career/single-year 和两自引口径 | `tests/e2e/first-analysis.spec.ts` |
| J2 早期作者 | 早期桶非零且跨 1996 边界 | 明确缺哪些年份，补导后复用现有文件，四模式完整 | `tests/e2e/early-window.spec.ts` |
| J3 数据不完整 | 缺年度文件或选错自引设置 | 展示具体缺项，不伪造分数；替换文件后继续 | `tests/e2e/import-recovery.spec.ts` |
| J4 论文歧义 | 同标题同年或截断标题 | 显示候选与依据，确认后计算；换源后旧决定失效 | `tests/e2e/review-matches.spec.ts` |
| J5 学科探索 | 已完成计算，想换对比领域 | Field/Subfield 更换只改变官方对照，不改本人四个分数 | `tests/e2e/compare-subfield.spec.ts` |
| J6 返回使用 | 用户主动保存过本地审计记录 | 导入记录可恢复已有文件相同哈希的决定；没有原数据时明确要求重选文件，不假装保存过文件 | `tests/e2e/report-reuse.spec.ts` |
| J7 无 Scopus 权限 | 想了解计算方法 | 可以加载合成演示和同页教程，清楚知道真实输入如何取得及访问条件 | `tests/e2e/demo.spec.ts` |
| J8 隐私与清空 | 已导入私人数据 | 全程本地处理，下载报告后可清空；页面及存储不残留本人内容 | `tests/e2e/privacy.spec.ts` |

每条测试核对结果内容，不只核对按钮存在。人工使用测试只记录经允许的观察，不采集论文、作者 ID 或分数作为产品遥测。

## 执行与阶段完成规则

1. 本文所有 checkbox 都是**未来待执行任务**，未勾选不表示本次写计划失败；本次交付是完整可执行计划，不是产品完成声明。
2. 先做 Stage 0/1，尽早让单页骨架可审查；Stage 2 不能因前端好看而省略数据验证。
3. 每阶段在独立应用仓库中提交与该阶段相关文件；不要在当前非 Git 根目录执行 `git add .`，不要把私有输入一并提交。
4. 阶段 5 是产品稳定门槛，阶段 6 的正式产品画面以该门槛后的构建为准。
5. 执行报告区分：已实现、已测试、未测试、教程已准备、视频已录制、已发布。任何一种状态不能代替另一种。

## 参考轮子与方法来源

- [Nuxt 安装](https://nuxt.com/docs/4.x/getting-started/installation)、[静态部署](https://nuxt.com/docs/4.x/getting-started/deployment)。
- [Nuxt UI 安装](https://ui.nuxt.com/docs/getting-started/installation/nuxt)、[FileUpload](https://ui.nuxt.com/docs/components/file-upload)、[Table](https://ui.nuxt.com/docs/components/table)、[官方 MIT 仓库](https://github.com/nuxt/ui)。
- [Papa Parse 文档](https://www.papaparse.com/docs)、[Bibliometrix 的 Scopus 解析经验](https://github.com/massimoaria/bibliometrix/blob/master/R/csvScopus2df.R)。
- [Apache ECharts](https://echarts.apache.org/handbook/en/get-started/)、[Vitest](https://vitest.dev/guide/)、[Playwright](https://playwright.dev/docs/intro)、[axe-core](https://github.com/dequelabs/axe-core)。
- [官方 V9 数据集](https://elsevier.digitalcommonsdata.com/datasets/btchxktzyw/9)、[原始方法](https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.3000384)、[方法更新](https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.3000918)、[Science-Metrix 分类](https://www.science-metrix.com/classification/)。

## 计划自检

- [x] 单页、朴素布局、复用组件分别落实到 Global Constraints、Stage 1 和组件映射。
- [x] Career 与 single-year、两自引口径、普通和早期窗口落实到 Stage 2/3/5。
- [x] 用户动线、错误恢复、数据失效、无权限用户和本地报告恢复均映射到旅程与测试。
- [x] 公式、真实样本、浏览器、隐私、可访问性和静态构建分别具有验证门槛。
- [x] Tutorial 涵盖已有 16 张截图、待补录画面、图文、分镜、旁白、字幕草稿和 QA；未把素材准备冒称视频完成。
- [x] 计划不依赖当前目录存在 Git 或前端项目；路径和未来命令已注明执行位置。
